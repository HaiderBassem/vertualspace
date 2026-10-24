<script lang="ts">
    import { enhance } from "$app/forms";
    import { resolve } from "$app/paths";
    import { page } from "$app/state";
    import AuthFrame from "$lib/components/AuthFrame.svelte";
    import Avatar from "$lib/components/Avatar.svelte";
    import Icon from "$lib/components/Icon.svelte";
    import { useI18n } from "$lib/i18n/context";
    import type { ActionData, PageData } from "./$types";

    let { data, form }: { data: PageData; form: ActionData } = $props();
    const i18n = useI18n();
    const inv = $derived(i18n.m.onboarding.invite);
    const auth = $derived(i18n.m.shell.auth);
    const token = $derived(page.url.searchParams.get("token") ?? "");
    let submitting = $state(false);

    const failure = $derived(form && "failure" in form ? form.failure : undefined);
    const field = $derived(form && "field" in form ? form.field : undefined);
    const problem = $derived(form && "problem" in form ? form.problem : undefined);

    const stateMessage = $derived.by(() => {
        switch (data.state) {
            case "expired":
                return inv.expired;
            case "revoked":
                return inv.revoked;
            case "accepted":
                return inv.accepted;
            case "organizationInactive":
                return inv.organizationInactive;
            case "invalid":
                return inv.invalid;
            default:
                return undefined;
        }
    });

    const failureMessage = $derived.by(() => {
        switch (failure) {
            case "emailMismatch":
                return data.state !== "invalid"
                    ? i18n.t(inv.wrongAccount, { current: data.account?.email ?? "", invited: data.invitedEmail })
                    : inv.invalid;
            case "accountExists":
                return inv.loginToAccept;
            case "organizationInactive":
                return inv.organizationInactive;
            case "invalid":
                return inv.noLongerValid;
            default:
                return undefined;
        }
    });

    const enhanceSubmit = () => {
        submitting = true;
        return async ({ update }: { update: (o?: { reset?: boolean }) => Promise<void> }) => {
            await update({ reset: false });
            submitting = false;
        };
    };
</script>

{#if data.state !== "pending"}
    <AuthFrame title={inv.invalidTitle}>
        <p class="notice notice-warning"><Icon name="alert" /><span>{stateMessage}</span></p>
        {#if data.state === "accepted"}<a class="btn btn-primary w-full" href={resolve("/login")}>{auth.submit}</a>{/if}
    </AuthFrame>
{:else}
    <AuthFrame title={i18n.t(inv.title, { organization: data.organization.name })}>
        <div class="flex items-start gap-3">
            <Avatar
                name={data.organization.name}
                seed={data.organization.slug}
                imageUrl={data.organization.logoUrl}
                size={44}
                square
            />
            <div class="min-w-0 text-sm">
                <p>
                    {data.inviterName
                        ? i18n.t(inv.intro, {
                              inviter: data.inviterName,
                              organization: data.organization.name,
                              role: i18n.m.shell.roles[data.role],
                          })
                        : i18n.t(inv.introNoInviter, {
                              organization: data.organization.name,
                              role: i18n.m.shell.roles[data.role],
                          })}
                </p>
                {#if data.workspaces.length > 0}
                    <p class="muted mt-1">{i18n.t(inv.workspaces, { workspaces: data.workspaces.join(", ") })}</p>
                {/if}
                <p class="muted mt-1 text-xs">{i18n.t(inv.invitedEmail, { email: data.invitedEmail })}</p>
            </div>
        </div>

        <div aria-live="polite">
            {#if form && "rateLimited" in form}
                <p class="notice notice-danger" role="alert">{auth.rateLimited}</p>
            {:else if failureMessage}
                <p class="notice notice-danger" role="alert">{failureMessage}</p>
            {/if}
        </div>

        {#if data.account}
            {#if data.account.email.toLowerCase() === data.invitedEmail.toLowerCase()}
                <form method="POST" action="?/accept" use:enhance={enhanceSubmit}>
                    <input type="hidden" name="token" value={token} />
                    <button class="btn btn-primary w-full" type="submit" disabled={submitting}>
                        {i18n.t(inv.accept, { organization: data.organization.name })}
                    </button>
                </form>
            {:else}
                <p class="notice notice-warning" role="alert">
                    {i18n.t(inv.wrongAccount, { current: data.account.email, invited: data.invitedEmail })}
                </p>
                <form method="POST" action="/logout">
                    <button class="btn w-full" type="submit">{inv.logoutAndContinue}</button>
                </form>
            {/if}
        {:else if data.invitedHasAccount || failure === "accountExists"}
            <p class="muted text-sm">{inv.loginToAccept}</p>
            <!-- eslint-disable-next-line svelte/no-navigation-without-resolve -- server-built /login path with a redirect -->
            <a class="btn btn-primary w-full" href={data.loginHref}>{inv.loginAction}</a>
        {:else}
            <form method="POST" action="?/create" class="space-y-4" use:enhance={enhanceSubmit}>
                <h2 class="text-sm font-semibold">{inv.createAccount}</h2>
                <input type="hidden" name="token" value={token} />
                <div>
                    <label class="label" for="invite-email">{i18n.m.common.labels.email}</label>
                    <input class="input" id="invite-email" type="email" value={data.invitedEmail} readonly disabled />
                </div>
                <div>
                    <label class="label" for="invite-name">{inv.name}</label>
                    <input
                        class="input"
                        id="invite-name"
                        name="name"
                        autocomplete="name"
                        required
                        maxlength="200"
                        value={form && "name" in form ? form.name : ""}
                        aria-invalid={field === "name" ? "true" : undefined}
                    />
                </div>
                <div>
                    <label class="label" for="invite-password">{inv.password}</label>
                    <input
                        class="input"
                        id="invite-password"
                        name="password"
                        type="password"
                        autocomplete="new-password"
                        required
                        minlength={data.passwordMinLength}
                        maxlength={data.passwordMaxLength}
                        aria-invalid={field === "password" ? "true" : undefined}
                        aria-describedby="invite-password-hint"
                    />
                    <p class="hint" id="invite-password-hint">
                        {problem === "tooLong"
                            ? i18n.t(auth.passwordTooLong, { max: data.passwordMaxLength })
                            : i18n.t(auth.passwordTooShort, { min: data.passwordMinLength })}
                    </p>
                </div>
                <div>
                    <label class="label" for="invite-password-confirm">{inv.passwordConfirm}</label>
                    <input
                        class="input"
                        id="invite-password-confirm"
                        name="passwordConfirm"
                        type="password"
                        autocomplete="new-password"
                        required
                        aria-invalid={field === "passwordConfirm" ? "true" : undefined}
                    />
                    {#if field === "passwordConfirm"}<p class="field-error">{auth.passwordMismatch}</p>{/if}
                </div>
                <button class="btn btn-primary w-full" type="submit" disabled={submitting}>{inv.createAndJoin}</button>
            </form>
        {/if}
    </AuthFrame>
{/if}
