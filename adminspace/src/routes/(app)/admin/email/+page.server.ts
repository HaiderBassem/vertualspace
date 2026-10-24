import { desc } from "drizzle-orm";
import type { PageServerLoad } from "./$types";
import { requireSuperadmin } from "$lib/server/auth/rbac";
import { config } from "$lib/server/config";
import { requireAccount } from "$lib/server/context";
import { db, schema } from "$lib/server/db/client";
import { mailConfigured } from "$lib/server/services/mail";

/** The last email delivery attempts (metadata only: bodies are never stored). */
export const load: PageServerLoad = async ({ locals }) => {
    requireSuperadmin(requireAccount(locals));
    const rows = await db()
        .select()
        .from(schema.emailDeliveries)
        .orderBy(desc(schema.emailDeliveries.createdAt))
        .limit(200);
    return {
        configured: mailConfigured(),
        from: mailConfigured() ? (config().MAIL_FROM ?? "") : "",
        deliveries: rows.map((r) => ({
            id: r.id,
            recipient: r.recipient,
            purpose: r.purpose,
            status: r.status,
            errorCode: r.errorCode,
            createdAt: r.createdAt.toISOString(),
        })),
    };
};
