import { fail } from "@sveltejs/kit";
import { z } from "zod";
import type { Actions, PageServerLoad } from "./$types";
import { audit } from "$lib/server/audit";
import { loadWorld } from "$lib/server/context";
import { list, optionalText, pageParam, parseForm } from "$lib/server/http/forms";
import { IMPORT_MAX_BYTES, parseMemberImport, type ImportErrorCode } from "$lib/server/services/csv";
import {
    createMember,
    importMembers,
    listMembers,
    tagPolicyFor,
    type MemberKind,
} from "$lib/server/services/memberAdmin";
import { worldTagNames } from "$lib/server/services/members";
import { organizationDepartments } from "$lib/server/services/memberProfiles";
import { onlineIdentifiers } from "$lib/server/services/presence";

const PAGE_SIZE = 50;

const PROFILE_IMPORT_ERRORS = new Set<ImportErrorCode>(["managerNotFound", "managerIsSelf", "managerCycle"]);

export const load: PageServerLoad = async ({ locals, params, url }) => {
    const { world, access } = await loadWorld(locals, params.org, params.world, "member.read");
    const search = url.searchParams.get("q")?.trim().slice(0, 200) ?? "";
    const kindParam = url.searchParams.get("kind");
    const kind: MemberKind | undefined = kindParam === "member" || kindParam === "guest" ? kindParam : undefined;
    const tag = url.searchParams.get("tag")?.trim().slice(0, 64) || undefined;
    const department = url.searchParams.get("department")?.trim().slice(0, 200) || undefined;
    const page = pageParam(url.searchParams.get("page"));

    const [{ rows, total }, tagNames, departments] = await Promise.all([
        listMembers(world.id, { search, kind, tag, department, page, pageSize: PAGE_SIZE }),
        worldTagNames(world.id),
        organizationDepartments(access.organization.id),
    ]);
    // "Online now" (docs/PRESENCE.md), for people allowed to see who is in: one query for the whole page.
    const showPresence = access.can("presence.view");
    const online = showPresence
        ? await onlineIdentifiers(
              world.id,
              rows.flatMap((m) => [m.uuid, ...(m.email ? [m.email] : [])]),
          )
        : new Set<string>();
    return {
        members: rows.map((m) => ({
            id: m.id,
            uuid: m.uuid,
            kind: m.kind,
            email: m.email,
            name: m.name,
            tags: m.tags,
            visitCount: m.visitCount,
            lastSeenAt: m.lastSeenAt,
            jobTitle: m.profile?.jobTitle ?? null,
            department: m.profile?.department ?? null,
            online: online.has(m.uuid.toLowerCase()) || (m.email !== null && online.has(m.email.toLowerCase())),
        })),
        total,
        page,
        pageSize: PAGE_SIZE,
        filters: { search, kind: kind ?? "", tag: tag ?? "", department: department ?? "" },
        tagNames,
        departments,
        showPresence,
    };
};

const AddMember = z.object({
    email: z.string().trim().email().max(320),
    name: optionalText(200),
    tags: list,
});

export const actions: Actions = {
    add: async ({ locals, params, request }) => {
        const { account, access, world } = await loadWorld(locals, params.org, params.world, "member.manage");
        const parsed = parseForm(await request.formData(), AddMember);
        if (!parsed.ok) return parsed.failure;
        const policy = await tagPolicyFor(world, access.can("tag.manage"));
        const result = await createMember(world.id, parsed.data, policy);
        if (result.status === "tagRefused") {
            return fail(400, { op: "add", tagError: result.error, values: { email: parsed.data.email } });
        }
        if (result.status === "alreadyMember") {
            return fail(400, { op: "add", alreadyMember: true, values: { email: parsed.data.email } });
        }
        await audit({
            action: result.status === "created" ? "member.create" : "member.promote",
            account,
            organizationId: access.organization.id,
            worldId: world.id,
            targetType: "member",
            targetId: result.member.uuid,
            ipAddress: locals.clientIp ?? null,
            details: { tags: parsed.data.tags },
        });
        return { success: true, op: "add", promoted: result.status === "promoted" };
    },

    import: async ({ locals, params, request }) => {
        const { account, access, world } = await loadWorld(locals, params.org, params.world, "member.manage");
        const file = (await request.formData()).get("file");
        if (!(file instanceof File) || file.size === 0) {
            return fail(400, { op: "import", importErrors: [{ line: 1, code: "emptyFile" as const }] });
        }
        if (file.size > IMPORT_MAX_BYTES) {
            return fail(400, { op: "import", importErrors: [{ line: 1, code: "fileTooLarge" as const }] });
        }
        const parsed = parseMemberImport(await file.text());
        const policy = await tagPolicyFor(world, access.can("tag.manage"));
        const { summary, errors: policyErrors } = await importMembers(world.id, parsed.rows, policy, account.id);
        const errors = [...parsed.errors, ...policyErrors].sort((a, b) => a.line - b.line);
        // A refused manager keeps the line's member row (only its profile columns are left out): not "skipped".
        const skipped = errors.filter((e) => !PROFILE_IMPORT_ERRORS.has(e.code)).length;
        await audit({
            action: "member.import",
            account,
            organizationId: access.organization.id,
            worldId: world.id,
            targetType: "world",
            targetId: world.id,
            ipAddress: locals.clientIp ?? null,
            details: { ...summary, skipped, profileErrors: errors.length - skipped },
        });
        return {
            op: "import",
            importSummary: { ...summary, skipped },
            importErrors: errors.slice(0, 50),
            importErrorsTotal: errors.length,
        };
    },
};
