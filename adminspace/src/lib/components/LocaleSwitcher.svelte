<!-- Language switcher. Each language is named in itself and tagged with its own `lang` (WCAG 3.1.2). -->
<script lang="ts">
    import { page } from "$app/state";
    import { LOCALES } from "$lib/i18n";
    import { useI18n } from "$lib/i18n/context";

    const i18n = useI18n();
    let form: HTMLFormElement | undefined = $state();
</script>

<form method="POST" action="/locale" bind:this={form} class="flex items-center gap-2">
    <input type="hidden" name="redirectTo" value={page.url.pathname + page.url.search} />
    <label class="sr-only" for="locale-switcher">{i18n.m.common.languageSwitcher}</label>
    <select
        id="locale-switcher"
        name="locale"
        class="select !min-h-9 !w-auto !py-1 text-sm"
        onchange={() => form?.requestSubmit()}
    >
        {#each LOCALES as locale (locale.tag)}
            <option value={locale.tag} lang={locale.tag} selected={locale.tag === i18n.locale}
                >{locale.nativeName}</option
            >
        {/each}
    </select>
    <noscript><button class="btn btn-sm" type="submit">{i18n.m.common.actions.confirm}</button></noscript>
</form>
