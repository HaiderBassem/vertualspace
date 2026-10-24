<script lang="ts">
    import { enhance } from "$app/forms";
    import ConfirmForm from "$lib/components/ConfirmForm.svelte";
    import DateTime from "$lib/components/DateTime.svelte";
    import Field from "$lib/components/Field.svelte";
    import FormMessage from "$lib/components/FormMessage.svelte";
    import PageHeader from "$lib/components/PageHeader.svelte";
    import TableScroll from "$lib/components/TableScroll.svelte";
    import { useI18n } from "$lib/i18n/context";
    import type { ActionData, PageData } from "./$types";

    let { data, form }: { data: PageData; form: ActionData } = $props();
    const i18n = useI18n();
    const m = $derived(i18n.m.integrations);

    const statusClass = { active: "badge-success", revoked: "badge-danger", expired: "badge-warning" } as const;
</script>

<PageHeader title={m.apiKeysTitle} description={m.apiKeysIntro} />

<FormMessage form={form && "revoked" in form ? { success: true } : form} successText={m.keyRevoked} />

{#if form && "createdKey" in form && form.createdKey}
    <section class="notice notice-success mb-6 space-y-2" aria-live="polite">
        <p class="font-semibold">{m.keyCreated}</p>
        <label class="block">
            <span class="sr-only">{m.key} — {form.createdName}</span>
            <input
                class="input font-mono text-sm"
                readonly
                value={form.createdKey}
                onfocus={(event) => event.currentTarget.select()}
            />
        </label>
    </section>
{/if}

<p class="muted mb-6 text-sm">{m.apiKeysUsage}</p>

<section class="card mb-8" aria-labelledby="new-key">
    <h2 id="new-key" class="mb-4 text-lg font-bold">{m.newKey}</h2>
    <form method="POST" action="?/create" use:enhance class="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Field
            label={m.keyName}
            name="name"
            hint={m.keyNameHelp}
            required
            error={form && "errors" in form ? form.errors?.name : undefined}
        >
            {#snippet children(a)}
                <input class="input" {...a} name="name" maxlength="200" />
            {/snippet}
        </Field>
        <Field
            label={m.scope}
            name="worldId"
            required
            error={form && "errors" in form ? form.errors?.worldId : undefined}
        >
            {#snippet children(a)}
                <select class="select" {...a} name="worldId">
                    <option value="">{m.scopeAll}</option>
                    {#each data.worlds as world (world.id)}
                        <option value={world.id}>{world.name}</option>
                    {/each}
                </select>
            {/snippet}
        </Field>
        <Field label={m.expiresAt} name="expiresOn" hint={m.expiresHelp}>
            {#snippet children(a)}
                <input class="input" type="date" {...a} name="expiresOn" />
            {/snippet}
        </Field>
        <div class="md:col-span-3">
            <button class="btn btn-primary" type="submit">{m.createKey}</button>
        </div>
    </form>
</section>

{#if data.keys.length === 0}
    <p class="muted">{m.apiKeysEmpty}</p>
{:else}
    <TableScroll label={m.apiKeysTitle}>
        <table class="table">
            <thead>
                <tr>
                    <th scope="col">{m.keyName}</th>
                    <th scope="col">{m.key}</th>
                    <th scope="col">{m.scope}</th>
                    <th scope="col">{i18n.m.common.labels.status}</th>
                    <th scope="col">{i18n.m.common.labels.createdAt}</th>
                    <th scope="col">{m.lastUsed}</th>
                    <th scope="col">{m.expiresAt}</th>
                    <th scope="col"><span class="sr-only">{i18n.m.common.labels.actions}</span></th>
                </tr>
            </thead>
            <tbody>
                {#each data.keys as key (key.id)}
                    <tr>
                        <td class="font-semibold">{key.name}</td>
                        <td><code>{key.prefix}…</code></td>
                        <td>{key.worldName ?? m.scopeAll}</td>
                        <td><span class="badge {statusClass[key.status]}">{m.keyStatus[key.status]}</span></td>
                        <td><DateTime value={key.createdAt} mode="date" /></td>
                        <td><DateTime value={key.lastUsedAt} mode="relative" /></td>
                        <td>
                            {#if key.expiresAt}<DateTime value={key.expiresAt} mode="date" />{:else}<span class="muted"
                                    >{i18n.m.common.labels.never}</span
                                >{/if}
                        </td>
                        <td class="text-end">
                            {#if key.status === "active"}
                                <ConfirmForm
                                    action="?/revoke"
                                    label={i18n.m.common.actions.revoke}
                                    title={m.revokeTitle}
                                    description={m.revokeDescription}
                                    fields={{ id: key.id }}
                                    small
                                />
                            {/if}
                        </td>
                    </tr>
                {/each}
            </tbody>
        </table>
    </TableScroll>
{/if}
