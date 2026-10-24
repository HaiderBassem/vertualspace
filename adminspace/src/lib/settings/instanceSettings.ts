/**
 * Instance-wide settings, editable by superadmins in the back office (stored in instance_settings).
 * Secrets shared with WorkAdventure (ADMIN_API_TOKEN, ADMIN_SOCKETS_TOKEN) are NOT stored here:
 * they come from the environment, see src/lib/server/config.ts. The secrets that are stored here
 * (mapStorageApiToken, mapStorageWebhookToken, livekitApiSecret) are sealed at rest (services/secrets.ts).
 */
import { z } from "zod";
import { IceServer } from "../contract/adminApi";

function isHttpUrl(value: string): boolean {
    try {
        const protocol = new URL(value).protocol;
        return protocol === "http:" || protocol === "https:";
    } catch {
        return false;
    }
}

const url = z.string().trim().max(2048).url().refine(isHttpUrl);
const optionalUrl = url.optional().or(z.literal("").transform(() => undefined));
const days = (max: number) => z.number().int().min(1).max(max).optional();

/** Default retention periods (days), applied when an instance does not choose. */
export const RETENTION_DEFAULTS = {
    /** Audit trail: 2 years, a common period for security logs. */
    auditLogRetentionDays: 730,
    /** Revoked or expired bans. Active bans are never deleted by retention. */
    inactiveBanRetentionDays: 365,
    /** Resolved or dismissed reports. Open reports are never deleted by retention. */
    closedReportRetentionDays: 365,
    /** Recording lifecycle events (13 months). */
    recordingEventRetentionDays: 395,
} as const;

export const InstanceSettings = z.object({
    /** Public URL of WorkAdventure's play service, e.g. https://play.example.com */
    playUrl: optionalUrl,
    /**
     * URL this admin uses to reach the pusher's admin endpoints (/rooms, /message, /room/refresh)
     * and its admin websocket. Often an internal URL such as http://play:3000. Defaults to playUrl.
     */
    pusherInternalUrl: optionalUrl,
    /** Where "/" (no room in the URL) is redirected to. WorkAdventure's START_ROOM_URL. */
    startRoomUrl: z.string().max(2048).optional(),
    /** Map-storage, used to list maps (/maps) and to build WAM URLs. */
    mapStoragePublicUrl: optionalUrl,
    mapStorageInternalUrl: optionalUrl,
    /** Sealed secret (or a legacy plain value). */
    mapStorageApiToken: z.string().max(4000).optional(),
    /**
     * Token map-storage sends to AdminSpace's webhook (/hooks/map-storage, map-storage's WEB_HOOK_API_TOKEN).
     * Sealed secret (or a plain value from the environment). Without it the webhook refuses every call.
     */
    mapStorageWebhookToken: z.string().max(4000).optional(),
    /** Instance defaults, overridden per world (worlds.settings.thirdParty) as a whole. */
    livekitHost: optionalUrl,
    livekitApiKey: z.string().max(200).optional(),
    /** Sealed secret (or a legacy plain value). */
    livekitApiSecret: z.string().max(4000).optional(),
    iceServers: z.array(IceServer).max(20).optional(),
    /**
     * Emails or user UUIDs allowed to use the map editor in rooms that belong to no world
     * (/~/ map-storage URLs). Nobody by default.
     */
    globalMapEditors: z.array(z.string().max(320)).max(500).optional(),
    /** Whether a person may create an organization by themselves (else superadmins only). */
    selfServiceOrganizations: z.boolean().optional(),
    /**
     * Public registration (/register): "closed" (default) or "open". When open, a new person creates an
     * account and an organization they own.
     */
    registration: z.enum(["closed", "open"]).optional(),
    /**
     * Registration must be confirmed through a link sent by email (default true). Turning it off is only
     * for internal deployments without email: it lets anyone claim any address and reveals which
     * addresses already have an account.
     */
    registrationEmailVerification: z.boolean().optional(),
    /** Retention periods in days (see RETENTION_DEFAULTS). */
    auditLogRetentionDays: days(3650),
    inactiveBanRetentionDays: days(3650),
    closedReportRetentionDays: days(3650),
    recordingEventRetentionDays: days(3650),
});
export type InstanceSettings = z.infer<typeof InstanceSettings>;

/** Parses stored settings field by field, dropping only invalid values. */
export function readInstanceSettings(raw: unknown): InstanceSettings {
    if (typeof raw !== "object" || raw === null || Array.isArray(raw)) return {};
    const source = raw as Record<string, unknown>;
    const settings: Record<string, unknown> = {};
    for (const [key, schema] of Object.entries(InstanceSettings.shape as Record<string, z.ZodTypeAny>)) {
        if (!(key in source)) continue;
        const parsed = schema.safeParse(source[key]);
        if (parsed.success && parsed.data !== undefined) settings[key] = parsed.data;
    }
    return settings as InstanceSettings;
}

/** Effective retention periods: saved values, or the defaults. */
export function retentionPolicy(
    settings: InstanceSettings,
): Required<
    Pick<
        InstanceSettings,
        | "auditLogRetentionDays"
        | "inactiveBanRetentionDays"
        | "closedReportRetentionDays"
        | "recordingEventRetentionDays"
    >
> {
    return {
        auditLogRetentionDays: settings.auditLogRetentionDays ?? RETENTION_DEFAULTS.auditLogRetentionDays,
        inactiveBanRetentionDays: settings.inactiveBanRetentionDays ?? RETENTION_DEFAULTS.inactiveBanRetentionDays,
        closedReportRetentionDays: settings.closedReportRetentionDays ?? RETENTION_DEFAULTS.closedReportRetentionDays,
        recordingEventRetentionDays:
            settings.recordingEventRetentionDays ?? RETENTION_DEFAULTS.recordingEventRetentionDays,
    };
}
