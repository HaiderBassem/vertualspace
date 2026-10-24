/**
 * Presence activity for WorkAdventure (GET /api/presence/activity): what a person chose to show in the office.
 *
 * - music: what Spotify is playing, only when the person enabled "share what I listen to" (cached 30 seconds);
 * - coding: their latest GitHub or GitLab activity (push, pull/merge request) of the last two hours, only when they
 *   enabled "share my coding activity". It comes from verified organization webhooks (inbound.ts) or from polling the
 *   provider, at most as often as the provider allows (GitHub's X-Poll-Interval, ETag).
 *
 * Nothing is answered for people who did not opt in, and each source has a short deadline so that a slow provider
 * never delays WorkAdventure.
 */
import { and, eq, inArray } from "drizzle-orm";
import { db, schema } from "../db/client";
import {
    readIntegrationActivity,
    readIntegrationSettings,
    type IntegrationActivity,
} from "../../settings/integrationSettings";
import { markFailure, touchConnection, withAccessToken, type Connection } from "./connections";
import { resolvePeople } from "./people";
import { pollGithubActivity } from "./providers/github";
import { pollGitlabActivity } from "./providers/gitlab";
import { spotifyNowPlaying, type NowPlaying } from "./providers/spotify";

export const CODING_RECENT_MS = 2 * 3_600_000;
const MUSIC_CACHE_MS = 30_000;
const GITLAB_POLL_MS = 120_000;
const SOURCE_DEADLINE_MS = 4_000;

export interface PresenceAnswer {
    music: NowPlaying | null;
    coding: { provider: "github" | "gitlab"; repo: string; at: string } | null;
}

const musicCache = new Map<string, { at: number; value: NowPlaying | null }>();

/** Tests only. */
export function clearPresenceCache(): void {
    musicCache.clear();
}

function withDeadline<T>(promise: Promise<T>, fallback: T): Promise<T> {
    let timer: NodeJS.Timeout | undefined;
    return Promise.race([
        promise.catch(() => fallback),
        new Promise<T>((resolve) => {
            timer = setTimeout(() => resolve(fallback), SOURCE_DEADLINE_MS);
        }),
    ]).finally(() => clearTimeout(timer));
}

async function music(connection: Connection, now: number): Promise<NowPlaying | null> {
    const cached = musicCache.get(connection.id);
    if (cached && now - cached.at < MUSIC_CACHE_MS) return cached.value;
    try {
        const value = await withAccessToken(connection, (token) => spotifyNowPlaying(token));
        musicCache.set(connection.id, { at: now, value });
        return value;
    } catch (error) {
        await markFailure(connection.id, error);
        return null;
    }
}

/** Polls the provider when the stored activity may be stale and the provider allows it; returns the activity. */
export async function refreshCoding(connection: Connection, now = new Date()): Promise<IntegrationActivity | null> {
    const stored = readIntegrationActivity(connection.activity);
    const settings = readIntegrationSettings(connection.settings);
    try {
        if (connection.provider === "github") {
            if (settings.pollAfter && new Date(settings.pollAfter) > now) return stored;
            const poll = await withAccessToken(connection, (token, current) =>
                pollGithubActivity(token, current.externalAccountName ?? "", settings.eventsEtag, now),
            );
            const activity: IntegrationActivity | null =
                poll.latest && (!stored || poll.latest.at > stored.at)
                    ? { provider: "github", repo: poll.latest.repo, at: poll.latest.at }
                    : stored;
            await db()
                .update(schema.integrationConnections)
                .set({
                    activity,
                    lastSyncAt: now,
                    lastError: null,
                    settings: {
                        ...settings,
                        pollAfter: poll.pollAfter.toISOString(),
                        ...(poll.etag ? { eventsEtag: poll.etag } : {}),
                    },
                })
                .where(eq(schema.integrationConnections.id, connection.id));
            return activity;
        }
        if (connection.lastSyncAt && now.getTime() - connection.lastSyncAt.getTime() < GITLAB_POLL_MS) return stored;
        const latest = await withAccessToken(connection, (token) => pollGitlabActivity(token, now));
        // Polled GitLab events do not name the project: keep the repository a verified webhook gave for the same push.
        const activity: IntegrationActivity | null =
            latest && (!stored || latest.at > stored.at) ? { provider: "gitlab", repo: null, at: latest.at } : stored;
        await db()
            .update(schema.integrationConnections)
            .set({ activity, lastSyncAt: now, lastError: null })
            .where(eq(schema.integrationConnections.id, connection.id));
        return activity;
    } catch (error) {
        await markFailure(connection.id, error);
        return stored;
    }
}

export async function presenceActivity(
    userIdentifier: string,
    playUri: string | undefined,
    now = new Date(),
): Promise<PresenceAnswer> {
    const people = await resolvePeople(userIdentifier, playUri);
    if (people.length === 0) return { music: null, coding: null };
    const connections = (
        await Promise.all(
            people.map((person) =>
                db()
                    .select()
                    .from(schema.integrationConnections)
                    .where(
                        and(
                            eq(schema.integrationConnections.organizationId, person.organizationId),
                            eq(schema.integrationConnections.accountId, person.accountId),
                            eq(schema.integrationConnections.status, "connected"),
                            inArray(schema.integrationConnections.provider, ["spotify", "github", "gitlab"]),
                        ),
                    ),
            ),
        )
    ).flat();

    const sharingMusic = connections.filter(
        (c) => c.provider === "spotify" && readIntegrationSettings(c.settings).shareMusic,
    );
    const sharingCode = connections.filter(
        (c) =>
            (c.provider === "github" || c.provider === "gitlab") && readIntegrationSettings(c.settings).shareActivity,
    );
    for (const connection of [...sharingMusic, ...sharingCode]) await touchConnection(connection.id);

    const [musicValue, codingValues] = await Promise.all([
        sharingMusic[0] ? withDeadline(music(sharingMusic[0], now.getTime()), null) : Promise.resolve(null),
        Promise.all(sharingCode.map((c) => withDeadline(refreshCoding(c, now), readIntegrationActivity(c.activity)))),
    ]);
    // WorkAdventure's contract names the repository: activity without one (GitLab polling) is not reported.
    const coding = codingValues
        .filter(
            (a): a is IntegrationActivity & { repo: string } =>
                a !== null && a.repo !== null && now.getTime() - Date.parse(a.at) <= CODING_RECENT_MS,
        )
        .sort((a, b) => b.at.localeCompare(a.at))[0];
    return {
        music: musicValue,
        coding: coding ? { provider: coding.provider, repo: coding.repo, at: coding.at } : null,
    };
}
