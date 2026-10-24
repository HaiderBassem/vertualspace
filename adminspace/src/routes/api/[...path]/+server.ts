import type { RequestHandler } from "./$types";
import { dispatchAdminApi } from "$lib/server/adminApi/routes";

const handle: RequestHandler = ({ request, getClientAddress }) => {
    let clientIp: string | undefined;
    try {
        clientIp = getClientAddress();
    } catch {
        clientIp = undefined;
    }
    return dispatchAdminApi(request, clientIp);
};

export const GET = handle;
export const POST = handle;
export const PUT = handle;
