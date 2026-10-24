import { fail } from "@sveltejs/kit";
import { eq } from "drizzle-orm";
import { z } from "zod";
import type { Actions, PageServerLoad } from "./$types";
import { IceServer } from "$lib/contract/adminApi";
import { audit } from "$lib/server/audit";
import { requireSuperadmin } from "$lib/server/auth/rbac";
import type { Account } from "$lib/server/auth/session";
import { requireAccount } from "$lib/server/context";
import { db, schema } from "$lib/server/db/client";
import { config } from "$lib/server/config";
import { checkbox, formValues, list, optionalText, optionalUrl, parseForm } from "$lib/server/http/forms";
import { getInstanceSettings, saveInstanceSettings } from "$lib/server/services/instance";
import { ensureSealed, sealSecret } from "$lib/server/services/secrets";
import { mailConfigured } from "$lib/server/services/mail";
import { registrationAvailability } from "$lib/server/services/registration";
import {
    readInstanceSettings,
    retentionPolicy,
    RETENTION_DEFAULTS,
    type InstanceSettings,
} from "$lib/settings/instanceSettings";

function superadmin(locals: App.Locals): Account {
    const account = requireAccount(locals);
    requireSuperadmin(account);
    return account;
}

/** Settings saved in the back office (without the environment defaults). */
async function savedSettings(): Promise<InstanceSettings> {
    const row = await db().query.instanceSettings.findFirst({ where: eq(schema.instanceSettings.id, 1) });
    return readInstanceSettings(row?.settings);
}

export const load: PageServerLoad = async ({ locals, url }) => {
    superadmin(locals);
    const [saved, effective] = await Promise.all([savedSettings(), getInstanceSettings()]);
    return {
        values: {
            playUrl: saved.playUrl ?? "",
            pusherInternalUrl: saved.pusherInternalUrl ?? "",
            startRoomUrl: saved.startRoomUrl ?? "",
            mapStoragePublicUrl: saved.mapStoragePublicUrl ?? "",
            mapStorageInternalUrl: saved.mapStorageInternalUrl ?? "",
            livekitHost: saved.livekitHost ?? "",
            livekitApiKey: saved.livekitApiKey ?? "",
            iceServers: saved.iceServers?.length ? JSON.stringify(saved.iceServers, null, 2) : "",
            globalMapEditors: (saved.globalMapEditors ?? []).join("\n"),
            selfServiceOrganizations: saved.selfServiceOrganizations ?? false,
            registration: saved.registration ?? "closed",
            registrationEmailVerification: saved.registrationEmailVerification ?? true,
            auditLogRetentionDays: saved.auditLogRetentionDays?.toString() ?? "",
            inactiveBanRetentionDays: saved.inactiveBanRetentionDays?.toString() ?? "",
            closedReportRetentionDays: saved.closedReportRetentionDays?.toString() ?? "",
            recordingEventRetentionDays: saved.recordingEventRetentionDays?.toString() ?? "",
        },
        retention: { effective: retentionPolicy(saved), defaults: RETENTION_DEFAULTS },
        registrationAvailability: await registrationAvailability(),
        mailConfigured: mailConfigured(),
        // Values in effect (environment defaults included), shown as placeholders.
        effective: {
            playUrl: effective.playUrl ?? "",
            pusherInternalUrl: effective.pusherInternalUrl ?? "",
            startRoomUrl: effective.startRoomUrl ?? "",
            mapStoragePublicUrl: effective.mapStoragePublicUrl ?? "",
            mapStorageInternalUrl: effective.mapStorageInternalUrl ?? "",
        },
        // Secrets never leave the server: only whether one is saved.
        secrets: {
            mapStorageApiToken: Boolean(saved.mapStorageApiToken),
            mapStorageWebhookToken: Boolean(saved.mapStorageWebhookToken),
            livekitApiSecret: Boolean(saved.livekitApiSecret),
        },
        /** Set from the environment (WORKADVENTURE_MAP_STORAGE_WEBHOOK_TOKEN) rather than here. */
        webhookTokenFromEnvironment: !saved.mapStorageWebhookToken && Boolean(effective.mapStorageWebhookToken),
        /** What to set as map-storage's WEB_HOOK_URL. */
        webhookUrl: `${config().ORIGIN ? new URL(config().ORIGIN!).origin : url.origin}/hooks/map-storage`,
    };
};

