/** GitLab webhook receiver of an organization (X-Gitlab-Token), see integrations/inbound.ts. */
import type { RequestHandler } from "./$types";
import { handleGitlabWebhook } from "$lib/server/integrations/inbound";

export const POST: RequestHandler = ({ request, params }) => handleGitlabWebhook(request, params.receiver);
