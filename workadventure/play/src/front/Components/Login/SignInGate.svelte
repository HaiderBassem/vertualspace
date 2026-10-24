<script lang="ts">
    import { onMount } from "svelte";
    import { LL, locale } from "../../../i18n/i18n-svelte";
    import logoImg from "../images/logo.svg";
    import poweredByWorkAdventureImg from "../images/Powered_By_WorkAdventure_Big.png";
    import bgMap from "../images/map-exemple.webp";
    import type { SignInGateState } from "../../Stores/SignInGateStore";
    import Button from "../UI/Button.svelte";

    interface Props {
        gate: SignInGateState;
        /** Leaves this page for the sign-in page of the provider. Tests replace it. */
        navigate?: (url: string) => void;
    }

    let { gate, navigate = (url) => window.location.assign(url) }: Props = $props();

    type LegalPart = { text: string; href?: string };

    let redirecting = $state(false);
    let signInButton: HTMLElement | undefined = $state();

    let logo = $derived(gate.logo ?? logoImg);
    let backgroundImage = $derived(gate.backgroundImage ?? bgMap);
    let expired = $derived(gate.reason === "sessionExpired");
    let showPoweredBy = $derived(gate.logo !== undefined && gate.showPoweredBy !== false);

    // The legal URLs come from the map, so only web links are accepted: a "javascript:" URL must never become a link.
    function webUrl(url: string | null | undefined): string | undefined {
        if (url === undefined || url === null) {
            return undefined;
        }
        try {
            const parsed = new URL(url);
            return parsed.protocol === "https:" || parsed.protocol === "http:" ? parsed.toString() : undefined;
        } catch {
            return undefined;
        }
    }

    let legalLinks = $derived.by<{ label: string; href: string }[]>(() => {
        const candidates: { label: string; href: string | undefined }[] = [
            { label: $LL.login.termsOfUse(), href: webUrl(gate.legals?.termsOfUseUrl) },
            { label: $LL.login.privacyPolicy(), href: webUrl(gate.legals?.privacyPolicyUrl) },
            { label: $LL.login.cookiePolicy(), href: webUrl(gate.legals?.cookiePolicyUrl) },
        ];
        return candidates.filter((link): link is { label: string; href: string } => link.href !== undefined);
    });

    // "terms of use, privacy policy and cookie policy", written the way the visitor's language writes a list.
    let legalParts = $derived.by<LegalPart[]>(() => {
        if (legalLinks.length === 0) {
            return [];
        }
        const labels = legalLinks.map((link) => link.label);
        if (typeof Intl.ListFormat === "undefined") {
            return legalLinks.flatMap((link, index) => [
                ...(index > 0 ? [{ text: ", " }] : []),
                { text: link.label, href: link.href },
            ]);
        }
        let linkIndex = 0;
        return new Intl.ListFormat($locale, { style: "long", type: "conjunction" })
            .formatToParts(labels)
            .map((part) =>
                part.type === "element"
                    ? { text: part.value, href: legalLinks[linkIndex++].href }
                    : { text: part.value },
            );
    });

    // The translated sentence has a {links} slot. The slot is split so the links stay real elements, not HTML text.
    const LINKS_SLOT = "\u0001";
    let legalSentence = $derived($LL.login.terms({ links: LINKS_SLOT }).split(LINKS_SLOT));

    function signIn() {
        if (redirecting) {
            return;
        }
        redirecting = true;
        navigate(gate.signInUrl);
    }

    onMount(() => {
        signInButton?.focus();
    });
</script>

<!-- Coming back with the browser's back button restores this page as it was left, with the sign-in already started. -->
<svelte:window
    onpageshow={(event) => {
        if (event.persisted) {
            redirecting = false;
        }
    }}
/>

<main
    class="sign-in-gate relative z-30 flex h-full w-full flex-col items-center justify-center overflow-y-auto pointer-events-auto"
    data-testid="signInGate"
>
    <div
        class="absolute inset-0 z-0 h-full w-full bg-cover bg-center"
        style="background-image: url('{backgroundImage}');"
        aria-hidden="true"
    ></div>
    <div
        class="absolute inset-0 z-[1] h-full w-full backdrop-blur-[2px]"
        style={gate.backgroundColor !== undefined
            ? `background-color: ${gate.backgroundColor}; opacity: 0.85;`
            : "background-color: rgb(15 28 48 / 0.85);"}
        aria-hidden="true"
    ></div>

    <div
        class="relative z-10 mx-auto flex w-full max-w-[min(440px,calc(100vw-2rem))] flex-col items-center gap-6 px-4 py-10 text-center text-white"
    >
        <img
            draggable="false"
            src={logo}
            alt=""
            class="max-h-24 w-auto max-w-[260px] object-contain"
            data-testid="signInGateLogo"
        />

        <div
            class="flex w-full flex-col gap-4 rounded-2xl border border-solid border-white/10 bg-contrast/90 p-8 shadow-2xl backdrop-blur-md"
        >
            <h1 class="m-0 text-xl font-bold text-balance sm:text-2xl" data-testid="signInGateTitle">
                {expired ? $LL.login.signIn.titleSessionExpired() : $LL.login.signIn.titleFirstVisit()}
            </h1>
            <p class="m-0 text-base text-white/80" data-testid="signInGateLead">
                {expired ? $LL.login.signIn.leadSessionExpired() : $LL.login.signIn.leadFirstVisit()}
            </p>

            <Button
                bind:element={signInButton}
                variant="secondary"
                size="lg"
                class="mt-2 h-auto min-h-13 w-full whitespace-normal py-3 text-center font-bold leading-tight"
                disabled={redirecting}
                dataTestId="signInGateButton"
                aria-busy={redirecting}
                onclick={signIn}
            >
                {redirecting ? $LL.login.signIn.redirecting() : $LL.login.signIn.button()}
            </Button>

            <div class="mt-2 border-0 border-t border-solid border-white/10 pt-4 text-sm text-white/70">
                <p class="m-0 font-semibold text-white/90">{$LL.login.signIn.helpTitle()}</p>
                <p class="m-0 mt-1" data-testid="signInGateHelp">{$LL.login.signIn.help()}</p>
            </div>
        </div>

        {#if legalParts.length > 0}
            <p class="m-0 text-xs text-white/60" data-testid="signInGateLegals">
                {legalSentence[0]}{#each legalParts as part (part)}{#if part.href}<a
                            href={part.href}
                            target="_blank"
                            rel="noopener noreferrer"
                            class="text-white underline hover:text-white">{part.text}</a
                        >{:else}{part.text}{/if}{/each}{legalSentence[1] ?? ""}
            </p>
        {/if}

        {#if showPoweredBy}
            <img draggable="false" src={poweredByWorkAdventureImg} alt="Powered by WorkAdventure" class="h-12" />
        {/if}
    </div>
</main>
