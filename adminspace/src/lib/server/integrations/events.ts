/**
 * Events of an organization sent to its notification endpoints (Slack, Discord, Teams, Zapier, n8n, webhooks).
 *
 *   await emitOrgEvent(tx, organizationId, "member.suspended", { person, by });
 *
 * - Call it inside the transaction of the change (outbox): the event and its deliveries exist if and only if the
 *   change is committed. Outside a transaction, pass db().
 * - One delivery row and one job ("integration.deliver") per enabled endpoint subscribed to the type; the job's
 *   idempotency key is the event id + the endpoint id. Nothing is stored when no endpoint listens.
 * - Payloads carry what a channel message needs (names, emails of the people concerned): retention deletes events
 *   and deliveries after 30 days.
 *
 * Desk events come from the Desk Manager (src/lib/server/services/desks.ts), which changes map-storage outside any
 * database transaction: it calls emitDeskEvent() after a successful change.
 */
import { and, arrayContains, eq } from "drizzle-orm";
import { db, schema, type Database } from "../db/client";
import { DEFAULT_LOCALE, format, isLocale, messagesFor, type Locale } from "../../i18n";
import { formatDateTime } from "../../i18n/format";
import { enqueueJob } from "../services/jobs";
import { describeError, logJson } from "../security/requestLog";

type Transaction = Parameters<Parameters<Database["transaction"]>[0]>[0];

/** The events endpoints can subscribe to, in the order the pages list them. */
export const ORG_EVENT_TYPES = [
    "member.invited",
    "member.joined",
    "member.suspended",
    "member.removed",
    "desk.assigned",
    "desk.released",
    "office.announcement",
] as const;
export type OrgEventType = (typeof ORG_EVENT_TYPES)[number];
/** "integration.test" is sent by "Send a test event" only; nobody subscribes to it. */
export type DeliverableEventType = OrgEventType | "integration.test";

export function isOrgEventType(value: unknown): value is OrgEventType {
    return typeof value === "string" && (ORG_EVENT_TYPES as readonly string[]).includes(value);
}

export interface EventPerson {
    /** Account id, member id or desk owner id, when known. */
    id?: string | null;
    name: string | null;
    email: string | null;
}
export interface EventActor {
    name: string;
    email?: string | null;
}
export interface EventWorld {
    id: string;
    slug: string;
    name: string;
}
export type DeskReleaseReason = "released" | "reassigned" | "suspended" | "removed" | "left" | "invitationRevoked";

/** The data of each event type, as sent in the `data` field of webhook payloads (docs/INTEGRATIONS.md). */
export interface OrgEventData {
    "member.invited": {
        invitation: { id: string; email: string; role: string; expiresAt: string };
        invitedBy: EventActor | null;
    };
    "member.joined": { person: EventPerson; world: EventWorld & { url: string | null } };
    "member.suspended": { person: EventPerson; by: EventActor | null };
    "member.removed": { person: EventPerson; by: EventActor | null; reason: "removed" | "left" };
    "desk.assigned": {
        desk: { id: string; name: string };
        room: { id: string; name: string };
        world: EventWorld;
        person: EventPerson;
        by: EventActor | null;
    };
    "desk.released": {
        desk: { id: string; name: string };
        room: { id: string; name: string };
        world: EventWorld;
        person: EventPerson | null;
        by: EventActor | null;
        reason: DeskReleaseReason;
    };
    "office.announcement": {
        message: string;
        world: EventWorld;
        rooms: number;
        by: EventActor | null;
        via: "backOffice" | "automation";
    };
    "integration.test": { message: string; by: EventActor | null };
}

export interface EmittedEvent {
    /** null when no endpoint listens to this type (nothing is stored then). */
    eventId: string | null;
    deliveries: number;
}

