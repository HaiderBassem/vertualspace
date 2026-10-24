/**
 * Redirect URI of every OAuth provider: {ORIGIN}/integrations/oauth/{provider}/callback. A back-office page: the person
 * must be signed in (and is the one who started the flow: the state is bound to their account). The code is exchanged
 * on the server, the connection stored, and the person sent back to where they started with the outcome.
 *
 * Trello returns its token in the URL fragment, which browsers never send: the page reads it and posts it once to the
 * "token" action with the state.
 */
import { error, redirect } from "@sveltejs/kit";
import type { Actions, PageServerLoad } from "./$types";
import { requireAccount } from "$lib/server/context";
import { completeConnection, type CallbackOutcome } from "$lib/server/integrations/connections";
import { isProviderId } from "$lib/server/integrations/registry";
import type { ProviderId } from "$lib/server/integrations/types";

function providerOf(value: string): ProviderId {
    if (!isProviderId(value)) error(404, "Not found");
    return value;
}

/** Where to go after the callback: the starting page, with ?connected= or ?problem=. */
function destination(outcome: CallbackOutcome, provider: ProviderId): string | undefined {
    if (!outcome.returnTo) return undefined;
    const url = new URL(outcome.returnTo, "http://callback.invalid");
    if (outcome.ok) url.searchParams.set("connected", provider);
    else url.searchParams.set("problem", outcome.problem);
    return url.pathname + url.search;
}

export const load: PageServerLoad = async ({ locals, params, url }) => {
    const account = requireAccount(locals);
    const provider = providerOf(params.provider);
    const state = url.searchParams.get("state") ?? "";
    if (provider === "trello") return { provider, fragment: true, state, problem: null };

    const outcome = await completeConnection({
        account,
        provider,
        state,
        code: url.searchParams.get("code") ?? undefined,
        error: url.searchParams.get("error") ?? undefined,
        ipAddress: locals.clientIp ?? null,
    });
    const target = destination(outcome, provider);
    if (target) redirect(303, target);
    return { provider, fragment: false, state: "", problem: outcome.ok ? null : outcome.problem };
};

export const actions: Actions = {
    token: async ({ locals, params, request }) => {
        const account = requireAccount(locals);
        const provider = providerOf(params.provider);
        if (provider !== "trello") error(404, "Not found");
        const form = await request.formData();
        const outcome = await completeConnection({
            account,
            provider,
            state: String(form.get("state") ?? "").slice(0, 200),
            token: String(form.get("token") ?? "").slice(0, 300),
            ipAddress: locals.clientIp ?? null,
        });
        const target = destination(outcome, provider);
        if (target) redirect(303, target);
        return { problem: outcome.ok ? null : outcome.problem };
    },
};
