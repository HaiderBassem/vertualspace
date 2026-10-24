<script lang="ts">
    import type { ResolvedPathname } from "$app/types";
    import { resolve } from "$app/paths";
    import { enhance } from "$app/forms";
    import { page } from "$app/state";
    import DateTime from "$lib/components/DateTime.svelte";
    import Field from "$lib/components/Field.svelte";
    import FormMessage from "$lib/components/FormMessage.svelte";
    import PageHeader from "$lib/components/PageHeader.svelte";
    import { formErrors, formFeedback, formField, formOp, formValuesOf } from "$lib/components/world/formState";
    import { useI18n } from "$lib/i18n/context";
    import type { ActionData, PageData } from "./$types";

    type ImportErrorKey = keyof typeof i18n.m.people.members.importErrors;

    let { data, form }: { data: PageData; form: ActionData } = $props();
    const i18n = useI18n();
    const mm = $derived(i18n.m.people.members);
    const canManage = $derived(data.can["member.manage"]);
    const pages = $derived(Math.max(1, Math.ceil(data.total / data.pageSize)));

    // Validation failures (parseForm) carry no `op`: they come from the "add" form, the only one with text fields.
    const forAdd = $derived(formOp(form) === "add" || (form && formOp(form) === undefined));
    const addErrors = $derived(forAdd ? formErrors(form) : {});
    const addValues = $derived(forAdd ? formValuesOf(form) : {});
    const alreadyMember = $derived(formField<boolean>(form, "alreadyMember") === true);
    const promoted = $derived(formField<boolean>(form, "promoted") === true);
    const tagError = $derived(formField<"invalidTag" | "reservedTag" | "unknownTag">(form, "tagError"));
    const importSummary = $derived(
        formField<{ created: number; updated: number; skipped: number }>(form, "importSummary"),
    );
    const importErrors = $derived(formField<{ line: number; code: ImportErrorKey }[]>(form, "importErrors") ?? []);

    function pageHref(page: number): ResolvedPathname {
        const query = [
            ["q", data.filters.search],
            ["kind", data.filters.kind],
            ["tag", data.filters.tag],
            ["department", data.filters.department],
            ["page", page > 1 ? String(page) : ""],
        ]
            .filter(([, value]) => value)
            .map(([key, value]) => `${key}=${encodeURIComponent(value ?? "")}`)
            .join("&");
        return query
            ? resolve(`/o/${data.organization.slug}/w/${data.world.slug}/members?${query}`)
            : resolve(`/o/${data.organization.slug}/w/${data.world.slug}/members`);
    }
</script>

