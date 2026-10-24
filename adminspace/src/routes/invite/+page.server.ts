import { fail, redirect } from "@sveltejs/kit";
import { sql } from "drizzle-orm";
import { z } from "zod";
import type { Actions, PageServerLoad } from "./$types";
import { audit } from "$lib/server/audit";
import { checkPasswordPolicy, PASSWORD_MAX_LENGTH, PASSWORD_MIN_LENGTH } from "$lib/server/auth/credentials";
import { createSession, destroySession } from "$lib/server/auth/session";
import { config } from "$lib/server/config";
import { fullyAuthenticated } from "$lib/server/context";
import { db, schema } from "$lib/server/db/client";
import { formValues } from "$lib/server/http/forms";
import { checkRateLimit } from "$lib/server/security/rateLimit";
import {
    acceptInvitation,
    acceptInvitationWithNewAccount,
    findInvitationByToken,
    type AcceptResult,
} from "$lib/server/services/invitations";

async function accountExists(email: string): Promise<boolean> {
    const rows = await db()
        .select({ id: schema.accounts.id })
        .from(schema.accounts)
        .where(sql`lower(${schema.accounts.email}) = lower(${email})`)
        .limit(1);
    return rows.length > 0;
}

export const load: PageServerLoad = async ({ url, locals }) => {
    const token = url.searchParams.get("token") ?? "";
    const lookup = await findInvitationByToken(token);
    const account = fullyAuthenticated(locals);
    if (!lookup) return { state: "invalid" as const, account: account ? { email: account.email } : null };

    const { invitation, organization } = lookup;
    const state = !organization.active && lookup.state === "pending" ? ("organizationInactive" as const) : lookup.state;
    return {
        state,
        organization: { name: organization.name, slug: organization.slug, logoUrl: organization.logoUrl },
        inviterName: lookup.inviterName,
        role: invitation.role,
        workspaces: lookup.workspaces,
        invitedEmail: invitation.email,
        account: account ? { email: account.email } : null,
        // The link holder may learn whether the invited address has an account (to log in or sign up).
        invitedHasAccount: !account && state === "pending" ? await accountExists(invitation.email) : false,
        loginHref: `/login?redirectTo=${encodeURIComponent(`/invite?token=${token}`)}`,
        passwordMinLength: PASSWORD_MIN_LENGTH,
        passwordMaxLength: PASSWORD_MAX_LENGTH,
    };
};

const TokenForm = z.object({ token: z.string().min(20).max(200) });
const CreateForm = TokenForm.extend({
    name: z.string().trim().min(1).max(200),
    password: z.string().max(PASSWORD_MAX_LENGTH + 1),
    passwordConfirm: z.string().max(PASSWORD_MAX_LENGTH + 1),
});

type InviteFailure = Exclude<AcceptResult["result"], "accepted" | "alreadyMember">;

async function throttle(ip: string | undefined): Promise<boolean> {
    const limit = await checkRateLimit(`invite:ip:${ip ?? "unknown"}`, config().RATE_LIMIT_LOGIN_PER_IP, 900);
    return limit.allowed;
}

export const actions: Actions = {
    accept: async ({ request, locals }) => {
        if (!(await throttle(locals.clientIp))) return fail(429, { rateLimited: true as const });
        const parsed = TokenForm.safeParse(formValues(await request.formData()));
        if (!parsed.success) return fail(400, { failure: "invalid" as InviteFailure });
        const account = fullyAuthenticated(locals);
        if (!account) {
            redirect(303, `/login?redirectTo=${encodeURIComponent(`/invite?token=${parsed.data.token}`)}`);
        }
        const outcome = await acceptInvitation(parsed.data.token, account);
        if (outcome.result === "alreadyMember") redirect(303, `/o/${outcome.organizationSlug}`);
        if (outcome.result !== "accepted") return fail(400, { failure: outcome.result });
        await audit({
            action: "invitation.accept",
            account,
            organizationId: outcome.organizationId,
            targetType: "invitation",
            targetId: outcome.invitationId,
            ipAddress: locals.clientIp ?? null,
        });
        redirect(303, `/o/${outcome.organizationSlug}?joined=1`);
    },

    create: async ({ request, locals, cookies }) => {
        if (!(await throttle(locals.clientIp))) return fail(429, { rateLimited: true as const });
        const values = formValues(await request.formData());
        const parsed = CreateForm.safeParse(values);
        if (!parsed.success) {
            const field = String(parsed.error.issues[0]?.path[0] ?? "name");
            return fail(400, { field, name: values.name ?? "" });
        }
        const problem = checkPasswordPolicy(parsed.data.password);
        if (problem) return fail(400, { field: "password", problem, name: parsed.data.name });
        if (parsed.data.password !== parsed.data.passwordConfirm) {
            return fail(400, { field: "passwordConfirm", name: parsed.data.name });
        }
        const outcome = await acceptInvitationWithNewAccount(parsed.data.token, {
            name: parsed.data.name,
            password: parsed.data.password,
            locale: locals.locale,
        });
        if (outcome.result !== "accepted") {
            return fail(400, { failure: outcome.result as InviteFailure, name: parsed.data.name });
        }
        const lookup = await findInvitationByToken(parsed.data.token);
        await audit({
            action: "invitation.accept",
            account: { id: outcome.accountId, email: lookup?.invitation.email ?? "" },
            organizationId: outcome.organizationId,
            targetType: "invitation",
            targetId: outcome.invitationId,
            ipAddress: locals.clientIp ?? null,
            details: { newAccount: true },
        });
        await destroySession(cookies);
        await createSession(cookies, outcome.accountId, {
            ipAddress: locals.clientIp,
            userAgent: request.headers.get("user-agent") ?? undefined,
            mfaVerified: true,
        });
        redirect(303, `/o/${outcome.organizationSlug}?joined=1`);
    },
};
