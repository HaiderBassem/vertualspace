import type { RequestHandler } from "./$types";
import { dispatchAdminApi } from "$lib/server/adminApi/routes";

export const GET: RequestHandler = ({ request }) => dispatchAdminApi(request, undefined);
