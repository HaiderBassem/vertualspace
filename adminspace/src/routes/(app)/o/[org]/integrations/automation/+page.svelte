<script lang="ts">
    import { enhance } from "$app/forms";
    import { page } from "$app/state";
    import ConfirmForm from "$lib/components/ConfirmForm.svelte";
    import DateTime from "$lib/components/DateTime.svelte";
    import EmptyState from "$lib/components/EmptyState.svelte";
    import Field from "$lib/components/Field.svelte";
    import FormMessage from "$lib/components/FormMessage.svelte";
    import PageHeader from "$lib/components/PageHeader.svelte";
    import TableScroll from "$lib/components/TableScroll.svelte";
    import CopyText from "$lib/components/worlds/CopyText.svelte";
    import { formErrors, formFeedback, formField } from "$lib/components/world/formState";
    import CenterTabs from "$lib/components/integrations/CenterTabs.svelte";
    import { useI18n } from "$lib/i18n/context";
    import type { ActionData, PageData } from "./$types";

    let { data, form }: { data: PageData; form: ActionData } = $props();
    const i18n = useI18n();
    const a = $derived(i18n.m.integrationCenter.automation);
    const org = $derived(page.params.org ?? "");
    const errors = $derived(formErrors(form));
    const createdToken = $derived(formField<string>(form, "createdToken"));
    const createdName = $derived(formField<string>(form, "createdName"));
    let pending = $state(false);

    const statusClass = { active: "badge-success", revoked: "badge-danger", expired: "badge-warning" } as const;
    const scopeKey = (scope: string) => (scope === "invitations:write" ? "invitations" : "announcements");

    const examples = $derived([
        {
            title: "GET /ping",
            text: a.reference.ping,
            code: `curl -H "Authorization: Bearer $TOKEN" ${data.baseUrl}/ping`,
        },
        {
            title: "POST /invitations",
            text: a.reference.invitations,
            code: `curl -X POST -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \\\n  -d '{"email":"new.hire@example.com","role":"employee"}' ${data.baseUrl}/invitations`,
        },
        {
            title: "POST /announcements",
            text: a.reference.announcements,
            code: `curl -X POST -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \\\n  -d '{"world":"${data.exampleWorld}","message":"Stand-up in 5 minutes"}' ${data.baseUrl}/announcements`,
        },
    ]);
</script>

<PageHeader title={a.title} description={a.intro} />
<CenterTabs {org} active="automation" />

