/**
 * My integrations: each person connects their own accounts (calendar, GitHub/GitLab, Spotify, Slack status) for
 * themselves, in this organization. Every query names the session's own account: nobody reaches another person's
 * connection from here, administrators included.
 */
import { error, fail, redirect } from "@sveltejs/kit";
import { z } from "zod";
import type { Actions, PageServerLoad } from "./$types";
import { messagesFor } from "$lib/i18n";
import { audit } from "$lib/server/audit";
import { loadOrganization } from "$lib/server/context";
import { formValues } from "$lib/server/http/forms";
import {
    connectionView,
    disconnectConnection,
    personalConnection,
    personalConnections,
    startConnection,
    testConnection,
    updatePersonalSettings,
    type CallbackProblem,
} from "$lib/server/integrations/connections";
import {
    CALENDAR_PROVIDERS,
    PROVIDERS,
    isModeAvailable,
    isProviderId,
    providerById,
} from "$lib/server/integrations/registry";
import type { ProviderDefinition, ProviderId } from "$lib/server/integrations/types";
import { CALENDAR_SHARING } from "$lib/settings/integrationSettings";

/** Personal providers, in the order of the page: calendars, code, music, chat. */
const ORDER: ProviderId[] = ["google", "microsoft", "github", "gitlab", "spotify", "slack"];
const CALLBACK_PROBLEMS: readonly CallbackProblem[] = [
    "invalidState",
    "denied",
    "notAllowed",
    "scopeMissing",
    "notConfigured",
    "rejected",
    "unavailable",
];

function personalProvider(value: unknown): ProviderDefinition {
    if (!isProviderId(value)) error(404, "Not found");
    const provider = providerById(value);
    if (!provider.personal) error(404, "Not found");
    return provider;
}

export const load: PageServerLoad = async ({ locals, params, url }) => {
    const { account, access } = await loadOrganization(locals, params.org, "integration.personal");
    const connections = await personalConnections(access.organization.id, account.id);
    const providers = ORDER.map((id) => PROVIDERS.find((p) => p.id === id)!).filter((p) => p.personal);
    const problem = url.searchParams.get("problem");
    const connected = url.searchParams.get("connected");
    return {
        providers: providers.map((provider) => {
            const connection = connections.find((c) => c.provider === provider.id);
            return {
                id: provider.id,
                available: isModeAvailable(provider, "personal"),
                scopes: provider.personal?.scopes ?? [],
                connection: connection ? connectionView(connection) : null,
                manageAccessUrl: provider.manageAccessUrl ?? null,
            };
        }),
        hasCalendar: connections.some(
            (c) => (CALENDAR_PROVIDERS as readonly string[]).includes(c.provider) && c.status === "connected",
        ),
        flash: {
            connected: isProviderId(connected) ? connected : null,
            problem: CALLBACK_PROBLEMS.find((p) => p === problem) ?? null,
        },
    };
};

const SettingsForm = z.object({
    provider: z.string(),
    calendarSharing: z.enum(CALENDAR_SHARING).optional(),
    shareActivity: z.string().optional(),
    shareMusic: z.string().optional(),
    statusSync: z.string().optional(),
});

export const actions: Actions = {
    connect: async ({ locals, params, request }) => {
        const { account, access } = await loadOrganization(locals, params.org, "integration.personal");
        const provider = personalProvider(formValues(await request.formData()).provider);
        const started = await startConnection({
            organizationId: access.organization.id,
            accountId: account.id,
            provider: provider.id,
            scope: "personal",
            returnTo: `/o/${access.organization.slug}/my-integrations`,
            appName: messagesFor(locals.locale).common.appName,
        });
        if (!started.ok) return fail(400, { provider: provider.id, problem: started.problem });
        redirect(303, started.url);
    },

    test: async ({ locals, params, request }) => {
        const { account, access } = await loadOrganization(locals, params.org, "integration.personal");
        const provider = personalProvider(formValues(await request.formData()).provider);
        const connection = await personalConnection(access.organization.id, account.id, provider.id);
        if (!connection) return fail(404, { provider: provider.id, problem: "notFound" });
        const outcome = await testConnection(connection);
        await audit({
            action: "integration.test",
            account,
            organizationId: access.organization.id,
            targetType: "integration",
            targetId: connection.id,
            ipAddress: locals.clientIp ?? null,
            details: { provider: provider.id, personal: true, ok: outcome.ok },
        });
        return {
            provider: provider.id,
            test: outcome.ok
                ? { ok: true as const, account: outcome.identity.name }
                : { ok: false as const, problem: outcome.problem },
        };
    },

    disconnect: async ({ locals, params, request }) => {
        const { account, access } = await loadOrganization(locals, params.org, "integration.personal");
        const provider = personalProvider(formValues(await request.formData()).provider);
        const connection = await personalConnection(access.organization.id, account.id, provider.id);
        if (!connection) return fail(404, { provider: provider.id, problem: "notFound" });
        const outcome = await disconnectConnection(connection);
        await audit({
            action: "integration.disconnect",
            account,
            organizationId: access.organization.id,
            targetType: "integration",
            targetId: connection.id,
            ipAddress: locals.clientIp ?? null,
            details: { provider: provider.id, personal: true, revoke: outcome },
        });
        return { provider: provider.id, disconnected: outcome };
    },

    settings: async ({ locals, params, request }) => {
        const { account, access } = await loadOrganization(locals, params.org, "integration.personal");
        const parsed = SettingsForm.safeParse(formValues(await request.formData()));
        if (!parsed.success) return fail(400, { message: "validation" as const });
        const provider = personalProvider(parsed.data.provider);
        const on = (value: string | undefined) => value === "on";
        const choices =
            provider.id === "google" || provider.id === "microsoft"
                ? { calendarSharing: parsed.data.calendarSharing ?? "busy" }
                : provider.id === "github" || provider.id === "gitlab"
                  ? { shareActivity: on(parsed.data.shareActivity) }
                  : provider.id === "spotify"
                    ? { shareMusic: on(parsed.data.shareMusic) }
                    : { statusSync: on(parsed.data.statusSync) };
        const connection = await updatePersonalSettings(access.organization.id, account.id, provider.id, choices);
        if (!connection) return fail(404, { provider: provider.id, problem: "notFound" });
        await audit({
            action: "integration.settings",
            account,
            organizationId: access.organization.id,
            targetType: "integration",
            targetId: connection.id,
            ipAddress: locals.clientIp ?? null,
            details: { provider: provider.id, ...choices },
        });
        return { provider: provider.id, settingsSaved: true };
    },
};
