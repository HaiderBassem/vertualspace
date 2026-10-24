/**
 * Secrets stored in settings (Jitsi, BigBlueButton and LiveKit secrets, map-storage token) are sealed
 * at rest with the application key (crypto.ts, AES-256-GCM): a database dump or backup alone does not
 * reveal them. They are opened only where they are used, never sent to browsers.
 *
 * Rows written before sealing hold plain values: openSecret() accepts them, and they are sealed the next
 * time the settings are saved.
 */
import { decrypt, encrypt } from "../crypto";

const SEALED = /^v\d+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]*$/;

export function isSealed(value: string): boolean {
    return SEALED.test(value);
}

export function sealSecret(plain: string): string {
    return encrypt(plain);
}

/** Seals a value unless it already is sealed (idempotent). */
export function ensureSealed(value: string | undefined): string | undefined {
    if (value === undefined || value === "") return undefined;
    return isSealed(value) ? value : sealSecret(value);
}

/** The plain secret, or undefined when absent or unreadable (e.g. sealed with another APP_SECRET). */
export function openSecret(stored: string | undefined | null): string | undefined {
    if (!stored) return undefined;
    if (!isSealed(stored)) return stored;
    try {
        return decrypt(stored);
    } catch {
        console.error(
            JSON.stringify({
                level: "error",
                time: new Date().toISOString(),
                message: "A stored secret could not be decrypted (was APP_SECRET changed?)",
            }),
        );
        return undefined;
    }
}
