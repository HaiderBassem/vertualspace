/** Room API keys and domain names: pure functions, no database needed. */
import { describe, expect, it } from "vitest";
import { sha256Hex } from "../src/lib/server/crypto";
import {
    generateRoomApiKey,
    ROOM_API_KEY_PREFIX,
    ROOM_API_KEY_VISIBLE_LENGTH,
    roomApiKeyStatus,
} from "../src/lib/server/services/apiKeys";
import { normalizeHost } from "../src/lib/server/services/domains";

describe("generateRoomApiKey", () => {
    it("creates a prefixed key with 256 bits of entropy", () => {
        const { key } = generateRoomApiKey();
        expect(key.startsWith(ROOM_API_KEY_PREFIX)).toBe(true);
        // 32 random bytes in base64url = 43 characters.
        expect(key.slice(ROOM_API_KEY_PREFIX.length)).toMatch(/^[A-Za-z0-9_-]{43}$/);
    });

    it("stores the SHA-256 the authorization endpoint compares against, never the key", () => {
        const { key, hash, prefix } = generateRoomApiKey();
        expect(hash).toBe(sha256Hex(key));
        expect(hash).toMatch(/^[0-9a-f]{64}$/);
        expect(hash).not.toContain(key);
        expect(prefix).toBe(key.slice(0, ROOM_API_KEY_VISIBLE_LENGTH));
        expect(prefix.length).toBeLessThanOrEqual(16);
    });

    it("never repeats a key", () => {
        const keys = new Set(Array.from({ length: 1000 }, () => generateRoomApiKey().key));
        expect(keys.size).toBe(1000);
    });
});

describe("roomApiKeyStatus", () => {
    const now = new Date("2026-01-01T00:00:00Z");
    it("tells active, expired and revoked keys apart", () => {
        expect(roomApiKeyStatus({ revokedAt: null, expiresAt: null }, now)).toBe("active");
        expect(roomApiKeyStatus({ revokedAt: null, expiresAt: new Date("2025-12-31T23:59:59Z") }, now)).toBe("expired");
        expect(roomApiKeyStatus({ revokedAt: new Date("2025-06-01T00:00:00Z"), expiresAt: null }, now)).toBe("revoked");
    });
});

describe("normalizeHost", () => {
    it("lowercases and converts internationalized domain names to ASCII (IDNA)", () => {
        expect(normalizeHost("Play.Example.COM")).toBe("play.example.com");
        expect(normalizeHost("bücher.example")).toBe("xn--bcher-kva.example");
        expect(normalizeHost("play.example.com.")).toBe("play.example.com");
    });

    it("rejects anything that is not a bare domain name", () => {
        for (const input of [
            "",
            "localhost",
            "https://play.example.com",
            "play.example.com/path",
            "a@b.com",
            "127.0.0.1",
            "play.example.com:8080",
            "-bad.example.com",
        ]) {
            expect(normalizeHost(input), input).toBeUndefined();
        }
    });
});
