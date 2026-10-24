import { fail } from "@sveltejs/kit";
import { z } from "zod";
import type { Actions, PageServerLoad } from "./$types";
import { audit } from "$lib/server/audit";
import { loadWorld } from "$lib/server/context";
import { formValues, optionalText, parseForm } from "$lib/server/http/forms";
import {
    BUILT_IN_TAGS,
    createTag,
    deleteTag,
    listTagsWithCounts,
    TAG_NAME_PATTERN,
    updateTag,
} from "$lib/server/services/tags";

const TagForm = z.object({
    name: z.string().trim().min(1).max(64).regex(TAG_NAME_PATTERN),
    description: optionalText(500),
    color: z
        .string()
        .trim()
        .optional()
        .transform((v) => (v ? v : undefined))
        .pipe(
            z
                .string()
                .regex(/^#[0-9a-fA-F]{6}$/)
                .optional(),
        ),
});

export const load: PageServerLoad = async ({ locals, params }) => {
    const { world } = await loadWorld(locals, params.org, params.world, "member.read");
    return { tags: await listTagsWithCounts(world.id), builtIn: BUILT_IN_TAGS };
};

export const actions: Actions = {
    create: async ({ locals, params, request }) => {
        const { account, access, world } = await loadWorld(locals, params.org, params.world, "tag.manage");
        const formData = await request.formData();
        const parsed = parseForm(formData, TagForm);
        if (!parsed.ok) return parsed.failure;
        const tag = await createTag(world.id, parsed.data);
        if (tag === "nameTaken") {
            return fail(400, {
                errors: { name: "validation" as const },
                values: formValues(formData),
                nameTaken: true,
                op: "create",
            });
        }
        await audit({
            action: "tag.create",
            account,
            organizationId: access.organization.id,
            worldId: world.id,
            targetType: "tag",
            targetId: tag.id,
            ipAddress: locals.clientIp ?? null,
            details: { name: tag.name },
        });
        return { success: true, op: "create" };
    },

    update: async ({ locals, params, request }) => {
        const { account, access, world } = await loadWorld(locals, params.org, params.world, "tag.manage");
        const formData = await request.formData();
        const tagId = String(formData.get("tagId") ?? "");
        const parsed = parseForm(formData, TagForm);
        if (!parsed.ok) return parsed.failure;
        const result = await updateTag(world.id, tagId, parsed.data);
        if (result === "notFound") return fail(404, { message: "notFound" as const });
        if (result === "nameTaken") {
            return fail(400, {
                errors: { name: "validation" as const },
                values: formValues(formData),
                nameTaken: true,
                op: `update:${tagId}`,
            });
        }
        await audit({
            action: "tag.update",
            account,
            organizationId: access.organization.id,
            worldId: world.id,
            targetType: "tag",
            targetId: tagId,
            ipAddress: locals.clientIp ?? null,
            details: { from: result.before.name, to: result.after.name },
        });
        return { success: true, op: "update" };
    },

    delete: async ({ locals, params, request }) => {
        const { account, access, world } = await loadWorld(locals, params.org, params.world, "tag.manage");
        const deleted = await deleteTag(world.id, String((await request.formData()).get("tagId") ?? ""));
        if (!deleted) return fail(404, { message: "notFound" as const });
        await audit({
            action: "tag.delete",
            account,
            organizationId: access.organization.id,
            worldId: world.id,
            targetType: "tag",
            targetId: deleted.id,
            ipAddress: locals.clientIp ?? null,
            details: { name: deleted.name },
        });
        return { success: true, op: "delete" };
    },
};
