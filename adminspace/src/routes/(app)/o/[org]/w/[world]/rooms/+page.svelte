<script lang="ts">
    import { resolve } from "$app/paths";
    import { enhance } from "$app/forms";
    import { page } from "$app/state";
    import ConfirmForm from "$lib/components/ConfirmForm.svelte";
    import FormMessage from "$lib/components/FormMessage.svelte";
    import PageHeader from "$lib/components/PageHeader.svelte";
    import { formFeedback, formField, formOp } from "$lib/components/world/formState";
    import { roomSyncProblem } from "$lib/catalog/manifest";
    import { useI18n } from "$lib/i18n/context";
    import type { ActionData, PageData } from "./$types";

    let { data, form }: { data: PageData; form: ActionData } = $props();
    const i18n = useI18n();
    const r = $derived(i18n.m.rooms);
    const canManage = $derived(data.can["room.manage"]);
    type MapCheck = { roomId: string; status: "ok" | "unreachable" | "httpError" | "notChecked"; httpStatus?: number };
    const mapCheck = $derived(formField<MapCheck>(form, "mapCheck"));
    const mapWarning = $derived(page.url.searchParams.get("mapWarning"));
    const successText = $derived(
        formOp(form) === "reload" ? r.reloaded : formOp(form) === "delete" ? i18n.m.common.deleted : undefined,
    );
</script>

<PageHeader title={r.title} description={r.description}>
    {#snippet actions()}
        {#if canManage}<a
                class="btn btn-primary"
                href={resolve(`/o/${data.organization.slug}/w/${data.world.slug}/rooms/new`)}>{r.newRoom}</a
            >{/if}
    {/snippet}
</PageHeader>

<FormMessage form={formFeedback(form)} {successText} />
{#if mapWarning && !form}
    <p class="notice notice-danger mb-4" role="alert">{i18n.t(r.mapWarning, { slug: mapWarning })}</p>
{/if}

{#if !data.occupancyAvailable && data.rooms.length > 0}
    <p class="notice mb-4 text-sm">{r.occupancyUnavailable}</p>
{/if}

{#if data.rooms.length === 0}
    <div class="card text-center">
        <p class="muted">{r.empty}</p>
        {#if canManage}<a
                class="btn btn-primary mt-4"
                href={resolve(`/o/${data.organization.slug}/w/${data.world.slug}/rooms/new`)}>{r.newRoom}</a
            >{/if}
    </div>
{:else}
    <div class="card relative overflow-x-auto p-0">
        <table class="table">
            <thead>
                <tr>
                    <th scope="col">{r.columns.name}</th>
                    <th scope="col">{r.columns.map}</th>
                    <th scope="col">{r.columns.access}</th>
                    <th scope="col">{r.columns.online}</th>
                    {#if canManage}<th scope="col"><span class="sr-only">{i18n.m.common.labels.actions}</span></th>{/if}
                </tr>
            </thead>
            <tbody>
                {#each data.rooms as room, index (room.id)}
                    <tr>
                        <td>
                            <div class="flex flex-wrap items-center gap-2">
                                {#if canManage}
                                    <a
                                        href={resolve(
                                            `/o/${data.organization.slug}/w/${data.world.slug}/rooms/${room.id}`,
                                        )}
                                        class="font-semibold">{room.name}</a
                                    >
                                {:else}
                                    <span class="font-semibold">{room.name}</span>
                                {/if}
                                {#if room.isDefault}<span class="badge badge-accent">{r.defaultBadge}</span>{/if}
                                {#if room.syncState === "failed"}
                                    <span class="badge badge-danger">{i18n.m.catalog.world.state.failed}</span>
                                {:else if room.syncState === "pending"}
                                    <span class="badge badge-warning">{i18n.m.catalog.world.state.pending}</span>
                                {/if}
                            </div>
                            {#if room.syncState === "failed"}
                                <p class="mt-1 max-w-sm text-xs text-[var(--danger)]">
                                    {i18n.m.catalog.world.problems[roomSyncProblem(room.syncError) ?? "unexpected"]}
                                </p>
                            {/if}
                            {#if room.url}
                                <a
                                    class="muted text-xs"
                                    href={room.url}
                                    target="_blank"
                                    rel="external noopener noreferrer"
                                >
                                    <code>/{room.slug}</code>
                                </a>
                            {:else}
                                <code class="muted text-xs">/{room.slug}</code>
                            {/if}
                        </td>
                        <td class="max-w-xs">
                            <span class="badge">{room.mapKind === "wam" ? "WAM" : "Tiled"}</span>
                            <code class="muted mt-1 block truncate text-xs" title={room.map ?? ""}
                                >{room.map ?? "—"}</code
                            >
                            {#if mapCheck && mapCheck.roomId === room.id}
                                <p
                                    class="mt-1 text-xs {mapCheck.status === 'ok'
                                        ? 'text-[var(--success)]'
                                        : 'text-[var(--danger)]'}"
                                    role="status"
                                >
                                    {i18n.t(r.mapCheck[mapCheck.status], { status: mapCheck.httpStatus ?? "" })}
                                </p>
                            {/if}
                        </td>
                        <td>
                            {#if room.requiredTags.length === 0}
                                <span class="muted">{r.everyone}</span>
                            {:else}
                                {i18n.t(r.restrictedTo, { tags: room.requiredTags.join(", ") })}
                            {/if}
                        </td>
                        <td>
                            {#if room.online === null}
                                <span class="muted">—</span>
                            {:else}
                                {i18n.p(r.online, room.online)}
                            {/if}
                        </td>
                        {#if canManage}
                            <td>
                                <div class="flex flex-wrap justify-end gap-1">
                                    <form method="POST" action="?/move" use:enhance>
                                        <input type="hidden" name="roomId" value={room.id} />
                                        <button
                                            class="btn btn-sm btn-ghost"
                                            name="direction"
                                            value="up"
                                            disabled={index === 0}
                                            aria-label={r.moveUp}
                                            title={r.moveUp}>↑</button
                                        >
                                        <button
                                            class="btn btn-sm btn-ghost"
                                            name="direction"
                                            value="down"
                                            disabled={index === data.rooms.length - 1}
                                            aria-label={r.moveDown}
                                            title={r.moveDown}>↓</button
                                        >
                                    </form>
                                    <form method="POST" action="?/checkMap" use:enhance>
                                        <input type="hidden" name="roomId" value={room.id} />
                                        <button class="btn btn-sm">{r.checkMap}</button>
                                    </form>
                                    {#if !room.isDefault}
                                        <form method="POST" action="?/setDefault" use:enhance>
                                            <input type="hidden" name="roomId" value={room.id} />
                                            <button class="btn btn-sm">{r.setDefault}</button>
                                        </form>
                                    {/if}
                                    {#if data.can["live.manage"] && room.url}
                                        <ConfirmForm
                                            action="?/reload"
                                            label={r.reload}
                                            title={r.reloadTitle}
                                            description={r.reloadDescription}
                                            fields={{ roomId: room.id }}
                                            danger={false}
                                            small
                                        />
                                    {/if}
                                    <ConfirmForm
                                        action="?/delete"
                                        label={i18n.m.common.actions.delete}
                                        title={r.deleteTitle}
                                        description={r.deleteDescription}
                                        fields={{ roomId: room.id }}
                                        confirmValue={room.slug}
                                        small
                                    />
                                </div>
                            </td>
                        {/if}
                    </tr>
                {/each}
            </tbody>
        </table>
    </div>
{/if}
