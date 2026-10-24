import { fail } from "@sveltejs/kit";
import type { Actions, PageServerLoad } from "./$types";
import { audit } from "$lib/server/audit";
import { requireSuperadmin } from "$lib/server/auth/rbac";
import { requireAccount } from "$lib/server/context";
import { dispatchGlobalEvent, PusherUnavailableError } from "$lib/server/services/pusher";
import { platformOverview } from "$lib/server/services/platformOverview";
import { retentionStatus } from "$lib/server/services/retention";
import { systemStatus } from "$lib/server/services/systemStatus";

const EVENT_NAME = /^[A-Za-z0-9_.:-]{1,100}$/;
const MAX_DATA_BYTES = 10_000;

export const load: PageServerLoad = async ({ locals }) => {
    requireSuperadmin(requireAccount(locals));
    const retention = retentionStatus();
    // The error message of a failed run is English server detail: it stays in the server log.
    const [status, overview] = await Promise.all([systemStatus(), platformOverview()]);
    return {
        status,
        overview,
        retention: retention
            ? { lastRunAt: retention.lastRunAt, ok: retention.ok, report: retention.report ?? null }
            : null,
    };
};

export const actions: Actions = {
    /** Sends a scripting API event to every room of the instance, through the pusher (POST /global/event). */
    globalEvent: async ({ request, locals }) => {
        const account = requireAccount(locals);
        requireSuperadmin(account);
        const form = await request.formData();
        const name = String(form.get("name") ?? "")
            .trim()
            .slice(0, 200);
        const rawData = String(form.get("data") ?? "").trim();
        if (!EVENT_NAME.test(name)) return fail(400, { eventError: "invalidName" as const, name, data: rawData });
        if (rawData.length > MAX_DATA_BYTES) {
            return fail(400, { eventError: "invalidData" as const, name, data: rawData.slice(0, MAX_DATA_BYTES) });
        }
        let data: unknown = null;
        if (rawData) {
            try {
                data = JSON.parse(rawData);
            } catch {
                return fail(400, { eventError: "invalidData" as const, name, data: rawData });
            }
        }

        let outcome: "sent" | "unreachable" = "sent";
        try {
            await dispatchGlobalEvent(name, data);
        } catch (error) {
            if (!(error instanceof PusherUnavailableError)) throw error;
            outcome = "unreachable";
        }
        await audit({
            action: "instance.global_event",
            account,
            targetType: "instance",
            ipAddress: locals.clientIp ?? null,
            details: { name, outcome },
        });
        if (outcome === "unreachable") return fail(502, { eventError: "unreachable" as const, name, data: rawData });
        return { eventSent: true };
    },
};
