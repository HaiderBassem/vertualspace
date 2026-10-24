/**
 * Shared by the "Who's in" page and its JSON endpoint: who may see it (presence.view, organization-wide or in at least
 * one workspace; each world is then shown only to people holding it in the world's workspace) and the view itself.
 */
import { error } from "@sveltejs/kit";
import { loadOrganization } from "$lib/server/context";
import { organizationPresence } from "$lib/server/services/presence";
import type { PresenceView } from "$lib/presence/model";

export async function loadPresence(locals: App.Locals, organizationSlug: string): Promise<PresenceView> {
    const { access } = await loadOrganization(locals, organizationSlug, "organization.read");
    if (!access.canSomewhere("presence.view")) error(403, "Forbidden");
    return organizationPresence(access, new Date(), locals.locale);
}
