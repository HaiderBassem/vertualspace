import type { RequestHandler } from "./$types";
import { audit } from "$lib/server/audit";
import { loadWorld } from "$lib/server/context";
import { problem } from "$lib/server/http/problem";
import { checkRateLimit } from "$lib/server/security/rateLimit";
import { attachmentHeader, escapeCsvCell } from "$lib/server/services/csv";
import { EXPORT_HEADER, exportRow, membersInBatches } from "$lib/server/services/memberAdmin";

/** Bulk exports of personal data, per account. */
const EXPORTS_PER_WINDOW = 10;
const WINDOW_SECONDS = 15 * 60;

function csvLine(cells: (string | number | null)[]): string {
    return cells.map(escapeCsvCell).join(",") + "\r\n";
}

/**
 * Downloads every member of the world, as CSV (RFC 4180, UTF-8 with BOM for spreadsheets) or JSON.
 * Personal data of the whole world: requires member.manage (viewers cannot bulk-export), is rate
 * limited, audited, and streamed in batches so large worlds use bounded memory.
 */
export const GET: RequestHandler = async ({ locals, params, url }) => {
    const { account, access, world } = await loadWorld(locals, params.org, params.world, "member.manage");
    const limit = await checkRateLimit(`export:members:${account.id}`, EXPORTS_PER_WINDOW, WINDOW_SECONDS);
    if (!limit.allowed) {
        return problem(
            {
                status: 429,
                title: "Too many exports",
                detail: "Bulk exports are limited per account. Try again later.",
            },
            { "retry-after": String(limit.retryAfterSec) },
        );
    }
    const format = url.searchParams.get("format") === "json" ? "json" : "csv";

    const date = new Date().toISOString().slice(0, 10);
    const filename = `members-${access.organization.slug}-${world.slug}-${date}.${format}`;
    const encoder = new TextEncoder();
    let exported = 0;

    const stream = new ReadableStream<Uint8Array>({
        async start(controller) {
            try {
                controller.enqueue(encoder.encode(format === "json" ? "[" : `\uFEFF${csvLine(EXPORT_HEADER)}`));
                for await (const batch of membersInBatches(world.id)) {
                    let chunk = "";
                    for (const member of batch) {
                        const cells = exportRow(member);
                        if (format === "json") {
                            const object = Object.fromEntries(EXPORT_HEADER.map((key, i) => [key, cells[i]]));
                            chunk += `${exported === 0 ? "\n" : ",\n"}${JSON.stringify(object)}`;
                        } else {
                            chunk += csvLine(cells);
                        }
                        exported++;
                    }
                    controller.enqueue(encoder.encode(chunk));
                }
                if (format === "json") controller.enqueue(encoder.encode("\n]\n"));
                controller.close();
                await audit({
                    action: "member.export",
                    account,
                    organizationId: access.organization.id,
                    worldId: world.id,
                    targetType: "world",
                    targetId: world.id,
                    ipAddress: locals.clientIp ?? null,
                    details: { format, count: exported },
                });
            } catch (error) {
                controller.error(error);
            }
        },
    });

    return new Response(stream, {
        headers: {
            "content-disposition": attachmentHeader(filename),
            "cache-control": "no-store",
            "content-type":
                format === "json" ? "application/json; charset=utf-8" : "text/csv; charset=utf-8; header=present",
        },
    });
};