/** Stores the event and enqueues one delivery per subscribed, enabled endpoint, in the caller's transaction. */
export async function emitOrgEvent<T extends OrgEventType>(
    executor: Transaction | Database,
    organizationId: string,
    type: T,
    data: OrgEventData[T],
): Promise<EmittedEvent> {
    const E = schema.integrationEndpoints;
    const endpoints = await executor
        .select({ id: E.id })
        .from(E)
        .where(and(eq(E.organizationId, organizationId), eq(E.enabled, true), arrayContains(E.eventTypes, [type])));
    if (endpoints.length === 0) return { eventId: null, deliveries: 0 };
    return recordEvent(
        executor,
        organizationId,
        type,
        data,
        endpoints.map((e) => e.id),
    );
}

/** Stores an event with deliveries to the given endpoints and enqueues their jobs. */
export async function recordEvent<T extends DeliverableEventType>(
    executor: Transaction | Database,
    organizationId: string,
    type: T,
    data: OrgEventData[T],
    endpointIds: string[],
    options: { enqueue?: boolean } = {},
): Promise<EmittedEvent & { deliveryIds: string[] }> {
    const [event] = await executor
        .insert(schema.integrationEvents)
        .values({ organizationId, type, data: data as unknown as Record<string, unknown> })
        .returning({ id: schema.integrationEvents.id });
    if (!event) throw new Error("Event insert returned no row");
    const rows =
        endpointIds.length === 0
            ? []
            : await executor
                  .insert(schema.integrationDeliveries)
                  .values(endpointIds.map((endpointId) => ({ organizationId, eventId: event.id, endpointId })))
                  .onConflictDoNothing()
                  .returning({
                      id: schema.integrationDeliveries.id,
                      endpointId: schema.integrationDeliveries.endpointId,
                  });
    if (options.enqueue !== false) {
        for (const row of rows) {
            await enqueueJob(executor, {
                kind: "integration.deliver",
                organizationId,
                payload: { deliveryId: row.id },
                idempotencyKey: `integration.deliver:${event.id}:${row.endpointId}`,
                maxAttempts: 8,
            });
        }
    }
    return { eventId: event.id, deliveries: rows.length, deliveryIds: rows.map((r) => r.id) };
}

/**
 * For changes made outside a database transaction (the Desk Manager, the first visit recorded by the Admin API): emits
 * the event and never throws, so a notification problem cannot break the change itself. Failures are logged.
 */
export async function emitOrgEventSafely<T extends OrgEventType>(
    organizationId: string,
    type: T,
    data: OrgEventData[T],
): Promise<EmittedEvent> {
    try {
        return await emitOrgEvent(db(), organizationId, type, data);
    } catch (error) {
        logJson("error", "integration event not recorded", { type, organizationId, error: describeError(error) });
        return { eventId: null, deliveries: 0 };
    }
}

/**
 * The Desk Manager's helper: call after a desk was assigned or freed in map-storage.
 *
 *   await emitDeskEvent(organizationId, "desk.assigned", { desk, room, world, person, by });
 */
export function emitDeskEvent<T extends "desk.assigned" | "desk.released">(
    organizationId: string,
    type: T,
    data: OrgEventData[T],
): Promise<EmittedEvent> {
    return emitOrgEventSafely(organizationId, type, data);
}

// ---------------------------------------------------------------------------------------------
// Human-readable form (chat destinations), in the organization's language
// ---------------------------------------------------------------------------------------------

export type MessageTone = "info" | "success" | "warning" | "danger";

/** What chat destinations show: built here once, formatted per destination by formatters.ts. */
export interface NotificationMessage {
    title: string;
    text: string;
    facts: { label: string; value: string }[];
    /** Organization name and the time, shown small. */
    context: string;
    occurredAt: string;
    tone: MessageTone;
}

/** i18n key of an event type ("member.invited" → "member_invited"). */
export function eventKey(type: DeliverableEventType) {
    return type.replace(".", "_") as
        | "member_invited"
        | "member_joined"
        | "member_suspended"
        | "member_removed"
        | "desk_assigned"
        | "desk_released"
        | "office_announcement"
        | "integration_test";
}

