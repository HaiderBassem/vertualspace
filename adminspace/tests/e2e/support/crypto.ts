/**
 * Test-side copies of the server's at-rest formats, to seed fixtures directly in the database.
 * Kept in sync with src/lib/server/crypto.ts ("v2" AES-256-GCM payloads, HKDF-SHA256 key).
 */
import { createCipheriv, createHash, hkdfSync, randomBytes } from "node:crypto";
import * as OTPAuth from "otpauth";

export function sha256Hex(value: string): string {
    return createHash("sha256").update(value).digest("hex");
}

export function encryptV2(plaintext: string, appSecret: string): string {
    const key = Buffer.from(hkdfSync("sha256", appSecret, "adminspace", "adminspace:encryption:v2", 32));
    const iv = randomBytes(12);
    const cipher = createCipheriv("aes-256-gcm", key, iv);
    const ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
    return ["v2", iv, cipher.getAuthTag(), ciphertext]
        .map((p) => (typeof p === "string" ? p : p.toString("base64url")))
        .join(".");
}

/** The TOTP code of `secret` at `time` (ms), with the parameters the server uses (SHA-1, 6 digits, 30 s). */
export function totp(secretBase32: string, time = Date.now()): string {
    return new OTPAuth.TOTP({
        algorithm: "SHA1",
        digits: 6,
        period: 30,
        secret: OTPAuth.Secret.fromBase32(secretBase32),
    }).generate({ timestamp: time });
}

export function newTotpSecret(): string {
    return new OTPAuth.Secret({ size: 20 }).base32;
}
