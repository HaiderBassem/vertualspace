<script lang="ts">
    import { enhance } from "$app/forms";
    import ConfirmForm from "$lib/components/ConfirmForm.svelte";
    import DateTime from "$lib/components/DateTime.svelte";
    import Field from "$lib/components/Field.svelte";
    import FormMessage from "$lib/components/FormMessage.svelte";
    import PageHeader from "$lib/components/PageHeader.svelte";
    import TableScroll from "$lib/components/TableScroll.svelte";
    import type { Messages } from "$lib/i18n";
    import { useI18n } from "$lib/i18n/context";
    import type { ActionData, PageData } from "./$types";

    let { data, form }: { data: PageData; form: ActionData } = $props();
    const i18n = useI18n();
    const m = $derived(i18n.m.platform.accounts);
    const labels = $derived(i18n.m.common.labels);

    type ErrorCode = keyof Messages["common"]["errors"];
    const errors = $derived((form && "errors" in form ? form.errors : {}) as Record<string, ErrorCode | undefined>);
    const values = $derived((form && "values" in form ? form.values : {}) as Partial<Record<"name" | "email", string>>);
    const problem = $derived(form?.problem ? m[form.problem] : form?.emailTaken ? m.emailTaken : undefined);
</script>

<PageHeader title={m.title} description={m.intro} />

<FormMessage
    form={form && "message" in form ? form : form && "updated" in form ? { success: true } : null}
    successText={m.updated}
/>
{#if problem}<p class="notice notice-danger mb-4" role="alert">{problem}</p>{/if}

{#if form && "resetLinkSent" in form && form.resetLinkSent}
    <p class="notice notice-success mb-6" aria-live="polite">{i18n.t(m.resetLinkSent, { email: form.forEmail })}</p>
{/if}
{#if form && "temporaryPassword" in form && form.temporaryPassword}
    <section class="notice notice-success mb-6 space-y-2" aria-live="polite">
        <p>{i18n.t(m.temporaryPassword, { email: form.forEmail })}</p>
        <input
            class="input font-mono"
            readonly
            value={form.temporaryPassword}
            aria-label={i18n.m.shell.auth.password}
            onfocus={(event) => event.currentTarget.select()}
        />
    </section>
{/if}

<details class="card mb-8" open={Boolean(form && "errors" in form)}>
    <summary class="cursor-pointer text-lg font-bold">{m.create}</summary>
    <form method="POST" action="?/create" use:enhance class="mt-4 grid gap-4 md:grid-cols-2">
        <Field label={labels.name} name="name" required error={errors.name}>
            {#snippet children(a)}<input
                    class="input"
                    {...a}
                    name="name"
                    maxlength="200"
                    value={values.name ?? ""}
                />{/snippet}
        </Field>
        <Field label={labels.email} name="email" required error={errors.email}>
            {#snippet children(a)}
                <input class="input" type="email" {...a} name="email" maxlength="320" value={values.email ?? ""} />
            {/snippet}
        </Field>
        <label class="flex items-start gap-2 md:col-span-2">
            <input type="checkbox" name="isSuperadmin" class="mt-1" />
            <span
                ><span class="font-semibold">{m.superadmin}</span><br /><span class="hint">{m.superadminHelp}</span
                ></span
            >
        </label>
        <div class="md:col-span-2">
            <button class="btn btn-primary" type="submit">{i18n.m.common.actions.create}</button>
        </div>
    </form>
</details>

<TableScroll label={m.title}>
    <table class="table">
        <thead>
            <tr>
                <th scope="col">{labels.name}</th>
                <th scope="col">{labels.status}</th>
                <th scope="col">{i18n.m.shell.nav.organizations}</th>
                <th scope="col">{m.lastLogin}</th>
                <th scope="col"><span class="sr-only">{labels.actions}</span></th>
            </tr>
        </thead>
        <tbody>
            {#each data.accounts as account (account.id)}
                <tr>
                    <td>
                        <div class="font-semibold">{account.name}</div>
                        <div class="muted text-sm" dir="ltr">{account.email}</div>
                    </td>
                    <td>
                        <div class="flex flex-wrap gap-1">
                            <span class="badge {account.status === 'active' ? 'badge-success' : 'badge-danger'}"
                                >{m.status[account.status]}</span
                            >
                            {#if account.isSuperadmin}<span class="badge badge-accent">{m.superadmin}</span>{/if}
                            {#if account.mfa}<span class="badge">{m.mfa}</span>{/if}
                            {#if account.locked}<span class="badge badge-warning">{m.locked}</span>{/if}
                            {#if account.mustChangePassword}
                                <span class="badge badge-warning">{i18n.m.shell.accountAdmin.temporaryPassword}</span>
                            {/if}
                        </div>
                    </td>
                    <td>{i18n.number(account.organizations)}</td>
                    <td><DateTime value={account.lastLoginAt} mode="relative" /></td>
                    <td>
                        <div class="flex flex-wrap justify-end gap-2">
                            {#if account.locked}
                                <form method="POST" action="?/unlock" use:enhance>
                                    <input type="hidden" name="id" value={account.id} />
                                    <button class="btn btn-sm" type="submit">{m.unlock}</button>
                                </form>
                            {/if}
                            <ConfirmForm
                                action="?/toggleSuperadmin"
                                label={account.isSuperadmin ? m.revokeSuperadmin : m.grantSuperadmin}
                                description={m.superadminHelp}
                                fields={{ id: account.id }}
                                danger={account.isSuperadmin}
                                small
                            />
                            {#if account.id !== data.meId}
                                {#if account.mfa}
                                    <ConfirmForm
                                        action="?/resetMfa"
                                        label={i18n.m.shell.accountAdmin.resetMfa}
                                        description={i18n.m.shell.accountAdmin.resetMfaDescription}
                                        fields={{ id: account.id }}
                                        small
                                    />
                                {/if}
                                <ConfirmForm
                                    action="?/resetPassword"
                                    label={m.resetPassword}
                                    description={m.resetPasswordDescription}
                                    fields={{ id: account.id }}
                                    danger={false}
                                    small
                                />
                                <ConfirmForm
                                    action="?/toggleStatus"
                                    label={account.status === "active" ? m.disable : m.enable}
                                    fields={{ id: account.id }}
                                    danger={account.status === "active"}
                                    small
                                />
                            {/if}
                        </div>
                    </td>
                </tr>
            {/each}
        </tbody>
    </table>
</TableScroll>