function personName(person: EventPerson | null | undefined, fallback: string): string {
    return person?.name || person?.email || fallback;
}

/** The event as people read it in a channel, in the organization's default language. */
export function describeEvent(
    event: { type: DeliverableEventType; data: Record<string, unknown>; occurredAt: Date },
    organization: { name: string; defaultLocale: string },
): NotificationMessage {
    const locale: Locale = isLocale(organization.defaultLocale) ? organization.defaultLocale : DEFAULT_LOCALE;
    const messages = messagesFor(locale);
    const m = messages.integrationCenter.notify;
    const t = m.events[eventKey(event.type)];
    const someone = m.someone;
    const facts: { label: string; value: string }[] = [];
    const fact = (label: string, value: string | null | undefined) => {
        if (value) facts.push({ label, value: value.slice(0, 1000) });
    };
    const params: Record<string, string> = { organization: organization.name };
    let text = t.text;
    let tone: MessageTone = "info";

    switch (event.type) {
        case "member.invited": {
            const data = event.data as unknown as OrgEventData["member.invited"];
            const label = (messages.shell.roles as Record<string, unknown>)[data.invitation.role];
            const role = typeof label === "string" ? label : data.invitation.role;
            Object.assign(params, {
                email: data.invitation.email,
                role,
                inviter: data.invitedBy?.name ?? someone,
            });
            fact(m.facts.email, data.invitation.email);
            fact(m.facts.role, role);
            fact(m.facts.expires, formatDateTime(data.invitation.expiresAt, { locale, timeZone: "UTC" }));
            break;
        }
        case "member.joined": {
            const data = event.data as unknown as OrgEventData["member.joined"];
            Object.assign(params, { name: personName(data.person, someone), world: data.world.name });
            fact(m.facts.world, data.world.name);
            fact(m.facts.link, data.world.url);
            tone = "success";
            break;
        }
        case "member.suspended": {
            const data = event.data as unknown as OrgEventData["member.suspended"];
            Object.assign(params, { name: personName(data.person, someone), by: data.by?.name ?? someone });
            fact(m.facts.email, data.person.email);
            tone = "warning";
            break;
        }
        case "member.removed": {
            const data = event.data as unknown as OrgEventData["member.removed"];
            Object.assign(params, { name: personName(data.person, someone), by: data.by?.name ?? someone });
            if (data.reason === "left") text = m.events.member_removed.textLeft;
            fact(m.facts.email, data.person.email);
            tone = "warning";
            break;
        }
        case "desk.assigned":
        case "desk.released": {
            const data = event.data as unknown as OrgEventData["desk.assigned"] | OrgEventData["desk.released"];
            Object.assign(params, {
                desk: data.desk.name,
                room: data.room.name,
                name: personName(data.person, someone),
                by: data.by?.name ?? someone,
            });
            fact(m.facts.world, data.world.name);
            fact(m.facts.room, data.room.name);
            fact(m.facts.person, data.person ? personName(data.person, someone) : null);
            tone = event.type === "desk.assigned" ? "success" : "info";
            break;
        }
        case "office.announcement": {
            const data = event.data as unknown as OrgEventData["office.announcement"];
            Object.assign(params, { world: data.world.name, message: data.message, by: data.by?.name ?? someone });
            fact(m.facts.by, data.by?.name);
            break;
        }
        case "integration.test": {
            const data = event.data as unknown as OrgEventData["integration.test"];
            fact(m.facts.by, data.by?.name);
            tone = "success";
            break;
        }
    }
    const occurredAt = event.occurredAt.toISOString();
    return {
        title: format(t.title, params, locale),
        text: format(text, params, locale),
        facts,
        context: format(
            m.context,
            { organization: organization.name, time: formatDateTime(occurredAt, { locale, timeZone: "UTC" }) },
            locale,
        ),
        occurredAt,
        tone,
    };
}
