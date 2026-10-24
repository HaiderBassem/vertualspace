/**
 * Room sizes of many rooms at once, at organization level (every workspace) or for one workspace (?workspace=slug):
 * pick rooms, choose a target (exact size, or grow / shrink by N tiles), preview with map-storage dry runs, apply as
 * background jobs, then follow the per-room results (?batch=id). Each room needs room.manage in its workspace.
 */
import { error, fail, redirect } from "@sveltejs/kit";
import { z } from "zod";
import type { Actions, PageServerLoad } from "./$types";
import { audit } from "$lib/server/audit";
import type { OrganizationAccess } from "$lib/server/auth/rbac";
import { loadOrganization } from "$lib/server/context";
import { isUuid } from "$lib/server/http/forms";
import { retryJob } from "$lib/server/services/jobs";
import { findWorkspace, listWorkspaces } from "$lib/server/services/workspaces";
import {
    applyBulkResize,
    bulkResults,
    bulkTree,
    MAX_BULK_ROOMS,
    previewBulkResize,
    resizeJobWorld,
} from "$lib/server/services/bulkResize";
import {
    MAX_ROOM_TILES,
    MIN_ROOM_TILES,
    RESIZE_ANCHORS,
    RESIZE_FILLS,
    ROOM_SIZE_PRESET_KEYS,
    presetSize,
    type RoomSizePresetKey,
    type SizeTarget,
} from "$lib/rooms/size";

function requireBulkAccess(access: OrganizationAccess): void {
    if (!access.canSomewhere("room.manage")) error(403, "Forbidden");
}

/** The workspace of ?workspace=slug, when the person may manage its rooms (404 otherwise). */
async function scopedWorkspace(access: OrganizationAccess, slug: string | null) {
    if (!slug) return undefined;
    const workspace = await findWorkspace(access.organization.id, slug);
    if (!workspace || !access.can("room.manage", { workspaceId: workspace.id })) error(404, "Not found");
    return workspace;
}

export const load: PageServerLoad = async ({ locals, params, url }) => {
    const { access } = await loadOrganization(locals, params.org, "organization.read");
    requireBulkAccess(access);
    const workspace = await scopedWorkspace(access, url.searchParams.get("workspace"));
    const batchId = url.searchParams.get("batch");
    const [tree, scopes, results] = await Promise.all([
        bulkTree(access, workspace?.id),
        listWorkspaces(access.organization.id),
        batchId ? bulkResults(access, batchId) : undefined,
    ]);
    return {
        tree,
        scope: workspace ? { id: workspace.id, slug: workspace.slug, name: workspace.name } : null,
        scopes: scopes
            .filter((w) => access.can("room.manage", { workspaceId: w.id }))
            .map((w) => ({ slug: w.slug, name: w.name })),
        batch: batchId ? { id: batchId, results: results ?? null } : null,
        maxRooms: MAX_BULK_ROOMS,
    };
};

const tiles = z.coerce.number().int().min(MIN_ROOM_TILES).max(MAX_ROOM_TILES);
const PreviewForm = z
    .object({
        mode: z.enum(["exact", "grow", "shrink"]),
        sizeChoice: z.enum(["custom", ...ROOM_SIZE_PRESET_KEYS] as [string, ...string[]]).default("custom"),
        width: tiles.optional(),
        height: tiles.optional(),
        tiles: z.coerce.number().int().min(1).max(MAX_ROOM_TILES).optional(),
        anchor: z.enum(RESIZE_ANCHORS),
        fill: z.enum(RESIZE_FILLS),
    })
    .superRefine((value, ctx) => {
        if (value.mode === "exact" && value.sizeChoice === "custom" && (!value.width || !value.height)) {
            ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["width"] });
        }
        if (value.mode !== "exact" && !value.tiles) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["tiles"] });
    });

function targetOf(form: z.infer<typeof PreviewForm>): SizeTarget {
    if (form.mode === "grow") return { mode: "grow", tiles: form.tiles! };
    if (form.mode === "shrink") return { mode: "shrink", tiles: form.tiles! };
    const size =
        form.sizeChoice === "custom"
            ? { width: form.width!, height: form.height! }
            : presetSize(form.sizeChoice as RoomSizePresetKey);
    return { mode: "exact", ...size };
}

