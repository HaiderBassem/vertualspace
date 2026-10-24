import { eq } from "drizzle-orm";
import { db, schema } from "../db/client";
import { config } from "../config";
import { InstanceSettings, readInstanceSettings } from "../../settings/instanceSettings";

const CACHE_MS = 10_000;
let cache: { value: InstanceSettings; at: number } | undefined;

function environmentDefaults(): InstanceSettings {
    const env = config();
    return {
        playUrl: env.WORKADVENTURE_PLAY_URL,
        pusherInternalUrl: env.WORKADVENTURE_PUSHER_INTERNAL_URL,
        mapStoragePublicUrl: env.WORKADVENTURE_MAP_STORAGE_PUBLIC_URL,
        mapStorageInternalUrl: env.WORKADVENTURE_MAP_STORAGE_INTERNAL_URL,
        mapStorageApiToken: env.WORKADVENTURE_MAP_STORAGE_API_TOKEN,
        mapStorageWebhookToken: env.WORKADVENTURE_MAP_STORAGE_WEBHOOK_TOKEN,
        startRoomUrl: env.WORKADVENTURE_START_ROOM_URL,
    };
}

/** Instance settings: values saved in the back office, falling back to environment defaults. */
export async function getInstanceSettings(): Promise<InstanceSettings> {
    if (cache && Date.now() - cache.at < CACHE_MS) return cache.value;
    const row = await db().query.instanceSettings.findFirst({ where: eq(schema.instanceSettings.id, 1) });
    const saved = readInstanceSettings(row?.settings);
    const merged: Record<string, unknown> = { ...environmentDefaults() };
    for (const [key, value] of Object.entries(saved)) {
        if (value !== undefined && value !== "") {
            merged[key] = value;
        }
    }
    const value = merged as InstanceSettings;
    cache = { value, at: Date.now() };
    return value;
}

export async function saveInstanceSettings(settings: InstanceSettings): Promise<void> {
    const value = InstanceSettings.parse(settings);
    await db()
        .insert(schema.instanceSettings)
        .values({ id: 1, settings: value })
        .onConflictDoUpdate({ target: schema.instanceSettings.id, set: { settings: value } });
    cache = undefined;
}

/** Base URL for the pusher's admin endpoints (/rooms, /message, /room/refresh, /ws/admin/rooms). */
export async function pusherBaseUrl(): Promise<string | undefined> {
    const { pusherInternalUrl, playUrl } = await getInstanceSettings();
    return (pusherInternalUrl ?? playUrl)?.replace(/\/+$/, "");
}
