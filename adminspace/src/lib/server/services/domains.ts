/**
 * Custom domains of an organization. A domain counts for GET /api/domain/verify (WorkAdventure's
 * allow-list of redirect targets after an OpenID login) only once its ownership is proven: the
 * organization publishes the DNS TXT record `_adminspace-challenge.<host>` holding the challenge
 * token, and verification checks it. A self-declared confirmation is never enough.
 * The challenge token is also answered on GET /white-label/cf-challenge (public by design).
 */
import { resolveTxt } from "node:dns/promises";
import { and, asc, eq, isNotNull, sql } from "drizzle-orm";
import { randomToken } from "../crypto";
import { db, schema } from "../db/client";

/** DNS name holding the proof of ownership of a host. */
export function challengeRecordName(host: string): string {
    return `_adminspace-challenge.${host}`;
}

/** Reads the TXT records of a name; injectable for tests. */
export type TxtResolver = (name: string) => Promise<string[][]>;

const DNS_TIMEOUT_MS = 5_000;

async function resolveWithTimeout(resolver: TxtResolver, name: string): Promise<string[][]> {
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
        return await Promise.race([
            resolver(name),
            new Promise<never>((_, reject) => {
                timer = setTimeout(() => reject(new Error("DNS timeout")), DNS_TIMEOUT_MS);
            }),
        ]);
    } finally {
        if (timer) clearTimeout(timer);
    }
}

export type VerificationResult =
    | { status: "verified"; domain: Domain }
    | { status: "notFound" }
    | { status: "noProof"; recordName: string }
    | { status: "dnsError"; recordName: string };

/**
 * Verifies a domain: succeeds only when a TXT record `_adminspace-challenge.<host>` equals its
 * challenge token. A missing record (NXDOMAIN / ENODATA) is "noProof"; other DNS failures "dnsError".
 */
export async function verifyDomainOwnership(
    organizationId: string,
    domainId: string,
    resolver: TxtResolver = resolveTxt,
): Promise<VerificationResult> {
    const domain = await db().query.domains.findFirst({
        where: and(eq(schema.domains.id, domainId), eq(schema.domains.organizationId, organizationId)),
    });
    if (!domain) return { status: "notFound" };
    const recordName = challengeRecordName(domain.host);
    let records: string[][];
    try {
        records = await resolveWithTimeout(resolver, recordName);
    } catch (error) {
        const code = (error as { code?: string }).code;
        return code === "ENOTFOUND" || code === "ENODATA"
            ? { status: "noProof", recordName }
            : { status: "dnsError", recordName };
    }
    const values = records.map((chunks) => chunks.join("").trim());
    if (!domain.challenge || !values.includes(domain.challenge)) return { status: "noProof", recordName };
    const verified = await markDomainVerified(organizationId, domainId);
    return verified ? { status: "verified", domain: verified } : { status: "notFound" };
}

/** Hosts of every verified custom domain (of one organization, or all), lowercase. */
export async function verifiedHosts(organizationId?: string): Promise<string[]> {
    const rows = await db()
        .select({ host: schema.domains.host })
        .from(schema.domains)
        .where(
            and(
                isNotNull(schema.domains.verifiedAt),
                organizationId ? eq(schema.domains.organizationId, organizationId) : undefined,
            ),
        );
    return rows.map((r) => r.host.toLowerCase());
}

/** True when the host is a verified custom domain. */
export async function isVerifiedHost(host: string): Promise<boolean> {
    const row = await db().query.domains.findFirst({
        where: and(sql`lower(${schema.domains.host}) = ${host.toLowerCase()}`, isNotNull(schema.domains.verifiedAt)),
    });
    return row !== undefined;
}

export type Domain = typeof schema.domains.$inferSelect;

const LABEL = /^(?!-)[a-z0-9-]{1,63}(?<!-)$/;

/**
 * Normalizes a host name: lowercase, internationalized names converted to their ASCII (IDNA,
 * RFC 5891) form by the WHATWG URL parser. Returns undefined for anything that is not a bare host
 * name with at least two labels (no scheme, port, path, credentials or IP address).
 */
export function normalizeHost(input: string): string | undefined {
    const value = input.trim().replace(/\.$/, "");
    if (!value || /[/:@?#\s\\]/.test(value)) return undefined;
    let host: string;
    try {
        host = new URL(`http://${value}`).hostname;
    } catch {
        return undefined;
    }
    if (host.length > 253) return undefined;
    const labels = host.split(".");
    if (labels.length < 2 || !labels.every((label) => LABEL.test(label))) return undefined;
    // Reject IPv4 addresses: a domain is expected.
    if (labels.every((label) => /^\d+$/.test(label))) return undefined;
    return host;
}

export function listDomains(organizationId: string): Promise<Domain[]> {
    return db().query.domains.findMany({
        where: eq(schema.domains.organizationId, organizationId),
        orderBy: asc(schema.domains.host),
    });
}

/** Adds a domain. Returns "taken" when another organization (or this one) already has it. */
export async function addDomain(organizationId: string, host: string): Promise<Domain | "taken"> {
    const [row] = await db()
        .insert(schema.domains)
        .values({ organizationId, host, challenge: randomToken(24) })
        .onConflictDoNothing()
        .returning();
    return row ?? "taken";
}

export async function markDomainVerified(organizationId: string, domainId: string): Promise<Domain | undefined> {
    const [row] = await db()
        .update(schema.domains)
        .set({ verifiedAt: new Date() })
        .where(and(eq(schema.domains.id, domainId), eq(schema.domains.organizationId, organizationId)))
        .returning();
    return row;
}

export async function removeDomain(organizationId: string, domainId: string): Promise<Domain | undefined> {
    const [row] = await db()
        .delete(schema.domains)
        .where(and(eq(schema.domains.id, domainId), eq(schema.domains.organizationId, organizationId)))
        .returning();
    return row;
}
