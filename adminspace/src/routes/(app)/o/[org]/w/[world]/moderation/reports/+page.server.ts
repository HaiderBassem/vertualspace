import { error, fail } from "@sveltejs/kit";
import { and, eq, inArray } from "drizzle-orm";
import type { Actions, PageServerLoad } from "./$types";
import { messagesFor, format } from "$lib/i18n";
import { audit } from "$lib/server/audit";
import { loadWorld } from "$lib/server/context";
import { db, schema } from "$lib/server/db/client";
import { isUuid, optionalText, pageParam } from "$lib/server/http/forms";
import { banFromBackOffice } from "$lib/server/services/banAdmin";
import { findMember } from "$lib/server/services/members";
import { listReports, setReportStatus, type ReportStatus } from "$lib/server/services/moderation";

const FILTERS = ["open", "resolved", "dismissed", "all"] as const;
type Filter = (typeof FILTERS)[number];
const PAGE_SIZE = 50;

export const load: PageServerLoad = async ({ locals, params, url }) => {
    const { world } = await loadWorld(locals, params.org, params.world, "member.read");
    const requested = url.searchParams.get("status");
    const filter: Filter = FILTERS.includes(requested as Filter) ? (requested as Filter) : "open";
    const page = pageParam(url.searchParams.get("page"));
    const { rows: reports, total } = await listReports(world.id, filter, { page, pageSize: PAGE_SIZE });

    // Names of the people involved, when they are known in the world.
    const uuids = [...new Set(reports.flatMap((r) => [r.reportedUuid, r.reporterUuid]))];
    const members =
        uuids.length > 0
            ? await db().query.members.findMany({
                  where: and(eq(schema.members.worldId, world.id), inArray(schema.members.uuid, uuids)),
              })
            : [];
    const byUuid = new Map(members.map((m) => [m.uuid, { id: m.id, label: m.name ?? m.email ?? m.uuid }]));

    return {
        filter,
        page,
        pageSize: PAGE_SIZE,
        total,
        reports: reports.map((r) => ({
            id: r.id,
            roomUrl: r.roomUrl,
            comment: r.comment,
            status: r.status,
            resolutionNote: r.resolutionNote,
            handledAt: r.handledAt,
            createdAt: r.createdAt,
            reported: { uuid: r.reportedUuid, member: byUuid.get(r.reportedUuid) ?? null },
            reporter: { uuid: r.reporterUuid, member: byUuid.get(r.reporterUuid) ?? null },
        })),
    };
};

type ActionEvent = Parameters<Actions[string]>[0];

async function updateStatus({ locals, params, request }: ActionEvent, status: ReportStatus) {
    const { account, access, world } = await loadWorld(locals, params.org, params.world, "moderation.manage");
    const formData = await request.formData();
    const reportId = String(formData.get("reportId") ?? "");
    const note = optionalText(2000).safeParse(formData.get("note") ?? undefined);
    const ok = await setReportStatus(world.id, reportId, status, account.id, note.success ? (note.data ?? null) : null);
    if (!ok) return fail(404, { message: "notFound" as const });
    await audit({
        action: `report.${status === "open" ? "reopen" : status === "resolved" ? "resolve" : "dismiss"}`,
        account,
        organizationId: access.organization.id,
        worldId: world.id,
        targetType: "report",
        targetId: reportId,
        ipAddress: locals.clientIp ?? null,
    });
    return { success: true, op: status };
}

export const actions: Actions = {
    resolve: (event) => updateStatus(event, "resolved"),
    dismiss: (event) => updateStatus(event, "dismissed"),
    reopen: (event) => updateStatus(event, "open"),

    banReported: async ({ locals, params, request }) => {
        const { account, access, world } = await loadWorld(locals, params.org, params.world, "moderation.manage");
        const reportId = (await request.formData()).get("reportId");
        if (!isUuid(reportId)) error(404, "Not found");
        const report = await db().query.reports.findFirst({
            where: and(eq(schema.reports.worldId, world.id), eq(schema.reports.id, reportId)),
        });
        if (!report) error(404, "Not found");
        const member = await findMember(world.id, report.reportedUuid);
        const m = messagesFor(locals.locale).moderation.reports;
        const { liveDisconnect } = await banFromBackOffice({
            organization: access.organization,
            world,
            account,
            clientIp: locals.clientIp,
            memberUuid: member?.uuid ?? report.reportedUuid,
            name: member?.name ?? member?.email ?? null,
            ipAddress: null,
            reason: format(m.banReason, { comment: report.comment.slice(0, 300) }, locals.locale),
            duration: "permanent",
        });
        await setReportStatus(world.id, report.id, "resolved", account.id, report.resolutionNote);
        return { success: true, op: "ban", liveDisconnect };
    },
};
