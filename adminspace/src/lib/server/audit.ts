/**
 * Audit trail (ISO/IEC 27001 Annex A 8.15 "Logging"): every change made from the back office or
 * requested by WorkAdventure (bans, reports) is recorded with who, what, when (UTC) and from where.
 * Secrets and passwords must never be put in `details`.
 */
import { db, schema } from "./db/client";
import type { Account } from "./auth/session";
import { requestContext } from "./requestContext";

export interface AuditEntry {
    action: string;
    account?: Pick<Account, "id" | "email"> | null;
    /** Who acted when there is no account, e.g. "workadventure:<userUuid>". */
    actorLabel?: string;
    organizationId?: string | null;
    worldId?: string | null;
    targetType?: string;
    targetId?: string;
    ipAddress?: string | null;
    details?: Record<string, unknown>;
}

const REDACTED_KEYS = /password|secret|token|apikey|api_key|credential/i;

function redact(details: Record<string, unknown> | undefined): Record<string, unknown> | undefined {
    if (!details) return undefined;
    return Object.fromEntries(
        Object.entries(details).map(([key, value]) => [key, REDACTED_KEYS.test(key) ? "[redacted]" : value]),
    );
}

export async function audit(entry: AuditEntry): Promise<void> {
    // Actions taken through a platform administrator's support access say so in the organization's log.
    const supportGrantId = requestContext()?.supportGrantId;
    const details = supportGrantId ? { ...entry.details, via: "support", supportGrantId } : entry.details;
    await db()
        .insert(schema.auditLogs)
        .values({
            action: entry.action,
            accountId: entry.account?.id ?? null,
            actorLabel: entry.account?.email ?? entry.actorLabel ?? "system",
            organizationId: entry.organizationId ?? null,
            worldId: entry.worldId ?? null,
            targetType: entry.targetType ?? null,
            targetId: entry.targetId ?? null,
            ipAddress: entry.ipAddress ?? null,
            details: redact(details) ?? null,
        });
}
