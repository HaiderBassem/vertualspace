/**
 * Bans decided in the back office: recorded, audited, and enforced immediately when possible.
 *
 * The ban always takes effect at the person's next connection (GET /api/room/access refuses them).
 * The immediate disconnection goes through the pusher's admin websocket and its real outcome is
 * returned and audited: the back office never reports a disconnection that did not happen.
 */
import { audit } from "../audit";
import type { Account } from "../auth/session";
import { createBan, type Ban } from "./moderation";
import { kickBannedPerson, type LiveActionStatus } from "./live";
import { allWorldRoomUrls } from "./rooms";
import type { Organization, World } from "./worlds";

export const BAN_DURATIONS = {
    permanent: null,
    hour: 3_600_000,
    day: 86_400_000,
    week: 7 * 86_400_000,
    month: 30 * 86_400_000,
} as const;

export type BanDuration = keyof typeof BAN_DURATIONS;

export function banExpiry(duration: BanDuration, now = Date.now()): Date | null {
    const ms = BAN_DURATIONS[duration];
    return ms === null ? null : new Date(now + ms);
}

export async function banFromBackOffice(input: {
    organization: Organization;
    world: World;
    account: Account;
    clientIp: string | undefined;
    memberUuid: string | null;
    name: string | null;
    ipAddress: string | null;
    reason: string;
    duration: BanDuration;
}): Promise<{ ban: Ban; liveDisconnect: LiveActionStatus }> {
    const ban = await createBan({
        worldId: input.world.id,
        memberUuid: input.memberUuid,
        ipAddress: input.ipAddress,
        name: input.name,
        reason: input.reason,
        bannedBy: `account:${input.account.id}`,
        expiresAt: banExpiry(input.duration),
    });
    const kick = await kickBannedPerson(
        input.world.slug,
        input.memberUuid ? await allWorldRoomUrls(input.organization, input.world) : [],
        input.memberUuid,
        input.reason,
    );
    await audit({
        action: "ban.create",
        account: input.account,
        organizationId: input.organization.id,
        worldId: input.world.id,
        targetType: "member",
        targetId: input.memberUuid ?? undefined,
        ipAddress: input.clientIp ?? null,
        details: {
            banId: ban.id,
            source: "back-office",
            ipBanned: ban.ipAddress !== null,
            expiresAt: ban.expiresAt?.toISOString() ?? null,
            liveDisconnect: kick.status,
            liveDisconnectDetail: kick.detail,
        },
    });
    return { ban, liveDisconnect: kick.status };
}
