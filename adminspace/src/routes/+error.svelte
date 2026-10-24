<!-- Error page: localized, with the request id to quote to support. Never shows internal details. -->
<script lang="ts">
    import { resolve } from "$app/paths";
    import { page } from "$app/state";
    import Icon from "$lib/components/Icon.svelte";
    import { useI18n } from "$lib/i18n/context";

    const i18n = useI18n();
    const e = $derived(i18n.m.app.errorPage);
    const errors = $derived(i18n.m.common.errors);
    const suspended = $derived(page.status === 403 && page.error?.message === "organizationSuspended");
    const title = $derived(
        suspended
            ? e.suspendedTitle
            : page.status === 404
              ? e.notFoundTitle
              : page.status === 403
                ? e.forbiddenTitle
                : page.status === 429
                  ? e.rateLimitedTitle
                  : e.errorTitle,
    );
    const text = $derived(
        suspended
            ? e.suspended
            : page.status === 404
              ? errors.notFound
              : page.status === 403
                ? errors.forbidden
                : page.status === 429
                  ? i18n.m.shell.auth.rateLimited
                  : errors.generic,
    );
</script>

<svelte:head><title>{title} · {i18n.m.common.appName}</title></svelte:head>

<main id="main" class="flex min-h-[70dvh] items-center justify-center px-4 py-12">
    <div class="max-w-md text-center">
        <span
            class="mb-5 inline-flex h-12 w-12 items-center justify-center rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] text-[var(--text-muted)]"
        >
            <Icon name={suspended ? "lock" : page.status === 404 ? "search" : "alert"} size={22} />
        </span>
        <p class="muted font-mono text-sm">{page.status}</p>
        <h1 class="mt-1 text-2xl font-semibold">{title}</h1>
        <p class="muted mt-2">{text}</p>
        {#if page.error?.requestId}
            <p class="muted mt-3 text-xs">{i18n.t(e.requestId, { id: page.error.requestId })}</p>
        {/if}
        <a class="btn mt-6" href={resolve("/")}>{e.home}</a>
    </div>
</main>
