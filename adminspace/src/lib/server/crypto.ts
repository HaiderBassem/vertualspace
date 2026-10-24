import { createCipheriv, createDecipheriv, createHash, createHmac, hkdfSync, randomBytes } from "node:crypto";
import { config } from "./config";

/** A URL-safe random token with `bytes` bytes of entropy (default 256 bits). */
export function randomToken(bytes = 32): string {
    return randomBytes(bytes).toString("base64url");
}

export function sha256Hex(value: string): string {
    return createHash("sha256").update(value).digest("hex");
}

/** Keyed hash used to pseudonymize identifiers (GDPR art. 4(5)): stable, but not reversible without APP_SECRET. */
export function pseudonymize(value: string, purpose: string): string {
    return createHmac("sha256", config().APP_SECRET).update(`${purpose}:${value}`).digest("hex");
}

/** Key of "v1." payloads (kept to decrypt values written before v2). */
function legacyKey(): Buffer {
    return createHash("sha256").update(`encryption:${config().APP_SECRET}`).digest();
}

/** Key of "v2." payloads: HKDF-SHA256 (RFC 5869) from APP_SECRET, with a versioned context. */
function keyV2(): Buffer {
    return Buffer.from(hkdfSync("sha256", config().APP_SECRET, "adminspace", "adminspace:encryption:v2", 32));
}

/** AES-256-GCM. Output: "v2.<iv>.<tag>.<ciphertext>", all base64url. */
export function encrypt(plaintext: string): string {
    const iv = randomBytes(12);
    const cipher = createCipheriv("aes-256-gcm", keyV2(), iv);
    const ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
    const tag = cipher.getAuthTag();
    return ["v2", iv.toString("base64url"), tag.toString("base64url"), ciphertext.toString("base64url")].join(".");
}

/** Decrypts "v2." payloads and the "v1." ones written by earlier versions. */
export function decrypt(payload: string): string {
    const [version, iv, tag, ciphertext] = payload.split(".");
    if ((version !== "v1" && version !== "v2") || !iv || !tag || ciphertext === undefined) {
        throw new Error("Unsupported encrypted payload");
    }
    const key = version === "v2" ? keyV2() : legacyKey();
    const decipher = createDecipheriv("aes-256-gcm", key, Buffer.from(iv, "base64url"));
    decipher.setAuthTag(Buffer.from(tag, "base64url"));
    return Buffer.concat([decipher.update(Buffer.from(ciphertext, "base64url")), decipher.final()]).toString("utf8");
}

/** Encrypts with the legacy v1 key. Only for tests of backward compatibility. */
export function encryptV1ForTests(plaintext: string): string {
    const iv = randomBytes(12);
    const cipher = createCipheriv("aes-256-gcm", legacyKey(), iv);
    const ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
    return [
        "v1",
        iv.toString("base64url"),
        cipher.getAuthTag().toString("base64url"),
        ciphertext.toString("base64url"),
    ].join(".");
}