/** A number of days between 1 and 3650; empty means "default". */
const retentionDays = z
    .string()
    .trim()
    .optional()
    .transform((v) => (v ? Number(v) : undefined))
    .pipe(z.number().int().min(1).max(3650).optional());

const SettingsForm = z.object({
    playUrl: optionalUrl,
    pusherInternalUrl: optionalUrl,
    startRoomUrl: optionalText(2048),
    mapStoragePublicUrl: optionalUrl,
    mapStorageInternalUrl: optionalUrl,
    mapStorageApiToken: optionalText(500),
    clear_mapStorageApiToken: checkbox,
    mapStorageWebhookToken: optionalText(500),
    clear_mapStorageWebhookToken: checkbox,
    livekitHost: optionalUrl,
    livekitApiKey: optionalText(200),
    livekitApiSecret: optionalText(500),
    clear_livekitApiSecret: checkbox,
    iceServers: optionalText(20_000),
    globalMapEditors: list,
    selfServiceOrganizations: checkbox,
    registration: z.enum(["closed", "open"]).default("closed"),
    registrationEmailVerification: checkbox,
    auditLogRetentionDays: retentionDays,
    inactiveBanRetentionDays: retentionDays,
    closedReportRetentionDays: retentionDays,
    recordingEventRetentionDays: retentionDays,
});

/** A blank secret field keeps the saved value; the "remove" checkbox clears it. Stored sealed. */
function secret(input: string | undefined, clear: boolean, saved: string | undefined): string | undefined {
    if (clear) return undefined;
    return input ? sealSecret(input) : ensureSealed(saved);
}

export const actions: Actions = {
    default: async ({ request, locals }) => {
        const account = superadmin(locals);
        const formData = await request.formData();
        const parsed = parseForm(formData, SettingsForm);
        if (!parsed.ok) return parsed.failure;
        const input = parsed.data;

        let iceServers: InstanceSettings["iceServers"];
        if (input.iceServers) {
            let raw: unknown;
            try {
                raw = JSON.parse(input.iceServers);
            } catch {
                raw = undefined;
            }
            const checked = IceServer.array().safeParse(raw);
            if (!checked.success) {
                return fail(400, { iceServersInvalid: true, values: formValues(formData), errors: {} });
            }
            iceServers = checked.data;
        }

        const saved = await savedSettings();
        const settings: InstanceSettings = {
            playUrl: input.playUrl,
            pusherInternalUrl: input.pusherInternalUrl,
            startRoomUrl: input.startRoomUrl,
            mapStoragePublicUrl: input.mapStoragePublicUrl,
            mapStorageInternalUrl: input.mapStorageInternalUrl,
            mapStorageApiToken: secret(
                input.mapStorageApiToken,
                input.clear_mapStorageApiToken,
                saved.mapStorageApiToken,
            ),
            mapStorageWebhookToken: secret(
                input.mapStorageWebhookToken,
                input.clear_mapStorageWebhookToken,
                saved.mapStorageWebhookToken,
            ),
            livekitHost: input.livekitHost,
            livekitApiKey: input.livekitApiKey,
            livekitApiSecret: secret(input.livekitApiSecret, input.clear_livekitApiSecret, saved.livekitApiSecret),
            iceServers,
            globalMapEditors: input.globalMapEditors.length > 0 ? input.globalMapEditors : undefined,
            selfServiceOrganizations: input.selfServiceOrganizations,
            registration: input.registration,
            registrationEmailVerification: input.registrationEmailVerification,
            auditLogRetentionDays: input.auditLogRetentionDays,
            inactiveBanRetentionDays: input.inactiveBanRetentionDays,
            closedReportRetentionDays: input.closedReportRetentionDays,
            recordingEventRetentionDays: input.recordingEventRetentionDays,
        };
        await saveInstanceSettings(settings);
        await audit({
            action: "instance.settings.update",
            account,
            targetType: "instance",
            ipAddress: locals.clientIp ?? null,
            // Secret values are never logged: only the names of the changed fields.
            details: {
                changed: Object.keys(settings).filter(
                    (key) =>
                        JSON.stringify(settings[key as keyof InstanceSettings]) !==
                        JSON.stringify(saved[key as keyof InstanceSettings]),
                ),
            },
        });
        return { success: true };
    },
};