<FormMessage form={form && "revoked" in form ? { success: true } : formFeedback(form)} successText={a.revoked} />
{#if createdToken}
    <section class="notice notice-success mb-6 space-y-2" aria-live="polite">
        <p class="font-semibold">{a.created}</p>
        <p class="text-sm" dir="auto">{createdName}</p>
        <CopyText value={createdToken} />
    </section>
{/if}

<section class="card mb-8" aria-labelledby="new-token">
    <h2 id="new-token" class="mb-4 text-lg font-bold">{a.newToken}</h2>
    <form
        method="POST"
        action="?/create"
        class="grid grid-cols-1 gap-4 md:grid-cols-2"
        use:enhance={() => {
            pending = true;
            return async ({ update }) => {
                await update();
                pending = false;
            };
        }}
    >
        <Field label={a.name} name="name" hint={a.nameHelp} required error={errors.name}>
            {#snippet children(attrs)}
                <input class="input" {...attrs} name="name" maxlength="200" />
            {/snippet}
        </Field>
        <Field label={a.expires} name="expiresOn" hint={a.expiresHelp} error={errors.expiresOn}>
            {#snippet children(attrs)}
                <input class="input" type="date" {...attrs} name="expiresOn" />
            {/snippet}
        </Field>
        <fieldset class="md:col-span-2">
            <legend class="label">{a.scopes}</legend>
            <div class="mt-2 space-y-2">
                {#each data.scopes as scope (scope)}
                    <label class="choice">
                        <input type="checkbox" name="scopes" value={scope} />
                        <span>{a.scopeLabels[scopeKey(scope)]}</span>
                    </label>
                {/each}
            </div>
            {#if formField(form, "noScope")}<p class="field-error" role="alert">{a.noScope}</p>{/if}
        </fieldset>
        <div class="md:col-span-2">
            <button class="btn btn-primary" type="submit" disabled={pending} aria-busy={pending}>{a.create}</button>
        </div>
    </form>
</section>

<h2 class="mb-3 text-lg font-bold">{a.tokens}</h2>
{#if data.tokens.length === 0}
    <div class="card mb-8"><EmptyState icon="key" title={a.empty} /></div>
{:else}
    <div class="mb-8">
        <TableScroll label={a.tokens}>
            <table class="table">
                <thead>
                    <tr>
                        <th scope="col">{a.columns.name}</th>
                        <th scope="col">{a.columns.token}</th>
                        <th scope="col">{a.columns.scopes}</th>
                        <th scope="col">{a.columns.createdBy}</th>
                        <th scope="col">{a.columns.status}</th>
                        <th scope="col">{a.columns.lastUsed}</th>
                        <th scope="col">{a.columns.expires}</th>
                        <th scope="col"><span class="sr-only">{i18n.m.common.labels.actions}</span></th>
                    </tr>
                </thead>
                <tbody>
                    {#each data.tokens as token (token.id)}
                        <tr>
                            <td class="font-semibold" dir="auto">{token.name}</td>
                            <td><code dir="ltr">{token.prefix}…</code></td>
                            <td class="text-sm">
                                {#each token.scopes as scope (scope)}<code class="chip me-1" dir="ltr">{scope}</code
                                    >{/each}
                            </td>
                            <td dir="auto">{token.creator ?? "—"}</td>
                            <td><span class="badge {statusClass[token.status]}">{a.statuses[token.status]}</span></td>
                            <td><DateTime value={token.lastUsedAt} mode="relative" /></td>
                            <td>
                                {#if token.expiresAt}<DateTime value={token.expiresAt} mode="date" />{:else}<span
                                        class="muted">{i18n.m.common.labels.never}</span
                                    >{/if}
                            </td>
                            <td class="text-end">
                                {#if token.status === "active"}
                                    <ConfirmForm
                                        action="?/revoke"
                                        label={i18n.m.common.actions.revoke}
                                        title={a.revokeTitle}
                                        description={a.revokeDescription}
                                        fields={{ id: token.id }}
                                        small
                                    />
                                {/if}
                            </td>
                        </tr>
                    {/each}
                </tbody>
            </table>
        </TableScroll>
    </div>
{/if}

<section class="card space-y-4" aria-labelledby="reference">
    <h2 id="reference" class="text-lg font-bold">{a.reference.title}</h2>
    {#if data.originMissing}<p class="notice notice-warning text-sm">{a.reference.originMissing}</p>{/if}
    <div class="space-y-1">
        <p class="label">{a.reference.base}</p>
        <CopyText value={data.baseUrl} />
    </div>
    <p class="text-sm">{a.reference.auth}</p>
    <p class="muted text-sm">{i18n.t(a.reference.limits, { count: data.limit })}</p>
    {#each examples as example (example.title)}
        <div class="space-y-1">
            <h3 class="font-semibold"><code dir="ltr">{example.title}</code></h3>
            <p class="text-sm">{example.text}</p>
            <pre
                class="rounded-[var(--radius)] bg-[var(--surface-sunken)] p-3 text-xs break-all whitespace-pre-wrap"
                dir="ltr"><code>{example.code}</code></pre>
        </div>
    {/each}
    <h3 class="font-semibold">{a.reference.zapierTitle}</h3>
    <p class="text-sm">{a.reference.zapierSteps}</p>
    <h3 class="font-semibold">{a.reference.n8nTitle}</h3>
    <p class="text-sm">{a.reference.n8nSteps}</p>
</section>
