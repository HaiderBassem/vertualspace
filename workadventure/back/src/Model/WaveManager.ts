import type { SendWaveAnswer, SpaceUser } from "@workadventure/messages";
import { SendWaveAnswer_Status } from "@workadventure/messages";
import type { Space } from "./Space";
import type { SocialRateLimitPolicy } from "./SocialRateLimiter";
import { SocialRateLimiter } from "./SocialRateLimiter";

/**
 * One wave per sender to the same person every 10 seconds, and no more than 5 waves in 30 seconds overall.
 * A wave back counts like any wave.
 */
export const WAVE_RATE_LIMIT_POLICY: SocialRateLimitPolicy = {
    perTargetCooldownMs: 10_000,
    burstMax: 5,
    burstWindowMs: 30_000,
};

/** What the WaveManager sees of its Space. */
export type WaveHost = Pick<Space, "name" | "getAllUsers" | "dispatchPrivateEvent">;

/** Several connections of one person share their limits: they are keyed by uuid when the user has one. */
function rateLimitKeyOf(user: SpaceUser): string {
    return user.uuid || user.spaceUserId;
}

/**
 * Delivers waves ("👋") between the users of a space, within rate limits.
 *
 * In the world space, every user of every map of the world is a member: a wave reaches people on other maps too.
 */
export class WaveManager {
    constructor(
        private readonly space: WaveHost,
        private readonly rateLimiter = new SocialRateLimiter(WAVE_RATE_LIMIT_POLICY),
    ) {}

    public sendWave(sender: SpaceUser, receiverUserUuid: string, waveBack: boolean): SendWaveAnswer {
        if (receiverUserUuid === "" || receiverUserUuid === sender.uuid) {
            return { status: SendWaveAnswer_Status.RECEIVER_NOT_FOUND, retryAfterMs: 0 };
        }

        // The same person may be connected several times (several tabs): each connection gets the wave.
        const receivers = this.space.getAllUsers().filter((user) => user.uuid === receiverUserUuid);
        if (receivers.length === 0) {
            return { status: SendWaveAnswer_Status.RECEIVER_NOT_FOUND, retryAfterMs: 0 };
        }

        const decision = this.rateLimiter.tryConsume(rateLimitKeyOf(sender), receiverUserUuid);
        if (!decision.allowed) {
            return { status: SendWaveAnswer_Status.RATE_LIMITED, retryAfterMs: Math.ceil(decision.retryAfterMs) };
        }

        for (const receiver of receivers) {
            this.space.dispatchPrivateEvent({
                spaceName: this.space.name,
                senderUserId: sender.spaceUserId,
                receiverUserId: receiver.spaceUserId,
                spaceEvent: {
                    event: {
                        $case: "wave",
                        wave: { waveBack },
                    },
                },
            });
        }
        return { status: SendWaveAnswer_Status.SENT, retryAfterMs: 0 };
    }
}
