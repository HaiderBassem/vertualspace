import { describe, expect, it } from "vitest";
import { SocialRateLimiter } from "../src/Model/SocialRateLimiter";

function createLimiter(policy = { perTargetCooldownMs: 10_000, burstMax: 3, burstWindowMs: 30_000 }) {
    let now = 1_000_000;
    const limiter = new SocialRateLimiter(policy, () => now);
    return {
        limiter,
        advance: (ms: number) => {
            now += ms;
        },
    };
}

describe("SocialRateLimiter", () => {
    it("allows one action per sender and target within the cooldown, and tells how long to wait", () => {
        const { limiter, advance } = createLimiter();

        expect(limiter.tryConsume("alice", "bob")).toEqual({ allowed: true });

        advance(4_000);
        expect(limiter.tryConsume("alice", "bob")).toEqual({ allowed: false, retryAfterMs: 6_000 });

        advance(6_000);
        expect(limiter.tryConsume("alice", "bob")).toEqual({ allowed: true });
    });

    it("keeps the cooldown per target and per sender", () => {
        const { limiter } = createLimiter();

        expect(limiter.tryConsume("alice", "bob").allowed).toBe(true);
        expect(limiter.tryConsume("alice", "carol").allowed).toBe(true);
        // Another sender waving at the same person is not slowed down by Alice.
        expect(limiter.tryConsume("dave", "bob").allowed).toBe(true);
        expect(limiter.tryConsume("alice", "bob").allowed).toBe(false);
    });

    it("limits the bursts of a sender, whatever the targets", () => {
        const { limiter, advance } = createLimiter();

        expect(limiter.tryConsume("alice", "a").allowed).toBe(true);
        advance(1_000);
        expect(limiter.tryConsume("alice", "b").allowed).toBe(true);
        advance(1_000);
        expect(limiter.tryConsume("alice", "c").allowed).toBe(true);
        advance(1_000);

        // The 4th action within 30 s is refused until the first one leaves the window (at 30 s).
        expect(limiter.tryConsume("alice", "d")).toEqual({ allowed: false, retryAfterMs: 27_000 });

        advance(27_000);
        expect(limiter.tryConsume("alice", "d")).toEqual({ allowed: true });
        // The window is full again with the actions at 1 s, 2 s and 30 s: the next one waits for the one at 1 s.
        expect(limiter.tryConsume("alice", "e")).toEqual({ allowed: false, retryAfterMs: 1_000 });
    });

    it("does not count refused actions", () => {
        const { limiter, advance } = createLimiter();

        expect(limiter.tryConsume("alice", "bob").allowed).toBe(true);
        for (let i = 0; i < 5; i++) {
            advance(1_000);
            expect(limiter.tryConsume("alice", "bob").allowed).toBe(false);
        }
        advance(5_000);
        expect(limiter.tryConsume("alice", "bob").allowed).toBe(true);
    });

    it("forgets the senders who stopped acting", () => {
        const { limiter, advance } = createLimiter();

        limiter.tryConsume("alice", "bob");
        limiter.tryConsume("carol", "bob");
        expect(limiter.trackedSenders).toBe(2);

        advance(31_000);
        limiter.tryConsume("dave", "bob");
        expect(limiter.trackedSenders).toBe(1);
    });

    it("rejects a policy that would allow nothing", () => {
        expect(() => new SocialRateLimiter({ perTargetCooldownMs: 0, burstMax: 0, burstWindowMs: 1 })).toThrow();
        expect(() => new SocialRateLimiter({ perTargetCooldownMs: -1, burstMax: 1, burstWindowMs: 1 })).toThrow();
    });
});
