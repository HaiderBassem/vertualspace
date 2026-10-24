export interface SocialRateLimitPolicy {
    /** Minimum delay between two actions of one sender towards the same target. */
    readonly perTargetCooldownMs: number;
    /** At most this many actions of one sender, whatever the targets, within burstWindowMs. */
    readonly burstMax: number;
    readonly burstWindowMs: number;
}

export type SocialRateLimitDecision = { allowed: true } | { allowed: false; retryAfterMs: number };

interface ActionLogEntry {
    at: number;
    targetKey: string;
}

/**
 * Rate limits person-to-person social actions (waves, knocks): a cooldown per sender and target, plus a burst limit
 * per sender. Only allowed actions count: a refused one does not extend the wait.
 *
 * Keys are opaque strings, typically user uuids, so that several connections of one person share their limits.
 */
export class SocialRateLimiter {
    private readonly logBySender = new Map<string, ActionLogEntry[]>();
    private readonly horizonMs: number;
    private lastSweepAt: number;

    constructor(
        private readonly policy: SocialRateLimitPolicy,
        private readonly now: () => number = Date.now,
    ) {
        if (policy.perTargetCooldownMs < 0 || policy.burstWindowMs < 0) {
            throw new Error("Rate limit durations cannot be negative");
        }
        if (policy.burstMax < 1) {
            throw new Error("The burst limit must allow at least one action");
        }
        this.horizonMs = Math.max(policy.perTargetCooldownMs, policy.burstWindowMs);
        this.lastSweepAt = now();
    }

    /**
     * Records the action if the limits allow it. Otherwise, tells how long to wait before it would be allowed.
     */
    public tryConsume(senderKey: string, targetKey: string): SocialRateLimitDecision {
        const now = this.now();
        this.sweepIfDue(now);

        const log = this.recentLog(senderKey, now);

        let retryAfterMs = 0;
        // The log is in chronological order: the last entry towards the target is the one that matters.
        const lastTowardsTarget = log.reduce<ActionLogEntry | undefined>(
            (last, entry) => (entry.targetKey === targetKey ? entry : last),
            undefined,
        );
        if (lastTowardsTarget !== undefined) {
            retryAfterMs = Math.max(retryAfterMs, lastTowardsTarget.at + this.policy.perTargetCooldownMs - now);
        }
        const inBurstWindow = log.filter((entry) => entry.at > now - this.policy.burstWindowMs);
        if (inBurstWindow.length >= this.policy.burstMax) {
            // The action becomes possible again when the oldest action that keeps the window full leaves it.
            const unblockingEntry = inBurstWindow[inBurstWindow.length - this.policy.burstMax];
            retryAfterMs = Math.max(retryAfterMs, unblockingEntry.at + this.policy.burstWindowMs - now);
        }

        if (retryAfterMs > 0) {
            return { allowed: false, retryAfterMs };
        }

        log.push({ at: now, targetKey });
        this.logBySender.set(senderKey, log);
        return { allowed: true };
    }

    /** Number of senders with recent actions. Exposed for tests and metrics. */
    public get trackedSenders(): number {
        return this.logBySender.size;
    }

    private recentLog(senderKey: string, now: number): ActionLogEntry[] {
        const log = this.logBySender.get(senderKey);
        if (log === undefined) {
            return [];
        }
        return log.filter((entry) => entry.at > now - this.horizonMs);
    }

    /** Forgets the senders who did nothing recently, so that the map does not grow forever. */
    private sweepIfDue(now: number): void {
        if (now - this.lastSweepAt < this.horizonMs) {
            return;
        }
        this.lastSweepAt = now;
        for (const [senderKey, log] of this.logBySender) {
            const recent = log.filter((entry) => entry.at > now - this.horizonMs);
            if (recent.length === 0) {
                this.logBySender.delete(senderKey);
            } else {
                this.logBySender.set(senderKey, recent);
            }
        }
    }
}