const ApplyForm = z.object({
    items: z.string().max(MAX_BULK_ROOMS * 50),
    anchor: z.enum(RESIZE_ANCHORS),
    fill: z.enum(RESIZE_FILLS),
    /** The workspace the page was scoped to, kept for the results page. */
    workspace: z.string().max(64).optional(),
});

/** "roomId:width:height,…" as posted by the preview table. */
function parseItems(raw: string): { roomId: string; width: number; height: number }[] {
    return raw
        .split(",")
        .map((item) => item.trim().split(":"))
        .flatMap(([roomId, width, height]) => {
            const parsed = z
                .object({ roomId: z.string().refine(isUuid), width: tiles, height: tiles })
                .safeParse({ roomId, width, height });
            return parsed.success ? [parsed.data] : [];
        });
}

function textValues(formData: FormData): Record<string, string> {
    const values: Record<string, string> = {};
    for (const [key, value] of formData.entries()) if (typeof value === "string" && key !== "room") values[key] = value;
    return values;
}

export const actions: Actions = {
    preview: async ({ locals, params, request }) => {
        const { access } = await loadOrganization(locals, params.org, "organization.read");
        requireBulkAccess(access);
        const formData = await request.formData();
        const roomIds = formData.getAll("room").map(String);
        const values = textValues(formData);
        const parsed = PreviewForm.safeParse(values);
        if (!parsed.success) return fail(400, { op: "preview" as const, bulkError: "validation" as const, roomIds });
        if (roomIds.length === 0) return fail(400, { op: "preview" as const, bulkError: "noRooms" as const, roomIds });
        if (roomIds.length > MAX_BULK_ROOMS) {
            return fail(400, { op: "preview" as const, bulkError: "tooMany" as const, roomIds });
        }
        const rows = await previewBulkResize(
            access,
            roomIds,
            targetOf(parsed.data),
            parsed.data.anchor,
            parsed.data.fill,
        );
        return { op: "preview" as const, preview: rows, anchor: parsed.data.anchor, fill: parsed.data.fill, roomIds };
    },

    apply: async ({ locals, params, request }) => {
        const { account, access } = await loadOrganization(locals, params.org, "organization.read");
        requireBulkAccess(access);
        const parsed = ApplyForm.safeParse(textValues(await request.formData()));
        if (!parsed.success) return fail(400, { op: "apply" as const, bulkError: "validation" as const });
        const items = parseItems(parsed.data.items);
        if (items.length === 0) return fail(400, { op: "apply" as const, bulkError: "noRooms" as const });
        if (items.length > MAX_BULK_ROOMS) return fail(400, { op: "apply" as const, bulkError: "tooMany" as const });
        const batch = await applyBulkResize(access, account.id, items, parsed.data.anchor, parsed.data.fill);
        if (!batch) return fail(400, { op: "apply" as const, bulkError: "noRooms" as const });
        await audit({
            action: "room.resize_bulk",
            account,
            organizationId: access.organization.id,
            targetType: "batch",
            targetId: batch.batchId,
            ipAddress: locals.clientIp ?? null,
            details: {
                rooms: batch.rooms,
                sizes: Object.fromEntries(items.map((i) => [i.roomId, `${i.width}x${i.height}`])),
                anchor: parsed.data.anchor,
                fill: parsed.data.fill,
            },
        });
        const query = new URLSearchParams({ batch: batch.batchId });
        if (parsed.data.workspace) query.set("workspace", parsed.data.workspace);
        redirect(303, `/o/${access.organization.slug}/room-sizes?${query.toString()}`);
    },

    retry: async ({ locals, params, request }) => {
        const { account, access } = await loadOrganization(locals, params.org, "organization.read");
        requireBulkAccess(access);
        const jobId = String((await request.formData()).get("jobId") ?? "");
        const world = await resizeJobWorld(access.organization.id, jobId);
        if (!world || !access.can("room.manage", { workspaceId: world.workspaceId })) {
            return fail(404, { op: "retry" as const, message: "notFound" as const });
        }
        if (!(await retryJob(jobId, access.organization.id))) {
            return fail(404, { op: "retry" as const, message: "notFound" as const });
        }
        await audit({
            action: "room.resize_retry",
            account,
            organizationId: access.organization.id,
            worldId: world.id,
            targetType: "job",
            targetId: jobId,
            ipAddress: locals.clientIp ?? null,
        });
        return { op: "retry" as const, retried: true };
    },
};
