/**
 * Webhook signatures: the ones AdminSpace produces (Standard Webhooks, for webhook, Zapier and n8n endpoints) and the
 * ones it verifies on inbound webhooks (Slack, GitHub, GitLab, Notion, Trello). Every comparison is constant-time and
 * runs on the raw request body, exactly as received (re-serialized JSON would not match).
 */
import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

/** Constant-time comparison of two strings (false on different lengths, without an early exit on content). */
export function constantTimeEqual(a: string, b: string): boolean {
    const left = Buffer.from(a);
    const right = Buffer.from(b);
    if (left.length !== right.length) {
        timingSafeEqual(left, left);
        return false;
    }
    return timingSafeEqual(left, right);
}

function hmac(algorithm: "sha256" | "sha1", key: string | Buffer, data: string): Buffer {
    return createHmac(algorithm, key).update(data, "utf8").digest();
}

// ---------------------------------------------------------------------------------------------
// Standard Webhooks (https://www.standardwebhooks.com, spec v1): what AdminSpace sends
// ---------------------------------------------------------------------------------------------

export const WEBHOOK_SECRET_PREFIX = "whsec_";

/** A new signing secret: "whsec_" + base64 of 32 random bytes (the spec allows 24 to 64). */
export function newWebhookSecret(): string {
    return WEBHOOK_SECRET_PREFIX + randomBytes(32).toString("base64");
}

function secretKey(secret: string): Buffer {
    return Buffer.from(
        secret.startsWith(WEBHOOK_SECRET_PREFIX) ? secret.slice(WEBHOOK_SECRET_PREFIX.length) : secret,
        "base64",
    );
}

/** webhook-signature value: "v1," + base64(HMAC-SHA256(key, "{id}.{timestamp}.{body}")). */
export function signStandardWebhook(secret: string, id: string, timestampSec: number, body: string): string {
    return `v1,${hmac("sha256", secretKey(secret), `${id}.${timestampSec}.${body}`).toString("base64")}`;
}

/** The three headers of a Standard Webhooks request. */
export function standardWebhookHeaders(
    secret: string,
    id: string,
    timestampSec: number,
    body: string,
): Record<"webhook-id" | "webhook-timestamp" | "webhook-signature", string> {
    return {
        "webhook-id": id,
        "webhook-timestamp": String(timestampSec),
        "webhook-signature": signStandardWebhook(secret, id, timestampSec, body),
    };
}

/**
 * Verifies a Standard Webhooks request (for receivers, and to test what AdminSpace sends). The signature header may
 * list several space-separated signatures (secret rotation): one valid "v1" signature is enough. Requests older or
 * newer than `toleranceSec` are refused (replay protection).
 */
export function verifyStandardWebhook(
    secret: string,
    headers: { id: string; timestamp: string; signature: string },
    body: string,
    nowSec = Math.floor(Date.now() / 1000),
    toleranceSec = 300,
): boolean {
    const timestamp = Number(headers.timestamp);
    if (!Number.isInteger(timestamp) || Math.abs(nowSec - timestamp) > toleranceSec) return false;
    const expected = signStandardWebhook(secret, headers.id, timestamp, body);
    return headers.signature
        .split(" ")
        .filter((candidate) => candidate.startsWith("v1,"))
        .some((candidate) => constantTimeEqual(candidate, expected));
}

// ---------------------------------------------------------------------------------------------
// Inbound: Slack, GitHub, GitLab, Notion, Trello
// ---------------------------------------------------------------------------------------------

export type SlackVerification = "ok" | "stale" | "invalid";

/**
 * Slack request signing: X-Slack-Signature = "v0=" + hex(HMAC-SHA256(signing secret, "v0:{timestamp}:{raw body}")),
 * with X-Slack-Request-Timestamp at most five minutes away from now (replay protection).
 */
export function verifySlackSignature(
    signingSecret: string,
    timestamp: string,
    rawBody: string,
    signature: string,
    nowSec = Math.floor(Date.now() / 1000),
    toleranceSec = 300,
): SlackVerification {
    const seconds = Number(timestamp);
    if (!/^\d{1,12}$/.test(timestamp) || Math.abs(nowSec - seconds) > toleranceSec) return "stale";
    const expected = `v0=${hmac("sha256", signingSecret, `v0:${timestamp}:${rawBody}`).toString("hex")}`;
    return constantTimeEqual(signature, expected) ? "ok" : "invalid";
}

/** GitHub: X-Hub-Signature-256 = "sha256=" + hex(HMAC-SHA256(webhook secret, raw body)). */
export function verifyGithubSignature(secret: string, rawBody: string, header: string): boolean {
    return constantTimeEqual(header, `sha256=${hmac("sha256", secret, rawBody).toString("hex")}`);
}

/** GitLab (before Standard Webhooks signatures): X-Gitlab-Token carries the secret token itself. */
export function verifyGitlabToken(expected: string, header: string): boolean {
    return expected.length > 0 && constantTimeEqual(header, expected);
}

/** Notion: X-Notion-Signature = "sha256=" + hex(HMAC-SHA256(verification_token, raw body)). */
export function verifyNotionSignature(verificationToken: string, rawBody: string, header: string): boolean {
    return constantTimeEqual(header, `sha256=${hmac("sha256", verificationToken, rawBody).toString("hex")}`);
}

/** Trello: X-Trello-Webhook = base64(HMAC-SHA1(application secret, raw body + callback URL)). */
export function verifyTrelloSignature(
    appSecret: string,
    rawBody: string,
    callbackUrl: string,
    header: string,
): boolean {
    return constantTimeEqual(header, hmac("sha1", appSecret, rawBody + callbackUrl).toString("base64"));
}
