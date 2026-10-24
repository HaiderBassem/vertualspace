import { fail } from "@sveltejs/kit";
import { isIP } from "node:net";
import { z } from "zod";
import type { Actions, PageServerLoad } from "./$types";
import { audit } from "$lib/server/audit";
import { loadWorld } from "$lib/server/context";
import { formValues, isUuid, optionalText, pageParam, parseForm, requiredText } from "$lib/server/http/forms";
import { banFromBackOffice } from "$lib/server/services/banAdmin";
import { findMember } from "$lib/server/services/members";
import { listBans, revokeBan } from "$lib/server/services/moderation";

const PAGE_SIZE = 50;

export const load: PageServerLoad = async ({ locals, params, url }) => {
    const { world } = await loadWorld(locals, params.org, params.world, "member.read");
    const showAll = url.searchParams.get("status") === "all";
    const page = pageParam(url.searchParams.get("page"));
    const { rows, total } = await listBans(world.id, showAll, { page, pageSize: PAGE_SIZE });
    const now = new Date();
    return {
        showAll,
        page,
        pageSize: PAGE_SIZE,
        total,
        bans: rows.map((b) => ({
            id: b.id,
            memberUuid: b.memberUuid,
            name: b.name,
            ipAddress: b.ipAddress,
            reason: b.reason,
            bannedBy: b.bannedBy.startsWith("account:") ? null : b.bannedBy,
            createdAt: b.createdAt,
            expiresAt: b.expiresAt,
            status: b.revokedAt ? "revoked" : b.expiresAt && b.expiresAt <= now ? "expired" : "active",
        })),
    };
};

const BanForm = z.object({
    target: optionalText(320),
    ipAddress: optionalText(45),
    reason: requiredText(1000),
    duration: z.enum(["permanent", "hour", "day", "week", "month"]),
});

export const actions: Actions = {
    ban: async ({ locals, params, request }) => {
        const { account, access, world } = await loadWorld(locals, params.org, params.world, "moderation.manage");
        const formData = await request.formData();
        const parsed = parseForm(formData, BanForm);
        if (!parsed.ok) return parsed.failure;
        const { target, ipAddress, reason, duration } = parsed.data;
        if (!target && !ipAddress) {
            return fail(400, {
                targetRequired: true,
                errors: { target: "requiredField" as const },
                values: formValues(formData),
            });
        }
        if (ipAddress && !isIP(ipAddress)) {
            return fail(400, {
                errors: { ipAddress: "validation" as const },
                values: formValues(formData),
                invalidIp: true,
            });
        }
        const member = target ? await findMember(world.id, target) : undefined;
        const { liveDisconnect } = await banFromBackOffice({
            organization: access.organization,
            world,
            account,
            clientIp: locals.clientIp,
            memberUuid: member?.uuid ?? target ?? null,
            name: member?.name ?? member?.email ?? null,
            ipAddress: ipAddress ?? null,
            reason,
            duration,
        });
        return { success: true, op: "ban", liveDisconnect };
    },

    revoke: async ({ locals, params, request }) => {
        const { account, access, world } = await loadWorld(locals, params.org, params.world, "moderation.manage");
        const banId = (await request.formData()).get("banId");
        if (!isUuid(banId) || !(await revokeBan(world.id, banId, account.id))) {
            return fail(404, { message: "notFound" as const });
        }
        await audit({
            action: "ban.revoke",
            account,
            organizationId: access.organization.id,
            worldId: world.id,
            targetType: "ban",
            targetId: banId,
            ipAddress: locals.clientIp ?? null,
        });
        return { success: true, op: "revoke" };
    },
};
