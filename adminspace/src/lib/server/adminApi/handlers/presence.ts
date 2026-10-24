/**
 * POST /api/presence/report: each WorkAdventure pusher sends the full list of the people connected to it (contract
 * PresenceReportData of WorkAdventure, libs/messages, vendored in src/lib/contract/workadventure), a few seconds after
 * any join, leave or status change and at least every ttlSeconds / 3. Advertised in /api/capabilities as
 * "api/presence/report": "v1". Documented in docs/ADMIN_API.md and docs/PRESENCE.md.
 *
 * 204 when stored (or ignored as older than the pusher's last report), 400 for a body the contract refuses, 413 for a
 * body or a list too large to be a real report.
 */
import { isPresenceReportData } from "../../../contract/workadventure";
import { MAX_INSTANCE_ID_LENGTH, MAX_REPORT_BYTES, MAX_REPORT_USERS } from "../../../presence/model";
import { json, noContent } from "../../http/problem";
import { storePresenceReport } from "../../services/presence";
import { isBodyTooLarge, PayloadTooLargeError, type ApiContext } from "../router";

function invalid(): Response {
    return json({ status: "error", message: "Invalid presence report" }, { status: 400 });
}

function tooLarge(): Response {
    return json({ status: "error", message: "Presence report too large" }, { status: 413 });
}

/** The body as text, refused above MAX_REPORT_BYTES whether or not the pusher declared its length. */
async function readBody(request: Request): Promise<string | "tooLarge"> {
    const declared = Number(request.headers.get("content-length") ?? "");
    if (Number.isFinite(declared) && declared > MAX_REPORT_BYTES) return "tooLarge";
    let text: string;
    try {
        text = await request.text();
    } catch (error) {
        if (isBodyTooLarge(error)) throw new PayloadTooLargeError();
        return "";
    }
    return text.length > MAX_REPORT_BYTES ? "tooLarge" : text;
}

export async function postPresenceReport({ request }: ApiContext): Promise<Response> {
    const text = await readBody(request);
    if (text === "tooLarge") return tooLarge();
    let body: unknown;
    try {
        body = JSON.parse(text);
    } catch {
        return invalid();
    }
    // Counted before parsing every entry: a huge list is refused without validating it.
    const users = (body as { users?: unknown } | null)?.users;
    if (Array.isArray(users) && users.length > MAX_REPORT_USERS) return tooLarge();
    const report = isPresenceReportData.safeParse(body);
    if (!report.success) return invalid();
    const { instanceId, reportedAt } = report.data;
    if (!instanceId || instanceId.length > MAX_INSTANCE_ID_LENGTH || Number.isNaN(Date.parse(reportedAt))) {
        return invalid();
    }
    await storePresenceReport(report.data);
    return noContent();
}
