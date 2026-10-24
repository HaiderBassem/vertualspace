/**
 * Self-service registration: a new person creates an account and an organization they own.
 *
 * With email verification (the default), nothing but a signup request exists until the emailed link
 * is confirmed; confirming creates the account, the organization, its owner membership and its first
 * workspace in ONE transaction that also holds the request's row lock. Consequences:
 * - no half-created organization after a failure: the link stays valid and can be retried;
 * - nobody can claim someone else's address or leave an unverified account behind;
 * - concurrent confirmations of one link run one after the other (the second finds it used);
 *   concurrent registrations of one address or slug are settled by the unique indexes and reported.
 *
 * Account enumeration: the answer to a registration request is the same whether or not the address has
 * an account (an existing account receives an email telling them so), and emails are sent after the
 * answer so that its timing does not depend on the mail server.
 */
import { and, eq, gt, isNull, lt, or, sql } from "drizzle-orm";
import { db, schema, type Database } from "../db/client";
import { randomToken, sha256Hex } from "../crypto";
import { hashPassword } from "../auth/credentials";
import { isUniqueViolation } from "../db/errors";
import { format, isLocale, localeInfo, messagesFor, DEFAULT_LOCALE, type Locale } from "../../i18n";
import { getInstanceSettings } from "./instance";
import { mailConfigured, sendMail } from "./mail";
import { createOrganization, isOrganizationSlugTaken, type Organization } from "./organizations";
import { logJson } from "../security/requestLog";

type Transaction = Parameters<Parameters<Database["transaction"]>[0]>[0];

export const SIGNUP_TTL_HOURS = 24;

export type RegistrationAvailability = "open" | "openWithoutVerification" | "closed" | "needsMail";

/** Whether /register can be used, and how. */
export async function registrationAvailability(): Promise<RegistrationAvailability> {
    const settings = await getInstanceSettings();
    if (settings.registration !== "open") return "closed";
    if (settings.registrationEmailVerification === false) return "openWithoutVerification";
    return mailConfigured() ? "open" : "needsMail";
}

export interface RegistrationInput {
    name: string;
    email: string;
    password: string;
    organizationName: string;
    organizationSlug: string;
    locale: Locale;
    ipAddress: string | undefined;
}

export type CreatedRegistration = { result: "created"; accountId: string; organization: Organization };

export type StartResult =
    | { result: "pending" }
    | { result: "slugTaken" }
    | { result: "unavailable" }
    | { result: "accountExists" }
    | CreatedRegistration;

function verificationLink(origin: string, token: string): string {
    return `${origin}/register/verify?token=${encodeURIComponent(token)}`;
}

/** Runs email work after the answer: a slow or failing mail server must not change the response. */
function inBackground(task: () => Promise<unknown>): void {
    void task().catch((error: unknown) =>
        logJson("error", "registration email failed", { error: error instanceof Error ? error.name : "unknown" }),
    );
}

function mailText(locale: Locale) {
    const info = localeInfo(locale);
    return { m: messagesFor(locale).onboarding.emails, dir: info.dir, lang: info.tag };
}

/**
 * Starts a registration. With verification: records the request and emails the link (or, for an
 * address that already has an account, emails that fact) and answers "pending" in both cases.
 * Without verification: creates everything at once.
 */
export async function startRegistration(input: RegistrationInput, origin: string | undefined): Promise<StartResult> {
    const availability = await registrationAvailability();
    if (availability === "closed" || availability === "needsMail" || !origin) return { result: "unavailable" };
    // Slugs are public (they appear in every world address): saying one is taken reveals nothing.
    if (await isOrganizationSlugTaken(input.organizationSlug)) return { result: "slugTaken" };

    const email = input.email.trim().toLowerCase();
    const passwordHash = await hashPassword(input.password);
    if (availability === "openWithoutVerification") {
        return runCreation((tx) => createInTransaction(tx, { ...input, email, passwordHash, verified: false }));
    }

    const token = randomToken();
    inBackground(async () => {
        const existing = await db()
            .select({ id: schema.accounts.id })
            .from(schema.accounts)
            .where(sql`lower(${schema.accounts.email}) = ${email}`)
            .limit(1);
        const { m, dir, lang } = mailText(input.locale);
        if (existing.length > 0) {
            await sendMail({
                to: email,
                purpose: "signup_existing_account",
                message: {
                    subject: m.signupExisting.subject,
                    paragraphs: [m.signupExisting.body],
                    action: { label: m.signupExisting.action, url: `${origin}/login` },
                    footnote: m.signupExisting.footnote,
                    dir,
                    lang,
                },
            });
            return;
        }
        await db()
            .insert(schema.signupRequests)
            .values({
                email,
                name: input.name,
                passwordHash,
                organizationName: input.organizationName,
                organizationSlug: input.organizationSlug,
                locale: input.locale,
                tokenHash: sha256Hex(token),
                expiresAt: new Date(Date.now() + SIGNUP_TTL_HOURS * 3_600_000),
                ipAddress: input.ipAddress ?? null,
            });
        await sendMail({
            to: email,
            purpose: "signup_verification",
            message: {
                subject: format(m.signupVerification.subject, { organization: input.organizationName }),
                paragraphs: [
                    format(m.signupVerification.body, { name: input.name, organization: input.organizationName }),
                ],
                action: { label: m.signupVerification.action, url: verificationLink(origin, token) },
                footnote: format(m.signupVerification.footnote, { hours: SIGNUP_TTL_HOURS }),
                dir,
                lang,
            },
        });
    });
    return { result: "pending" };
}

