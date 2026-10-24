/** World administration: creation, general fields, settings sections, archiving and deletion. */
import { eq } from "drizzle-orm";
import { db, schema } from "../db/client";
import { readWorldSettings, WorldSettings } from "../../settings/worldSettings";
import { isUniqueViolation } from "../db/errors";
import type { World } from "./worlds";

export type AccessPolicy = (typeof schema.worldAccessPolicy.enumValues)[number];
export type MapKind = (typeof schema.mapKind.enumValues)[number];

/** Slugs that would collide with back-office routes under /o/{org}/w/. */
export const RESERVED_WORLD_SLUGS = new Set(["new"]);

export interface CreateWorldInput {
    organizationId: string;
    /** Workspace of the same organization (the composite foreign key refuses any other). */
    workspaceId: string;
    name: string;
    slug: string;
    description: string | null;
    accessPolicy: AccessPolicy;
    firstRoom?: { name: string; slug: string; mapKind: MapKind; url: string } | undefined;
}

export async function createWorld(input: CreateWorldInput): Promise<World | "slugTaken"> {
    if (RESERVED_WORLD_SLUGS.has(input.slug)) return "slugTaken";
    try {
        return await db().transaction(async (tx) => {
            const [world] = await tx
                .insert(schema.worlds)
                .values({
                    organizationId: input.organizationId,
                    workspaceId: input.workspaceId,
                    name: input.name,
                    slug: input.slug,
                    description: input.description,
                    accessPolicy: input.accessPolicy,
                })
                .returning();
            if (!world) throw new Error("World creation returned no row");
            if (input.firstRoom) {
                const room = input.firstRoom;
                await tx.insert(schema.rooms).values({
                    worldId: world.id,
                    name: room.name,
                    slug: room.slug,
                    isDefault: true,
                    mapKind: room.mapKind,
                    wamUrl: room.mapKind === "wam" ? room.url : null,
                    mapUrl: room.mapKind === "tmj" ? room.url : null,
                });
            }
            return world;
        });
    } catch (error) {
        if (isUniqueViolation(error)) return "slugTaken";
        throw error;
    }
}

export interface WorldGeneralInput {
    name: string;
    description: string | null;
    accessPolicy: AccessPolicy;
    maxUsers: number;
    expiresAt: Date | null;
}

export async function updateWorldGeneral(worldId: string, input: WorldGeneralInput): Promise<void> {
    await db().update(schema.worlds).set(input).where(eq(schema.worlds.id, worldId));
}

export async function setWorldArchived(worldId: string, archived: boolean): Promise<void> {
    await db()
        .update(schema.worlds)
        .set({ archivedAt: archived ? new Date() : null })
        .where(eq(schema.worlds.id, worldId));
}

export async function deleteWorld(worldId: string): Promise<void> {
    await db().delete(schema.worlds).where(eq(schema.worlds.id, worldId));
}

/** Replaces some top-level keys of the world settings, validating the whole result. */
export async function saveWorldSettings(world: World, patch: Partial<WorldSettings>): Promise<WorldSettings> {
    const merged: Record<string, unknown> = { ...readWorldSettings(world.settings) };
    for (const [key, value] of Object.entries(patch)) {
        if (value === undefined) delete merged[key];
        else merged[key] = value;
    }
    const settings = WorldSettings.parse(merged);
    await db().update(schema.worlds).set({ settings }).where(eq(schema.worlds.id, world.id));
    return settings;
}

// ---------------------------------------------------------------------------------------------
// Local date-times (HTML datetime-local, "YYYY-MM-DDTHH:mm") in an IANA time zone <-> UTC instants
// ---------------------------------------------------------------------------------------------

function zoneOffsetMs(instant: number, timeZone: string): number {
    const parts = new Intl.DateTimeFormat("en-US", {
        timeZone,
        hourCycle: "h23",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
    }).formatToParts(new Date(instant));
    const get = (type: string) => Number(parts.find((p) => p.type === type)?.value ?? 0);
    const asUtc = Date.UTC(get("year"), get("month") - 1, get("day"), get("hour"), get("minute"), get("second"));
    return asUtc - Math.floor(instant / 1000) * 1000;
}

/** "2026-10-22T09:15" in `timeZone` -> UTC Date. Returns undefined for a malformed value. */
export function localDateTimeToUtc(value: string, timeZone: string): Date | undefined {
    const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(value);
    if (!match) return undefined;
    const [, y, mo, d, h, mi] = match.map(Number) as [number, number, number, number, number, number];
    const wallClock = Date.UTC(y, mo - 1, d, h, mi);
    // Two passes handle daylight-saving transitions.
    let instant = wallClock - zoneOffsetMs(wallClock, timeZone);
    instant = wallClock - zoneOffsetMs(instant, timeZone);
    const date = new Date(instant);
    return Number.isNaN(date.getTime()) ? undefined : date;
}

/** UTC Date -> "2026-10-22T09:15" in `timeZone`, for a datetime-local input. */
export function utcToLocalDateTime(date: Date, timeZone: string): string {
    const local = new Date(date.getTime() + zoneOffsetMs(date.getTime(), timeZone));
    return local.toISOString().slice(0, 16);
}

export function isValidTimeZone(timeZone: string | undefined): timeZone is string {
    if (!timeZone) return false;
    try {
        new Intl.DateTimeFormat("en-US", { timeZone });
        return true;
    } catch {
        return false;
    }
}
