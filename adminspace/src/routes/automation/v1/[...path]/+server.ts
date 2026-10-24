/** The automation API (Zapier, n8n, scripts): see src/lib/server/integrations/automation.ts and docs/INTEGRATIONS.md. */
import type { RequestHandler } from "./$types";
import { dispatchAutomationApi } from "$lib/server/integrations/automation";

const handle: RequestHandler = ({ request, getClientAddress }) => {
    let clientIp: string | undefined;
    try {
        clientIp = getClientAddress();
    } catch {
        clientIp = undefined;
    }
    return dispatchAutomationApi(request, clientIp);
};

export const GET = handle;
export const POST = handle;
export const PUT = handle;
export const DELETE = handle;