/** Thrown inside a creation transaction to undo it entirely when the organization slug is taken. */
class SlugTakenError extends Error {
    override name = "SlugTakenError";
}

/** Creates account + organization + owner membership + first workspace inside `tx`. */
async function createInTransaction(
    tx: Transaction,
    input: {
        name: string;
        email: string;
        passwordHash: string;
        organizationName: string;
        organizationSlug: string;
        locale: Locale;
        verified: boolean;
    },
): Promise<CreatedRegistration | { result: "accountExists" }> {
    const existing = await tx
        .select({ id: schema.accounts.id })
        .from(schema.accounts)
        .where(sql`lower(${schema.accounts.email}) = ${input.email}`)
        .limit(1);
    if (existing.length > 0) return { result: "accountExists" };
    const [account] = await tx
        .insert(schema.accounts)
        .values({
            email: input.email,
            name: input.name,
            passwordHash: input.passwordHash,
            locale: input.locale,
            emailVerifiedAt: input.verified ? new Date() : null,
        })
        .returning({ id: schema.accounts.id });
    if (!account) throw new Error("Account creation returned no row");
    const created = await createOrganization(
        {
            name: input.organizationName,
            slug: input.organizationSlug,
            countryCode: null,
            defaultLocale: input.locale,
            contactEmail: input.email,
        },
        account.id,
        tx,
    );
    // Undo the account too: the person picks another identifier and confirms again.
    if (created === "slugTaken") throw new SlugTakenError();
    return { result: "created", accountId: account.id, organization: created.organization };
}

/** Runs a creation transaction and maps constraint races to outcomes. */
async function runCreation<T>(
    work: (tx: Transaction) => Promise<T>,
): Promise<T | { result: "slugTaken" } | { result: "accountExists" }> {
    try {
        return await db().transaction(work);
    } catch (error) {
        if (error instanceof SlugTakenError) return { result: "slugTaken" };
        if (isUniqueViolation(error)) {
            const constraint = (error as { constraint_name?: string }).constraint_name ?? "";
            return constraint.startsWith("organizations_slug") ? { result: "slugTaken" } : { result: "accountExists" };
        }
        throw error;
    }
}

export interface PendingSignup {
    email: string;
    name: string;
    organizationName: string;
    organizationSlug: string;
    expiresAt: Date;
}

/** The pending registration a verification link points to (expired or used ones are not returned). */
export async function findPendingSignup(token: string): Promise<PendingSignup | undefined> {
    if (token.length < 20 || token.length > 200) return undefined;
    const row = await db().query.signupRequests.findFirst({
        where: and(
            eq(schema.signupRequests.tokenHash, sha256Hex(token)),
            isNull(schema.signupRequests.consumedAt),
            gt(schema.signupRequests.expiresAt, new Date()),
        ),
    });
    return row
        ? {
              email: row.email,
              name: row.name,
              organizationName: row.organizationName,
              organizationSlug: row.organizationSlug,
              expiresAt: row.expiresAt,
          }
        : undefined;
}

export type CompleteResult =
    CreatedRegistration | { result: "invalid" } | { result: "slugTaken" } | { result: "accountExists" };

/**
 * Confirms a registration (POST from the verification page, never on GET: mail scanners open links).
 * `slug` lets the person choose another identifier if theirs was taken meanwhile; the link stays
 * valid until the organization is created.
 */
export async function completeRegistration(token: string, slug?: string): Promise<CompleteResult> {
    return runCreation(async (tx): Promise<CompleteResult> => {
        const [request] = await tx
            .select()
            .from(schema.signupRequests)
            .where(
                and(
                    eq(schema.signupRequests.tokenHash, sha256Hex(token)),
                    isNull(schema.signupRequests.consumedAt),
                    gt(schema.signupRequests.expiresAt, new Date()),
                ),
            )
            .for("update");
        if (!request) return { result: "invalid" };
        const outcome = await createInTransaction(tx, {
            name: request.name,
            email: request.email,
            passwordHash: request.passwordHash,
            organizationName: request.organizationName,
            organizationSlug: slug ?? request.organizationSlug,
            locale: isLocale(request.locale) ? request.locale : DEFAULT_LOCALE,
            verified: true,
        });
        // Created, or the address got an account meanwhile (another link, an invitation): spent either way.
        await tx
            .update(schema.signupRequests)
            .set({ consumedAt: new Date() })
            .where(eq(schema.signupRequests.id, request.id));
        return outcome;
    });
}

/** Deletes expired or used signup requests (they hold a password hash). Returns the number deleted. */
export async function purgeSignupRequests(now = new Date()): Promise<number> {
    const rows = await db()
        .delete(schema.signupRequests)
        .where(or(lt(schema.signupRequests.expiresAt, now), sql`${schema.signupRequests.consumedAt} is not null`))
        .returning({ id: schema.signupRequests.id });
    return rows.length;
}
