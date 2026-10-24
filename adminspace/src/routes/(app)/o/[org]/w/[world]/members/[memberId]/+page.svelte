<script lang="ts">
    import { resolve } from "$app/paths";
    import { enhance } from "$app/forms";
    import ConfirmForm from "$lib/components/ConfirmForm.svelte";
    import DateTime from "$lib/components/DateTime.svelte";
    import Field from "$lib/components/Field.svelte";
    import FormMessage from "$lib/components/FormMessage.svelte";
    import PageHeader from "$lib/components/PageHeader.svelte";
    import { formErrors, formFeedback, formField, formOp, formValuesOf } from "$lib/components/world/formState";
    import { banSavedText } from "$lib/components/world/liveOutcome";
    import { useI18n } from "$lib/i18n/context";
    import type { ActionData, PageData } from "./$types";

    let { data, form }: { data: PageData; form: ActionData } = $props();
    const i18n = useI18n();
    const pm = $derived(i18n.m.people.member);
    const kinds = $derived(i18n.m.people.members.kinds);
    const bans = $derived(i18n.m.moderation.bans);
    const member = $derived(data.member);

    const forSave = $derived(formOp(form) === "save" || (form && formOp(form) === undefined));
    const saveErrors = $derived(forSave ? formErrors(form) : {});
    const saveValues = $derived(forSave ? formValuesOf(form) : {});
    const banErrors = $derived(formOp(form) === "ban" ? formErrors(form) : {});
    const emailTaken = $derived(formField<boolean>(form, "emailTaken") === true);
    const tagError = $derived(formField<"invalidTag" | "reservedTag" | "unknownTag">(form, "tagError"));
    const banText = $derived(banSavedText(i18n, formField<string>(form, "liveDisconnect")));
    const pp = $derived(pm.profile);
    const forProfile = $derived(formOp(form) === "profile");
    const profileErrors = $derived(forProfile ? formErrors(form) : {});
    const profileValues = $derived(forProfile ? formValuesOf(form) : {});
    const profileError = $derived(
        forProfile
            ? formField<"managerNotFound" | "managerIsSelf" | "managerCycle" | "noEmail">(form, "profileError")
            : undefined,
    );
    const profile = $derived(data.profile);
    const profileValue = (key: string, fallback: string | null | undefined) => profileValues[key] ?? fallback ?? "";
    const memberHref = (memberId: string) =>
        resolve(`/o/${data.organization.slug}/w/${data.world.slug}/members/${memberId}`);

    const value = (key: string, fallback: string | null | undefined) => saveValues[key] ?? fallback ?? "";
    const statusClass = (status: string) =>
        status === "active" ? "badge-danger" : status === "expired" ? "badge-warning" : "";
</script>

<p class="mb-2 text-sm">
    <a href={resolve(`/o/${data.organization.slug}/w/${data.world.slug}/members`)}>← {i18n.m.people.membersTitle}</a>
</p>

