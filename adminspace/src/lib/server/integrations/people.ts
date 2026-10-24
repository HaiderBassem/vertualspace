/**
 * From a WorkAdventure person to an AdminSpace account. WorkAdventure identifies signed-in people by their email
 * (userUuid == email) and anonymous ones by a random uuid; a member row of the world links a uuid to an email. Only an
 * active account with an active membership of the world's organization is found: suspensions and departures apply
 * at once, and nothing is ever answered for anonymous people.
 */
import { and, eq, sql } from "drizzle-orm";
import { db, schema } from "../db/client";
import { findMember, looksLikeEmail } from "../services/members";
import { resolveWorldOfPlayUri } from "../services/worlds";

export interface ResolvedPerson {
    organizationId: string;
    accountId: string;
    locale: string | null;
}

async function emailOf(userIdentifier: string, worldId: string | undefined): Promise<string | undefined> {
    if (looksLikeEmail(userIdentifier)) return userIdentifier.toLowerCase();
    if (!worldId) return undefined;
    return (await findMember(worldId, userIdentifier))?.email?.toLowerCase() ?? undefined;
}

/**
 * The people an identifier designates: in the organization of `playUri` when given (at most one), else in every
 * organization the account belongs to (identifier must then be an email).
 */
export async function resolvePeople(userIdentifier: string, playUri: string | undefined): Promise<ResolvedPerson[]> {
    if (!userIdentifier || userIdentifier.length > 320) return [];
    const context = playUri ? await resolveWorldOfPlayUri(playUri) : undefined;
    if (playUri && !context) return [];
    const email = await emailOf(userIdentifier, context?.world.id);
    if (!email) return [];
    const rows = await db()
        .select({
            organizationId: schema.organizationMemberships.organizationId,
            accountId: schema.accounts.id,
            locale: schema.accounts.locale,
        })
        .from(schema.accounts)
        .innerJoin(
            schema.organizationMemberships,
            and(
                eq(schema.organizationMemberships.accountId, schema.accounts.id),
                eq(schema.organizationMemberships.status, "active"),
            ),
        )
        .innerJoin(
            schema.organizations,
            and(
                eq(schema.organizations.id, schema.organizationMemberships.organizationId),
                eq(schema.organizations.status, "active"),
            ),
        )
        .where(
            and(
                sql`lower(${schema.accounts.email}) = ${email}`,
                eq(schema.accounts.status, "active"),
                context ? eq(schema.organizationMemberships.organizationId, context.organization.id) : undefined,
            ),
        );
    return rows;
}
