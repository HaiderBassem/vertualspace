<script lang="ts">
    import { enhance } from "$app/forms";
    import { resolve } from "$app/paths";
    import { page } from "$app/state";
    import AuthFrame from "$lib/components/AuthFrame.svelte";
    import Icon from "$lib/components/Icon.svelte";
    import { SLUG_INPUT_PATTERN } from "$lib/components/worlds/slug";
    import { useI18n } from "$lib/i18n/context";
    import type { ActionData, PageData } from "./$types";

    let { data, form }: { data: PageData; form: ActionData } = $props();
    const i18n = useI18n();
    const v = $derived(i18n.m.onboarding.verify);
    const token = $derived(page.url.searchParams.get("token") ?? "");
    let submitting = $state(false);
</script>

{#if !data.pending || (form && "invalid" in form)}
    <AuthFrame title={v.invalidTitle}>
        <p class="notice notice-warning"><Icon name="alert" /><span>{v.invalid}</span></p>
        <div class="flex flex-wrap gap-2">
            <a class="btn btn-primary" href={resolve("/login")}>{i18n.m.onboarding.register.login}</a>
            <a class="btn" href={resolve("/register")}>{i18n.m.onboarding.register.submit}</a>
        </div>
    </AuthFrame>
{:else}
    <AuthFrame title={v.title} intro={v.intro}>
        <dl
            class="space-y-3 rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface-muted)] p-4 text-sm"
        >
            <div>
                <dt class="section-title">{v.summaryAccount}</dt>
                <dd class="mt-1 font-medium">{data.pending.name}</dd>
                <dd class="muted">{data.pending.email}</dd>
            </div>
            <div>
                <dt class="section-title">{v.summaryOrganization}</dt>
                <dd class="mt-1 font-medium">{data.pending.organizationName}</dd>
                <dd class="muted font-mono">/@/{data.pending.organizationSlug}/</dd>
            </div>
        </dl>

        <form
            method="POST"
            class="space-y-4"
            use:enhance={() => {
                submitting = true;
                return async ({ update }) => {
                    await update({ reset: false });
                    submitting = false;
                };
            }}
        >
            <input type="hidden" name="token" value={token} />
            <div aria-live="polite">
                {#if form && "accountExists" in form}
                    <p class="notice notice-danger" role="alert">{v.accountExists}</p>
                {:else if form && "rateLimited" in form}
                    <p class="notice notice-danger" role="alert">{i18n.m.shell.auth.rateLimited}</p>
                {/if}
            </div>
            {#if form && "slugTaken" in form}
                <p class="notice notice-warning" role="alert">{v.slugTaken}</p>
                <div>
                    <label class="label" for="verify-slug">{i18n.m.onboarding.register.organizationSlug}</label>
                    <input
                        class="input font-mono"
                        id="verify-slug"
                        name="organizationSlug"
                        required
                        maxlength="64"
                        pattern={SLUG_INPUT_PATTERN}
                        spellcheck="false"
                        autocomplete="off"
                        value={form.organizationSlug || data.pending.organizationSlug}
                    />
                </div>
            {/if}
            <button class="btn btn-primary w-full" type="submit" disabled={submitting}>{v.confirm}</button>
        </form>
    </AuthFrame>
{/if}