<PageHeader title={member.name ?? member.email ?? i18n.m.people.members.anonymous}>
    {#snippet actions()}
        {#if data.can["member.manage"]}
            <a
                class="btn"
                href={resolve(`/o/${data.organization.slug}/w/${data.world.slug}/members/${data.member.id}/export`)}
                download>{pm.exportData}</a
            >
            <ConfirmForm
                action="?/erase"
                label={pm.erase}
                title={pm.eraseTitle}
                description={pm.eraseDescription}
                confirmValue={member.email ?? member.uuid.slice(0, 8)}
            />
        {/if}
    {/snippet}
</PageHeader>

{#if profileError}
    <p class="notice notice-danger mb-4" role="alert">
        {profileError === "noEmail" ? pp.noEmail : pp.errors[profileError]}
    </p>
{:else if forProfile}
    <FormMessage form={formFeedback(form)} successText={pp.saved} />
{:else if tagError}
    <p class="notice notice-danger mb-4" role="alert">{i18n.m.people.tagErrors[tagError]}</p>
{:else if emailTaken}
    <p class="notice notice-danger mb-4" role="alert">{i18n.m.people.members.emailTaken}</p>
{:else}
    <FormMessage form={formFeedback(form)} successText={formOp(form) === "ban" ? banText : pm.saved} />
{/if}

<div class="grid grid-cols-1 gap-6 lg:grid-cols-3">
    <section class="card space-y-3 lg:col-span-1" aria-labelledby="member-facts">
        <h2 id="member-facts" class="sr-only">{pm.title}</h2>
        <dl class="space-y-3 text-sm">
            <div>
                <dt class="muted">{pm.identifier}</dt>
                <dd><code class="break-all">{member.uuid}</code></dd>
                <dd class="hint">{pm.identifierHelp}</dd>
            </div>
            <div>
                <dt class="muted">{pm.kind}</dt>
                <dd>
                    <span class="badge {member.kind === 'member' ? 'badge-accent' : ''}">{kinds[member.kind]}</span>
                </dd>
            </div>
            <div>
                <dt class="muted">{pm.visits}</dt>
                <dd>{i18n.number(member.visitCount)}</dd>
            </div>
            <div>
                <dt class="muted">{pm.lastSeen}</dt>
                <dd><DateTime value={member.lastSeenAt} /></dd>
            </div>
            <div>
                <dt class="muted">{pm.firstSeen}</dt>
                <dd><DateTime value={member.createdAt} /></dd>
            </div>
            {#if member.locale}
                <div>
                    <dt class="muted">{pm.locale}</dt>
                    <dd>{i18n.language(member.locale)} <code class="muted">({member.locale})</code></dd>
                </div>
            {/if}
            {#if member.chatId}
                <div>
                    <dt class="muted">{pm.chatId}</dt>
                    <dd><code class="break-all">{member.chatId}</code></dd>
                </div>
            {/if}
        </dl>
    </section>

    <div class="space-y-6 lg:col-span-2">
        {#if data.can["member.manage"]}
            {#key form}
                <form method="POST" action="?/save" class="card space-y-4" use:enhance>
                    <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
                        <Field label={i18n.m.common.labels.name} name="name" error={saveErrors.name}>
                            {#snippet children(a)}
                                <input
                                    class="input"
                                    {...a}
                                    name="name"
                                    maxlength="200"
                                    value={value("name", member.name)}
                                />
                            {/snippet}
                        </Field>
                        <Field label={i18n.m.common.labels.email} name="email" error={saveErrors.email}>
                            {#snippet children(a)}
                                <input
                                    class="input"
                                    {...a}
                                    type="email"
                                    name="email"
                                    maxlength="320"
                                    value={value("email", member.email)}
                                />
                            {/snippet}
                        </Field>
                    </div>
                    <Field label={pm.visitCardUrl} name="visitCardUrl" error={saveErrors.visitCardUrl}>
                        {#snippet children(a)}
                            <input
                                class="input"
                                {...a}
                                type="url"
                                name="visitCardUrl"
                                value={value("visitCardUrl", member.visitCardUrl)}
                            />
                        {/snippet}
                    </Field>
                    <Field
                        label={i18n.m.common.labels.tags}
                        name="tags"
                        error={saveErrors.tags}
                        hint={i18n.m.people.members.tagsHelp}
                    >
                        {#snippet children(a)}
                            <input
                                class="input"
                                {...a}
                                name="tags"
                                list="member-tags"
                                value={value("tags", member.tags.join(", "))}
                            />
                        {/snippet}
                    </Field>
                    <datalist id="member-tags">
                        {#each data.tagNames as tag (tag)}<option value={tag}></option>{/each}
                    </datalist>
                    <Field label={pm.kind} name="kind" error={saveErrors.kind} required>
                        {#snippet children(a)}
                            <select class="select" {...a} name="kind">
                                <option value="member" selected={value("kind", member.kind) === "member"}
                                    >{kinds.member}</option
                                >
                                <option value="guest" selected={value("kind", member.kind) === "guest"}
                                    >{kinds.guest}</option
                                >
                            </select>
                        {/snippet}
                    </Field>
                    <button class="btn btn-primary" type="submit">{i18n.m.common.actions.saveChanges}</button>
                </form>
            {/key}
        {:else}
            <div class="card">
                <p class="label">{i18n.m.common.labels.tags}</p>
                <div class="flex flex-wrap gap-1">
                    {#each member.tags as tag (tag)}<span class="badge">{tag}</span>{:else}<span class="muted"
                            >{i18n.m.common.labels.none}</span
                        >{/each}
                </div>
            </div>
        {/if}

        <section class="card space-y-4" aria-labelledby="member-profile">
            <div>
                <h2 id="member-profile" class="text-lg font-bold">{pp.title}</h2>
                <p class="muted mt-1 text-sm">{pp.intro}</p>
            </div>
            {#if !profile}
                <p class="muted text-sm">{pp.noEmail}</p>
            {:else}
                <dl class="grid grid-cols-1 gap-3 text-sm md:grid-cols-2">
                    <div>
                        <dt class="muted">{pp.jobTitle}</dt>
                        <dd>{profile.profile.jobTitle ?? pp.notSet}</dd>
                    </div>
                    <div>
                        <dt class="muted">{pp.department}</dt>
                        <dd>{profile.profile.department ?? pp.notSet}</dd>
                    </div>
                    <div>
                        <dt class="muted">{pp.workLocation}</dt>
                        <dd>{profile.profile.workLocation ?? pp.notSet}</dd>
                    </div>
                    <div>
                        <dt class="muted">{pp.reportsTo}</dt>
                        <dd>
                            {#if profile.manager}
                                {#if profile.manager.memberId}
                                    <a href={memberHref(profile.manager.memberId)}
                                        >{profile.manager.name ?? profile.manager.email}</a
                                    >
                                {:else}
                                    {profile.manager.name ?? profile.manager.email}
                                {/if}
                                {#if profile.manager.jobTitle}<span class="muted">
                                        · {profile.manager.jobTitle}</span
                                    >{/if}
                            {:else}
                                <span class="muted">{pp.noManager}</span>
                            {/if}
                        </dd>
                    </div>
                </dl>
                <div>
                    <h3 class="label">{pp.directReports}</h3>
                    {#if profile.directReports.length === 0}
                        <p class="muted text-sm">{pp.noDirectReports}</p>
                    {:else}
                        <ul class="space-y-1 text-sm">
                            {#each profile.directReports as report (report.email)}
                                <li>
                                    {#if report.memberId}
                                        <a href={memberHref(report.memberId)}>{report.name ?? report.email}</a>
                                    {:else}
                                        {report.name ?? report.email}
                                    {/if}
                                    {#if report.jobTitle}<span class="muted"> · {report.jobTitle}</span>{/if}
                                </li>
                            {/each}
                        </ul>
                    {/if}
                </div>

                {#if data.can["member.manage"] && data.profileSuggestions}
                    {#key form}
                        <form
                            method="POST"
                            action="?/profile"
                            class="space-y-4 border-t border-[var(--border)] pt-4"
                            use:enhance
                        >
                            <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
                                <Field label={pp.jobTitle} name="jobTitle" error={profileErrors.jobTitle}>
                                    {#snippet children(a)}
                                        <input
                                            class="input"
                                            {...a}
                                            name="jobTitle"
                                            maxlength="200"
                                            value={profileValue("jobTitle", profile.profile.jobTitle)}
                                        />
                                    {/snippet}
                                </Field>
                                <Field label={pp.department} name="department" error={profileErrors.department}>
                                    {#snippet children(a)}
                                        <input
                                            class="input"
                                            {...a}
                                            name="department"
                                            maxlength="200"
                                            list="profile-departments"
                                            value={profileValue("department", profile.profile.department)}
                                        />
                                    {/snippet}
                                </Field>
                                <Field
                                    label={pp.manager}
                                    name="managerEmail"
                                    error={profileErrors.managerEmail}
                                    hint={pp.managerHelp}
                                >
                                    {#snippet children(a)}
                                        <input
                                            class="input"
                                            {...a}
                                            type="email"
                                            name="managerEmail"
                                            maxlength="320"
                                            list="profile-managers"
                                            value={profileValue("managerEmail", profile.profile.managerEmail)}
                                        />
                                    {/snippet}
                                </Field>
                                <Field
                                    label={pp.workLocation}
                                    name="workLocation"
                                    error={profileErrors.workLocation}
                                    hint={pp.workLocationHelp}
                                >
                                    {#snippet children(a)}
                                        <input
                                            class="input"
                                            {...a}
                                            name="workLocation"
                                            maxlength="200"
                                            list="profile-locations"
                                            value={profileValue("workLocation", profile.profile.workLocation)}
                                        />
                                    {/snippet}
                                </Field>
                            </div>
                            <datalist id="profile-departments">
                                {#each data.profileSuggestions.departments as value (value)}<option {value}
                                    ></option>{/each}
                            </datalist>
                            <datalist id="profile-locations">
                                {#each data.profileSuggestions.workLocations as value (value)}<option {value}
                                    ></option>{/each}
                            </datalist>
                            <datalist id="profile-managers">
                                {#each data.profileSuggestions.managers as value (value)}<option {value}
                                    ></option>{/each}
                            </datalist>
                            <button class="btn btn-primary" type="submit">{pp.save}</button>
                        </form>
                    {/key}
                {/if}
            {/if}
        </section>

        <section class="card space-y-4" aria-labelledby="member-bans">
            <h2 id="member-bans" class="text-lg font-bold">{pm.bans}</h2>
            {#if data.bans.length === 0}
                <p class="muted text-sm">{pm.noBans}</p>
            {:else}
                <ul class="space-y-2 text-sm">
                    {#each data.bans as ban (ban.id)}
                        <li class="flex flex-wrap items-center gap-2">
                            <span class="badge {statusClass(ban.status)}"
                                >{bans.status[ban.status as "active" | "revoked" | "expired"]}</span
                            >
                            <span>{ban.reason}</span>
                            <span class="muted"><DateTime value={ban.createdAt} mode="date" /></span>
                            {#if ban.ipAddress}<code class="muted">{ban.ipAddress}</code>{/if}
                        </li>
                    {/each}
                </ul>
            {/if}

            {#if data.can["moderation.manage"]}
                <details>
                    <summary class="btn btn-danger btn-sm">{pm.ban}</summary>
                    <form method="POST" action="?/ban" class="mt-4 space-y-4" use:enhance>
                        <Field
                            label={bans.reason}
                            name="reason"
                            error={banErrors.reason}
                            hint={bans.reasonHelp}
                            required
                        >
                            {#snippet children(a)}<input
                                    class="input"
                                    {...a}
                                    name="reason"
                                    maxlength="1000"
                                />{/snippet}
                        </Field>
                        <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
                            <Field
                                label={bans.ipAddress}
                                name="ipAddress"
                                error={banErrors.ipAddress}
                                hint={bans.ipAddressHelp}
                            >
                                {#snippet children(a)}<input
                                        class="input font-mono"
                                        {...a}
                                        name="ipAddress"
                                        maxlength="45"
                                    />{/snippet}
                            </Field>
                            <Field label={bans.duration} name="duration" required>
                                {#snippet children(a)}
                                    <select class="select" {...a} name="duration">
                                        {#each Object.entries(bans.durations) as [key, label] (key)}
                                            <option value={key}>{label}</option>
                                        {/each}
                                    </select>
                                {/snippet}
                            </Field>
                        </div>
                        <button class="btn btn-danger" type="submit">{pm.ban}</button>
                    </form>
                </details>
            {/if}
        </section>

        <section class="card space-y-3" aria-labelledby="member-reports">
            <h2 id="member-reports" class="text-lg font-bold">{pm.reports}</h2>
            {#if data.reports.length === 0}
                <p class="muted text-sm">{pm.noReports}</p>
            {:else}
                <ul class="space-y-2 text-sm">
                    {#each data.reports as report (report.id)}
                        <li>
                            <span class="badge">{i18n.m.moderation.reports.status[report.status]}</span>
                            <span class="muted"><DateTime value={report.createdAt} mode="date" /></span>
                            <p class="mt-1">{report.comment}</p>
                        </li>
                    {/each}
                </ul>
            {/if}
        </section>
    </div>
</div>
