/** GitHub webhook receiver of an organization (X-Hub-Signature-256), see integrations/inbound.ts. */
import type { RequestHandler } from "./$types";
import { handleGithubWebhook } from "$lib/server/integrations/inbound";

export const POST: RequestHandler = ({ request, params }) => handleGithubWebhook(request, params.receiver);
