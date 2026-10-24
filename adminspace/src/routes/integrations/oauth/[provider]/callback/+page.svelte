<script lang="ts">
    import { onMount, tick } from "svelte";
    import { resolve } from "$app/paths";
    import AuthFrame from "$lib/components/AuthFrame.svelte";
    import { useI18n } from "$lib/i18n/context";
    import type { ActionData, PageData } from "./$types";

    let { data, form }: { data: PageData; form: ActionData } = $props();
    const i18n = useI18n();
    const m = $derived(i18n.m.integrationCenter);
    const providerName = $derived(m.providers[data.provider].name);
    const problem = $derived(form?.problem ?? data.problem);

    let tokenForm: HTMLFormElement | undefined = $state();
    let token = $state("");
    let missing = $state(false);

    onMount(() => {
        if (!data.fragment || problem) return;
        // Trello puts the token in the fragment (#token=…): read it once, then remove it from the address bar and
        // the history before sending it to the server.
        const fragment = new URLSearchParams(window.location.hash.replace(/^#/, ""));
        const value = fragment.get("token") ?? "";
        history.replaceState(history.state, "", window.location.pathname + window.location.search);
        if (!/^[A-Za-z0-9]{32,256}$/.test(value)) {
            missing = true;
            return;
        }
        token = value;
        // Submitted once the hidden field holds the token.
        void tick().then(() => tokenForm?.requestSubmit());
    });
</script>

<AuthFrame title={m.callback.title}>
    {#if problem}
        <p class="notice notice-danger" role="alert">{m.problems[problem]}</p>
        <a class="btn" href={resolve("/")}>{m.callback.back}</a>
    {:else if missing}
        <p class="notice notice-danger" role="alert">{i18n.t(m.callback.missingToken, { provider: providerName })}</p>
        <a class="btn" href={resolve("/")}>{m.callback.back}</a>
    {:else if data.fragment}
        <p aria-live="polite">{i18n.t(m.callback.working, { provider: providerName })}</p>
        <noscript
            ><p class="notice notice-warning">{i18n.t(m.callback.noScript, { provider: providerName })}</p></noscript
        >
        <form method="POST" action="?/token" bind:this={tokenForm}>
            <input type="hidden" name="state" value={data.state} />
            <input type="hidden" name="token" value={token} />
        </form>
    {/if}
</AuthFrame>