<PageHeader title={i18n.m.people.membersTitle} description={mm.description}>
    {#snippet actions()}
        {#if data.can["member.manage"]}<details class="relative">
                <summary class="btn">{mm.export}</summary>
                <ul
                    class="absolute end-0 z-10 mt-2 w-56 rounded-lg border border-[var(--border)] bg-[var(--surface)] p-2 shadow-lg"
                >
                    <li>
                        <a
                            class="block rounded px-3 py-2 no-underline hover:bg-[var(--surface-sunken)]"
                            href={resolve(
                                `/o/${data.organization.slug}/w/${data.world.slug}/members/export?format=csv`,
                            )}
                            download>{mm.exportCsv}</a
                        >
                    </li>
                    <li>
                        <a
                            class="block rounded px-3 py-2 no-underline hover:bg-[var(--surface-sunken)]"
                            href={resolve(
                                `/o/${data.organization.slug}/w/${data.world.slug}/members/export?format=json`,
                            )}
                            download>{mm.exportJson}</a
                        >
                    </li>
                </ul>
            </details>{/if}
    {/snippet}
</PageHeader>

{#if page.url.searchParams.get("erased") === "1" && !form}
    <p class="notice notice-success mb-4" aria-live="polite">
        {i18n.m.people.member.erased}
        {#if Number(page.url.searchParams.get("keptBans") ?? "0") > 0}
            {i18n.p(i18n.m.people.member.erasedActiveBansKept, Number(page.url.searchParams.get("keptBans")))}
        {/if}
    </p>
{/if}
{#if forAdd}
    {#if alreadyMember}
        <p class="notice notice-danger mb-4" role="alert">{mm.alreadyMember}</p>
    {:else if tagError}
        <p class="notice notice-danger mb-4" role="alert">{i18n.m.people.tagErrors[tagError]}</p>
    {:else}
        <FormMessage form={formFeedback(form)} successText={promoted ? mm.promoted : mm.added} />
    {/if}
{/if}
{#if formOp(form) === "import"}
    <div class="notice mb-4" aria-live="polite">
        {#if importSummary}
            <p class="font-semibold">{i18n.t(mm.importResult, importSummary)}</p>
        {/if}
        {#if importErrors.length > 0}
            <ul class="mt-2 list-inside list-disc text-sm text-[var(--danger)]">
                {#each importErrors as importError (importError.line + importError.code)}
                    <li>
                        {i18n.t(mm.importLineError, {
                            line: importError.line,
                            error: mm.importErrors[importError.code],
                        })}
                    </li>
                {/each}
            </ul>
        {/if}
    </div>
{/if}

<form method="GET" class="card mb-4 flex flex-wrap items-end gap-3" role="search">
    <label class="min-w-48 flex-1">
        <span class="label">{mm.searchLabel}</span>
        <input class="input" type="search" name="q" value={data.filters.search} />
    </label>
    <label>
        <span class="label">{mm.kindFilter}</span>
        <select class="select" name="kind">
            <option value="" selected={data.filters.kind === ""}>{i18n.m.common.labels.all}</option>
            <option value="member" selected={data.filters.kind === "member"}>{mm.kinds.member}</option>
            <option value="guest" selected={data.filters.kind === "guest"}>{mm.kinds.guest}</option>
        </select>
    </label>
    <label>
        <span class="label">{mm.tagFilter}</span>
        <select class="select" name="tag">
            <option value="" selected={data.filters.tag === ""}>{mm.anyTag}</option>
            {#each data.tagNames as tag (tag)}
                <option value={tag} selected={data.filters.tag === tag}>{tag}</option>
            {/each}
        </select>
    </label>
    {#if data.departments.length > 0 || data.filters.department}
        <label>
            <span class="label">{mm.departmentFilter}</span>
            <select class="select" name="department">
                <option value="" selected={data.filters.department === ""}>{mm.anyDepartment}</option>
                {#each data.departments as department (department)}
                    <option value={department} selected={data.filters.department === department}>{department}</option>
                {/each}
            </select>
        </label>
    {/if}
    <button class="btn" type="submit">{i18n.m.common.actions.search}</button>
</form>

<p class="muted mb-2 text-sm" aria-live="polite">{i18n.p(mm.count, data.total)}</p>

{#if data.members.length === 0}
    <p class="card muted">
        {data.filters.search || data.filters.kind || data.filters.tag || data.filters.department
            ? i18n.m.common.noMatch
            : mm.empty}
    </p>
{:else}
    <div class="card relative overflow-x-auto p-0">
        <table class="table">
            <thead>
                <tr>
                    <th scope="col">{mm.columns.person}</th>
                    <th scope="col">{mm.columns.jobTitle}</th>
                    <th scope="col">{mm.columns.department}</th>
                    <th scope="col">{mm.columns.kind}</th>
                    <th scope="col">{mm.columns.tags}</th>
                    <th scope="col">{mm.columns.visits}</th>
                    <th scope="col">{mm.columns.lastSeen}</th>
                </tr>
            </thead>
            <tbody>
                {#each data.members as member (member.id)}
                    <tr>
                        <td class="max-w-xs">
                            <a
                                href={resolve(`/o/${data.organization.slug}/w/${data.world.slug}/members/${member.id}`)}
                                class="font-semibold">{member.name ?? member.email ?? mm.anonymous}</a
                            >
                            {#if member.online}
                                <span class="online-dot ms-1" title={i18n.m.presence.onlineNow}></span>
                                <span class="sr-only">{i18n.m.presence.onlineNow}</span>
                            {/if}
                            <span class="muted block truncate text-xs">{member.email ?? member.uuid}</span>
                        </td>
                        <td>{member.jobTitle ?? ""}</td>
                        <td>{member.department ?? ""}</td>
                        <td>
                            <span class="badge {member.kind === 'member' ? 'badge-accent' : ''}"
                                >{mm.kinds[member.kind]}</span
                            >
                        </td>
                        <td>
                            <div class="flex flex-wrap gap-1">
                                {#each member.tags as tag (tag)}<span class="badge">{tag}</span>{/each}
                            </div>
                        </td>
                        <td>{i18n.number(member.visitCount)}</td>
                        <td><DateTime value={member.lastSeenAt} mode="relative" /></td>
                    </tr>
                {/each}
            </tbody>
        </table>
    </div>
    {#if pages > 1}
        <nav
            class="mt-4 flex items-center justify-between gap-2"
            aria-label={i18n.t(i18n.m.common.pagination.page, { page: data.page, pages })}
        >
            {#if data.page > 1}
                <a class="btn btn-sm" href={pageHref(data.page - 1)} rel="prev">{mm.previousPage}</a>
            {:else}<span></span>{/if}
            <span class="muted text-sm">{i18n.t(i18n.m.common.pagination.page, { page: data.page, pages })}</span>
            {#if data.page < pages}
                <a class="btn btn-sm" href={pageHref(data.page + 1)} rel="next">{mm.nextPage}</a>
            {:else}<span></span>{/if}
        </nav>
    {/if}
{/if}

{#if canManage}
    <div class="mt-8 grid gap-6 lg:grid-cols-2">
        {#key form}
            <form method="POST" action="?/add" class="card space-y-4" use:enhance>
                <div>
                    <h2 class="text-lg font-bold">{mm.add}</h2>
                    <p class="muted mt-1 text-sm">{mm.addIntro}</p>
                </div>
                <Field label={i18n.m.common.labels.email} name="email" error={addErrors.email} required>
                    {#snippet children(a)}
                        <input
                            class="input"
                            {...a}
                            type="email"
                            name="email"
                            maxlength="320"
                            value={addValues.email ?? ""}
                        />
                    {/snippet}
                </Field>
                <Field label={i18n.m.common.labels.name} name="name" error={addErrors.name}>
                    {#snippet children(a)}
                        <input class="input" {...a} name="name" maxlength="200" value={addValues.name ?? ""} />
                    {/snippet}
                </Field>
                <Field label={i18n.m.common.labels.tags} name="tags" error={addErrors.tags} hint={mm.tagsHelp}>
                    {#snippet children(a)}
                        <input class="input" {...a} name="tags" list="member-tag-names" value={addValues.tags ?? ""} />
                    {/snippet}
                </Field>
                <datalist id="member-tag-names">
                    {#each data.tagNames as tag (tag)}<option value={tag}></option>{/each}
                </datalist>
                <button class="btn btn-primary" type="submit">{i18n.m.common.actions.add}</button>
            </form>
        {/key}

        <form method="POST" action="?/import" enctype="multipart/form-data" class="card space-y-4" use:enhance>
            <div>
                <h2 class="text-lg font-bold">{mm.importTitle}</h2>
                <p class="muted mt-1 text-sm">{mm.importIntro}</p>
                <p class="muted mt-1 text-sm">{mm.importProfileIntro}</p>
            </div>
            <label class="block">
                <span class="label">{mm.importFile}</span>
                <input class="input" type="file" name="file" accept=".csv,text/csv" required />
            </label>
            <button class="btn" type="submit">{mm.importSubmit}</button>
        </form>
    </div>
{/if}

<style>
    .online-dot {
        display: inline-block;
        width: 0.5rem;
        height: 0.5rem;
        border-radius: 9999px;
        background: var(--success);
        vertical-align: middle;
    }
</style>
