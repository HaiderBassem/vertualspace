import { error, fail } from "@sveltejs/kit";
import { asc, eq } from "drizzle-orm";
import { z } from "zod";
import type { Actions, PageServerLoad } from "./$types";
import { audit } from "$lib/server/audit";
import { requireSuperadmin } from "$lib/server/auth/rbac";
import type { Account } from "$lib/server/auth/session";
import { requireAccount } from "$lib/server/context";
import { db, schema } from "$lib/server/db/client";
import { checkbox, parseForm, requiredText } from "$lib/server/http/forms";
import { getInstanceSettings } from "$lib/server/services/instance";

function superadmin(locals: App.Locals): Account {
    const account = requireAccount(locals);
    requireSuperadmin(account);
    return account;
}

const PARTS = schema.wokaPart.enumValues;
const BEHAVIORS = schema.companionBehavior.enumValues;

export const load: PageServerLoad = async ({ locals, url }) => {
    superadmin(locals);
    const [wokaCollections, wokaTextures, companionCollections, companionTextures, instance] = await Promise.all([
        db().query.wokaCollections.findMany({
            orderBy: [asc(schema.wokaCollections.part), asc(schema.wokaCollections.position)],
        }),
        db().query.wokaTextures.findMany({ orderBy: asc(schema.wokaTextures.position) }),
        db().query.companionCollections.findMany({ orderBy: asc(schema.companionCollections.position) }),
        db().query.companionTextures.findMany({ orderBy: asc(schema.companionTextures.position) }),
        getInstanceSettings(),
    ]);
    const edit = url.searchParams.get("edit") ?? "";
    return {
        parts: PARTS,
        behaviors: BEHAVIORS,
        playUrl: instance.playUrl ?? null,
        wokaCollections,
        wokaTextures,
        companionCollections,
        companionTextures,
        editing: edit.startsWith("woka:")
            ? { kind: "woka" as const, texture: wokaTextures.find((t) => t.id === edit.slice(5)) ?? null }
            : edit.startsWith("companion:")
              ? { kind: "companion" as const, texture: companionTextures.find((t) => t.id === edit.slice(10)) ?? null }
              : null,
    };
};

const textureId = z
    .string()
    .trim()
    .regex(/^[A-Za-z0-9_.-]{1,128}$/);
