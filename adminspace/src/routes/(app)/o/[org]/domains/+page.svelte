<script lang="ts">
    import { enhance } from "$app/forms";
    import ConfirmForm from "$lib/components/ConfirmForm.svelte";
    import DateTime from "$lib/components/DateTime.svelte";
    import FormMessage from "$lib/components/FormMessage.svelte";
    import PageHeader from "$lib/components/PageHeader.svelte";
    import { useI18n } from "$lib/i18n/context";
    import type { ActionData, PageData } from "./$types";

    let { data, form }: { data: PageData; form: ActionData } = $props();
    const i18n = useI18n();
    const m = $derived(i18n.m.integrations);

    const notice = $derived.by(() => {
        if (!form) return undefined;
        if ("verified" in form) return m.verified;
        if ("removed" in form) return m.removed;
        if ("success" in form) return i18n.m.common.created;
        return undefined;
    });
    const hostError = $derived(form?.hostError ? m[form.hostError] : undefined);
    const verifyError = $derived(
        form && "verifyError" in form && form.verifyError
            ? i18n.t(form.verifyError === "noProof" ? m.verifyNoProof : m.verifyDnsError, {
                  record: form.recordName ?? "",
              })
            : undefined,
    );
</script>

<PageHeader title={m.domainsTitle} description={m.domainsIntro} />

<FormMessage form={form && "message" in form ? form : notice ? { success: true } : null} successText={notice} />
{#if verifyError}<p class="notice notice-danger mb-4" role="alert">{verifyError}</p>{/if}

<p class="muted mb-6 max-w-3xl text-sm">{m.domainsHowItWorks}</p>

<section class="card mb-8" aria-labelledby="add-domain">
    <h2 id="add-domain" class="mb-4 text-lg font-bold">{m.addDomain}</h2>
    <form method="POST" action="?/add" use:enhance class="flex flex-wrap items-end gap-3">
        <div class="min-w-64 flex-1">
            <label class="label" for="host">{m.host}</label>
            <input
                class="input"
                id="host"
                name="host"
                required
                maxlength="253"
                autocomplete="off"
                spellcheck="false"
                value={form && "host" in form ? form.host : ""}
                aria-invalid={hostError ? "true" : undefined}
                aria-describedby="host-hint{hostError ? ' host-error' : ''}"
            />
            <p class="hint" id="host-hint">{m.hostHelp}</p>
            {#if hostError}<p class="field-error" id="host-error">{hostError}</p>{/if}
        </div>
        <button class="btn btn-primary mb-6" type="submit">{m.addDomain}</button>
    </form>
</section>

{#if data.domains.length === 0}
    <p class="muted">{m.domainsEmpty}</p>
{:else}
    <ul class="space-y-3">
        {#each data.domains as domain (domain.id)}
            <li class="card space-y-3">
                <div class="flex flex-wrap items-center justify-between gap-3">
                    <div class="flex flex-wrap items-center gap-2">
                        <span class="font-mono font-semibold" dir="ltr">{domain.host}</span>
                        {#if domain.verifiedAt}
                            <span class="badge badge-success">{m.domainStatus.verified}</span>
                            <span class="muted text-sm"><DateTime value={domain.verifiedAt} mode="date" /></span>
                        {:else}
                            <span class="badge badge-warning">{m.domainStatus.pending}</span>
                        {/if}
                    </div>
                    <div class="flex gap-2">
                        {#if !domain.verifiedAt}
                            <form method="POST" action="?/verify" use:enhance>
                                <input type="hidden" name="id" value={domain.id} />
                                <button class="btn btn-sm" type="submit">{m.verify}</button>
                            </form>
                        {/if}
                        <ConfirmForm
                            action="?/remove"
                            label={i18n.m.common.actions.remove}
                            title={m.removeTitle}
                            description={m.removeDescription}
                            fields={{ id: domain.id }}
                            small
                        />
                    </div>
                </div>
                {#if domain.challenge}
                    {#if !domain.verifiedAt}<p class="text-sm">{m.verifyDescription}</p>{/if}
                    <dl class="grid gap-1 text-sm md:grid-cols-[12rem_1fr]">
                        <dt class="muted">{m.recordName}</dt>
                        <dd><code dir="ltr" class="break-all">{domain.recordName}</code></dd>
                        <dt class="muted">{m.recordValue}</dt>
                        <dd><code dir="ltr" class="break-all">{domain.challenge}</code></dd>
                        <dt class="muted">{m.challengeUrl}</dt>
                        <dd>
                            <code dir="ltr" class="break-all"
                                >{data.adminOrigin}/white-label/cf-challenge?host={domain.host}</code
                            >
                        </dd>
                    </dl>
                {/if}
            </li>
        {/each}
    </ul>
{/if}
