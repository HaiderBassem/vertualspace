import { expect, it } from "vitest";
import { jwtVerify } from "jose";
import { createPlayerLaunchToken } from "../src/lib/server/services/playerLaunch";

it("signs a short-lived player identity without giving global editor or admin tags", async () => {
    const secret = "test-player-secret-0123456789abcdef0123456789abcdef";
    const token = await createPlayerLaunchToken({ email: "owner@example.com", name: "Owner" }, "en-US", secret);
    const { payload } = await jwtVerify(token, new TextEncoder().encode(secret));
    expect(payload.identifier).toBe("owner@example.com");
    expect(payload.username).toBe("Owner");
    expect(payload.backofficeSession).toBe(true);
    expect(payload.tags).toBeUndefined();
    expect(payload.accessToken).toBeUndefined();
    // The signed-in visitor stays signed in for 30 days (the pusher renews it at every visit).
    expect(payload.exp! - payload.iat!).toBe(30 * 24 * 3600);
    const short = await createPlayerLaunchToken({ email: "owner@example.com", name: "Owner" }, "en-US", secret, "1h");
    const shortPayload = (await jwtVerify(short, new TextEncoder().encode(secret))).payload;
    expect(shortPayload.exp! - shortPayload.iat!).toBe(3600);
    await expect(jwtVerify(token, new TextEncoder().encode("different-secret"))).rejects.toThrow();
});