/** Absolute http(s) URL, or a relative URL resolved by WorkAdventure (resources/...). No other scheme. */
const textureUrl = z
    .string()
    .trim()
    .min(1)
    .max(2048)
    .refine((v) => /^https?:\/\//i.test(v) || !/^[a-z][a-z0-9+.-]*:/i.test(v), { message: "invalidUrl" });

const SaveWoka = z.object({
    originalId: z.string().optional(),
    id: textureId,
    name: requiredText(100),
    url: textureUrl,
    collectionId: z.string().uuid(),
    tintable: checkbox,
});
const SaveCompanion = z.object({
    originalId: z.string().optional(),
    id: textureId,
    name: requiredText(100),
    url: textureUrl,
    collectionId: z.string().uuid(),
    behavior: z.enum(["", ...BEHAVIORS]).transform((v) => (v === "" ? null : v)),
});

async function idFrom(request: Request): Promise<string> {
    const id = String((await request.formData()).get("id") ?? "");
    if (!textureId.safeParse(id).success) error(400, "Invalid identifier");
    return id;
}

function log(
    account: Account,
    locals: App.Locals,
    action: string,
    targetId: string,
    details?: Record<string, unknown>,
) {
    return audit({
        action,
        account,
        targetType: "texture",
        targetId,
        ipAddress: locals.clientIp ?? null,
        details,
    });
}

export const actions: Actions = {
    toggleWoka: async ({ request, locals }) => {
        const account = superadmin(locals);
        const id = await idFrom(request);
        const texture = await db().query.wokaTextures.findFirst({ where: eq(schema.wokaTextures.id, id) });
        if (!texture) return fail(404, { message: "notFound" as const });
        await db().update(schema.wokaTextures).set({ enabled: !texture.enabled }).where(eq(schema.wokaTextures.id, id));
        await log(account, locals, texture.enabled ? "catalog.woka.disable" : "catalog.woka.enable", id);
        return { success: true };
    },

    toggleCompanion: async ({ request, locals }) => {
        const account = superadmin(locals);
        const id = await idFrom(request);
        const texture = await db().query.companionTextures.findFirst({ where: eq(schema.companionTextures.id, id) });
        if (!texture) return fail(404, { message: "notFound" as const });
        await db()
            .update(schema.companionTextures)
            .set({ enabled: !texture.enabled })
            .where(eq(schema.companionTextures.id, id));
        await log(account, locals, texture.enabled ? "catalog.companion.disable" : "catalog.companion.enable", id);
        return { success: true };
    },

    saveWoka: async ({ request, locals }) => {
        const account = superadmin(locals);
        const parsed = parseForm(await request.formData(), SaveWoka);
        if (!parsed.ok) return parsed.failure;
        const { originalId, id, name, url, collectionId, tintable } = parsed.data;
        if (originalId) {
            // The identifier is stored by WorkAdventure for each player: it never changes.
            await db()
                .update(schema.wokaTextures)
                .set({ name, url, collectionId, tintable })
                .where(eq(schema.wokaTextures.id, originalId));
            await log(account, locals, "catalog.woka.update", originalId, { name, url });
        } else {
            const [row] = await db()
                .insert(schema.wokaTextures)
                .values({ id, name, url, collectionId, tintable, position: 1000 })
                .onConflictDoNothing()
                .returning();
            if (!row) return fail(400, { idTaken: true, values: { id, name, url }, errors: {} });
            await log(account, locals, "catalog.woka.create", id, { name, url });
        }
        return { success: true };
    },

    saveCompanion: async ({ request, locals }) => {
        const account = superadmin(locals);
        const parsed = parseForm(await request.formData(), SaveCompanion);
        if (!parsed.ok) return parsed.failure;
        const { originalId, id, name, url, collectionId, behavior } = parsed.data;
        if (originalId) {
            await db()
                .update(schema.companionTextures)
                .set({ name, url, collectionId, behavior })
                .where(eq(schema.companionTextures.id, originalId));
            await log(account, locals, "catalog.companion.update", originalId, { name, url });
        } else {
            const [row] = await db()
                .insert(schema.companionTextures)
                .values({ id, name, url, collectionId, behavior, position: 1000 })
                .onConflictDoNothing()
                .returning();
            if (!row) return fail(400, { idTaken: true, values: { id, name, url }, errors: {} });
            await log(account, locals, "catalog.companion.create", id, { name, url });
        }
        return { success: true };
    },

    deleteWoka: async ({ request, locals }) => {
        const account = superadmin(locals);
        const id = await idFrom(request);
        await db().delete(schema.wokaTextures).where(eq(schema.wokaTextures.id, id));
        await log(account, locals, "catalog.woka.delete", id);
        return { success: true };
    },

    deleteCompanion: async ({ request, locals }) => {
        const account = superadmin(locals);
        const id = await idFrom(request);
        await db().delete(schema.companionTextures).where(eq(schema.companionTextures.id, id));
        await log(account, locals, "catalog.companion.delete", id);
        return { success: true };
    },

    addCollection: async ({ request, locals }) => {
        const account = superadmin(locals);
        const form = await request.formData();
        const name = requiredText(100).safeParse(form.get("name"));
        const part = String(form.get("part") ?? "");
        if (!name.success) return fail(400, { message: "requiredField" as const });
        if (part === "companion") {
            await db()
                .insert(schema.companionCollections)
                .values({ name: name.data, position: 1000 })
                .onConflictDoNothing();
        } else {
            const woka = z.enum(PARTS).safeParse(part);
            if (!woka.success) return fail(400, { message: "validation" as const });
            await db()
                .insert(schema.wokaCollections)
                .values({ part: woka.data, name: name.data, position: 1000 })
                .onConflictDoNothing();
        }
        await audit({
            action: "catalog.collection.create",
            account,
            targetType: "collection",
            targetId: `${part}/${name.data}`,
            ipAddress: locals.clientIp ?? null,
        });
        return { success: true };
    },
};
