import { fail } from "@sveltejs/kit";
import { z } from "zod";
import type { Actions, PageServerLoad } from "./$types";
import { audit } from "$lib/server/audit";
import { loadOrganization } from "$lib/server/context";
import { formError, parseForm, requiredText } from "$lib/server/http/forms";
import { createRoomApiKey, listRoomApiKeys, revokeRoomApiKey, roomApiKeyStatus } from "$lib/server/services/apiKeys";
import { listOrganizationWorlds } from "$lib/server/services/worlds";

export const load: PageServerLoad = async ({ locals, params }) => {
    const { access } = await loadOrganization(locals, params.org, "apiKey.manage");
    const [keys, worlds] = await Promise.all([
        listRoomApiKeys(access.organization.id),
        listOrganizationWorlds(access.organization.id, true),
    ]);
    return {
        keys: keys.map(({ key, worldName }) => ({
            id: key.id,
            name: key.name,
            prefix: key.keyPrefix,
            worldName,
            status: roomApiKeyStatus(key),
            createdAt: key.createdAt.toISOString(),
            lastUsedAt: key.lastUsedAt?.toISOString() ?? null,
            expiresAt: key.expiresAt?.toISOString() ?? null,
        })),
        worlds: worlds.map((w) => ({ id: w.id, name: w.name })),
    };
};

const CreateKey = z.object({
    name: requiredText(200),
    worldId: z.union([z.literal(""), z.string().uuid()]).optional(),
    expiresOn: z.union([z.literal(""), z.string().regex(/^\d{4}-\d{2}-\d{2}$/)]).optional(),
});

export const actions: Actions = {
    create: async ({ request, locals, params }) => {
        const { account, access } = await loadOrganization(locals, params.org, "apiKey.manage");
        const parsed = parseForm(await request.formData(), CreateKey);
        if (!parsed.ok) return parsed.failure;
        const { name, worldId, expiresOn } = parsed.data;

        if (worldId) {
            const worlds = await listOrganizationWorlds(access.organization.id, true);
            if (!worlds.some((w) => w.id === worldId)) {
                return formError({ name }, "validation", "worldId");
            }
        }
        // ISO 8601 calendar date; the key works until the end of that day, UTC.
        const expiresAt = expiresOn ? new Date(`${expiresOn}T23:59:59.999Z`) : null;
        const { row, key } = await createRoomApiKey({
            organizationId: access.organization.id,
            worldId: worldId || null,
            name,
            expiresAt,
            createdBy: account.id,
        });
        await audit({
            action: "apiKey.create",
            account,
            organizationId: access.organization.id,
            worldId: row.worldId,
            targetType: "roomApiKey",
            targetId: row.id,
            ipAddress: locals.clientIp ?? null,
            details: { name, prefix: row.keyPrefix, expiresAt: expiresAt?.toISOString() ?? null },
        });
        // Returned once: it is not stored anywhere in clear.
        return { createdKey: key, createdName: name };
    },

    revoke: async ({ request, locals, params }) => {
        const { account, access } = await loadOrganization(locals, params.org, "apiKey.manage");
        const id = String((await request.formData()).get("id") ?? "");
        const row = z.string().uuid().safeParse(id).success
            ? await revokeRoomApiKey(access.organization.id, id)
            : undefined;
        if (!row) return fail(404, { message: "generic" as const });
        await audit({
            action: "apiKey.revoke",
            account,
            organizationId: access.organization.id,
            worldId: row.worldId,
            targetType: "roomApiKey",
            targetId: row.id,
            ipAddress: locals.clientIp ?? null,
            details: { prefix: row.keyPrefix },
        });
        return { revoked: true };
    },
};
