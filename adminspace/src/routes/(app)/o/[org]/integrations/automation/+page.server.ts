import { fail } from "@sveltejs/kit";
import { z } from "zod";
import type { Actions, PageServerLoad } from "./$types";
import { audit } from "$lib/server/audit";
import { config } from "$lib/server/config";
import { loadOrganization } from "$lib/server/context";
import { formValues, isUuid, requiredText } from "$lib/server/http/forms";
import {
    AUTOMATION_SCOPES,
    automationTokenStatus,
    createAutomationToken,
    listAutomationTokens,
    revokeAutomationToken,
    type AutomationScope,
} from "$lib/server/integrations/automation";
import { integrationOrigin } from "$lib/server/integrations/oauth";
import { listOrganizationWorlds } from "$lib/server/services/worlds";

export const load: PageServerLoad = async ({ locals, params }) => {
    const { access } = await loadOrganization(locals, params.org, "integration.manage");
    const [tokens, worlds] = await Promise.all([
        listAutomationTokens(access.organization.id),
        listOrganizationWorlds(access.organization.id),
    ]);
    const origin = integrationOrigin();
    return {
        tokens: tokens.map(({ token, creator }) => ({
            id: token.id,
            name: token.name,
            prefix: token.tokenPrefix,
            scopes: token.scopes,
            creator,
            status: automationTokenStatus(token),
            createdAt: token.createdAt.toISOString(),
            lastUsedAt: token.lastUsedAt?.toISOString() ?? null,
            expiresAt: token.expiresAt?.toISOString() ?? null,
        })),
        scopes: [...AUTOMATION_SCOPES],
        baseUrl: `${origin ?? "https://adminspace.example.com"}/automation/v1`,
        originMissing: !origin,
        limit: config().RATE_LIMIT_AUTOMATION_PER_TOKEN,
        exampleWorld: worlds[0]?.slug ?? "office",
    };
};

const CreateForm = z.object({
    name: requiredText(200),
    expiresOn: z.union([z.literal(""), z.string().regex(/^\d{4}-\d{2}-\d{2}$/)]).optional(),
});

export const actions: Actions = {
    create: async ({ locals, params, request }) => {
        const { account, access } = await loadOrganization(locals, params.org, "integration.manage");
        const formData = await request.formData();
        const values = formValues(formData);
        const parsed = CreateForm.safeParse(values);
        if (!parsed.success) {
            return fail(400, { errors: { name: "requiredField" as const }, values, message: "validation" as const });
        }
        const scopes = AUTOMATION_SCOPES.filter((s) => formData.getAll("scopes").includes(s)) as AutomationScope[];
        if (scopes.length === 0) return fail(400, { values, noScope: true });
        // ISO 8601 calendar date; the token works until the end of that day, UTC.
        const expiresAt = parsed.data.expiresOn ? new Date(`${parsed.data.expiresOn}T23:59:59.999Z`) : null;
        if (expiresAt && expiresAt <= new Date()) {
            return fail(400, { errors: { expiresOn: "validation" as const }, values, message: "validation" as const });
        }
        const { row, token } = await createAutomationToken({
            organizationId: access.organization.id,
            name: parsed.data.name,
            scopes,
            expiresAt,
            createdBy: account.id,
        });
        await audit({
            action: "automationToken.create",
            account,
            organizationId: access.organization.id,
            targetType: "automationToken",
            targetId: row.id,
            ipAddress: locals.clientIp ?? null,
            details: { name: row.name, prefix: row.tokenPrefix, scopes, expiresAt: expiresAt?.toISOString() ?? null },
        });
        // Returned once: only its SHA-256 is stored.
        return { createdToken: token, createdName: row.name };
    },

    revoke: async ({ locals, params, request }) => {
        const { account, access } = await loadOrganization(locals, params.org, "integration.manage");
        const id = String(formValues(await request.formData()).id ?? "");
        const row = isUuid(id) ? await revokeAutomationToken(access.organization.id, id) : undefined;
        if (!row) return fail(404, { message: "notFound" as const });
        await audit({
            action: "automationToken.revoke",
            account,
            organizationId: access.organization.id,
            targetType: "automationToken",
            targetId: row.id,
            ipAddress: locals.clientIp ?? null,
            details: { prefix: row.tokenPrefix },
        });
        return { revoked: true };
    },
};
