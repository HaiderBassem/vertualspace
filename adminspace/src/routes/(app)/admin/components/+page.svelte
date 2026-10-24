<script lang="ts">
    import { enhance } from "$app/forms";
    import FormMessage from "$lib/components/FormMessage.svelte";
    import Icon from "$lib/components/Icon.svelte";
    import PageHeader from "$lib/components/PageHeader.svelte";
    import { useI18n } from "$lib/i18n/context";
    import type { ActionData, PageData } from "./$types";

    let { data, form }: { data: PageData; form: ActionData } = $props();
    const i18n = useI18n();
    const a = $derived(i18n.m.catalog.admin);
    const formMessage = $derived(form && "message" in form ? { message: form.message } : null);
</script>

<PageHeader title={a.title} description={a.intro} />

<div aria-live="polite">
    {#if form?.imported}
        <p class="notice notice-success mb-4">
            <Icon name="check" />{i18n.t(a.imported, { ok: form.imported.ok, failed: form.imported.failed })}
        </p>
    {:else if form && "statusChanged" in form}
        <p class="notice notice-success mb-4"><Icon name="check" />{a.statusChanged}</p>
    {/if}
</div>
<FormMessage form={formMessage} />

<section class="card mb-6 flex flex-wrap items-center justify-between gap-4">
    <p class="muted max-w-2xl text-sm">{a.importIntro}</p>
    <form method="POST" action="?/import" use:enhance>
        <button class="btn btn-primary" type="submit"><Icon name="download" size={16} />{a.import}</button>
    </form>
</section>

<div class="card card-flush">
    <div class="overflow-x-auto">
        <table class="table table-dense">
            <thead>
                <tr>
                    <th scope="col">{i18n.m.common.labels.name}</th>
                    <th scope="col">{i18n.m.catalog.detail.category}</th>
                    <th scope="col">{i18n.m.catalog.detail.license}</th>
                    <th scope="col">{i18n.m.common.labels.status}</th>
                    <th scope="col">{i18n.m.catalog.sort.popular}</th>
                    <th scope="col"><span class="sr-only">{i18n.m.common.labels.actions}</span></th>
                </tr>
            </thead>
            <tbody>
                {#each data.components as component (component.id)}
                    <tr>
                        <td>
                            <p class="font-medium">{component.name}</p>
                            <p class="muted text-xs">
                                <code>{component.key}</code> · {i18n.m.catalog.kinds[component.kind]}
                            </p>
                        </td>
                        <td class="text-sm">
                            {i18n.m.catalog.categories[component.category as keyof typeof i18n.m.catalog.categories] ??
                                component.category}
                        </td>
                        <td class="text-sm"><code>{component.license}</code></td>
                        <td>
                            <span class="badge {component.status === 'published' ? 'badge-success' : 'badge-warning'}"
                                >{a.status[component.status]}</span
                            >
                        </td>
                        <td class="text-sm tabular-nums">{i18n.number(component.installs)}</td>
                        <td class="text-end">
                            <form method="POST" action="?/status" use:enhance>
                                <input type="hidden" name="id" value={component.id} />
                                <input
                                    type="hidden"
                                    name="status"
                                    value={component.status === "published" ? "deprecated" : "published"}
                                />
                                <button class="btn btn-sm" type="submit"
                                    >{component.status === "published" ? a.deprecate : a.publish}</button
                                >
                            </form>
                        </td>
                    </tr>
                {/each}
            </tbody>
        </table>
    </div>
</div>
