import { error } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { audit } from "$lib/server/audit";
import { loadWorld } from "$lib/server/context";
import { attachmentHeader } from "$lib/server/services/csv";
import { getMember, memberDataExport } from "$lib/server/services/memberAdmin";

/** Right of access (GDPR art. 15): everything stored about one person in this world, as JSON. */
export const GET: RequestHandler = async ({ locals, params }) => {
    const { account, access, world } = await loadWorld(locals, params.org, params.world, "member.manage");
    const member = await getMember(world.id, params.memberId);
    if (!member) error(404, "Not found");
    const data = await memberDataExport(world, member);
    await audit({
        action: "member.data_export",
        account,
        organizationId: access.organization.id,
        worldId: world.id,
        targetType: "member",
        targetId: member.uuid,
        ipAddress: locals.clientIp ?? null,
    });
    return new Response(JSON.stringify(data, null, 2), {
        headers: {
            "content-type": "application/json; charset=utf-8",
            "content-disposition": attachmentHeader(`personal-data-${world.slug}-${member.id}.json`),
            "cache-control": "no-store",
        },
    });
};
