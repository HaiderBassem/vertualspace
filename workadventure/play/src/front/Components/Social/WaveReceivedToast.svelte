<script lang="ts">
    import { LL } from "../../../i18n/i18n-svelte";
    import Avatar from "../../Chat/Components/Avatar.svelte";
    import type { PictureStore } from "../../Stores/PictureStore";
    import { toastStore } from "../../Stores/ToastStoreSingleton";
    import ToastContainer from "../Toasts/ToastContainer.svelte";
    import Button from "../UI/Button.svelte";

    interface Props {
        toastUuid: string;
        senderName: string;
        pictureStore: PictureStore | undefined;
        /** The sender answered a wave of ours: no "Wave back", to avoid waving at each other forever. */
        waveBack: boolean;
        onWaveBack: () => void;
        onGoTo: () => void;
        /** Undefined when the sender cannot be messaged (no chat, no chat account). */
        onMessage: (() => void) | undefined;
    }

    let { toastUuid, senderName, pictureStore, waveBack, onWaveBack, onGoTo, onMessage }: Props = $props();

    // Long enough to notice it when coming back to the tab, short enough not to pile up.
    const duration = 15000;

    function act(action: () => void) {
        toastStore.removeToast(toastUuid);
        action();
    }
</script>

<ToastContainer theme="secondary" extraClasses="w-full min-w-72 max-w-sm sm:min-w-80" {toastUuid} {duration}>
    <div class="flex items-center gap-3 text-start" data-testid="wave-received-toast">
        <Avatar compact {pictureStore} fallbackName={senderName} />
        <span class="wave-hand text-2xl" aria-hidden="true">👋</span>
        <span>
            {waveBack
                ? $LL.social.wave.receivedBack({ name: senderName })
                : $LL.social.wave.received({ name: senderName })}
        </span>
    </div>
    {#snippet buttons()}
        {#if !waveBack}
            <Button variant="secondary" size="sm" dataTestId="wave-back-button" onclick={() => act(onWaveBack)}>
                {$LL.social.wave.waveBack()}
            </Button>
        {/if}
        <Button variant="light" appearance="ghost" size="sm" dataTestId="wave-go-to-button" onclick={() => act(onGoTo)}>
            {$LL.social.wave.goTo()}
        </Button>
        {#if onMessage}
            {@const sendMessage = onMessage}
            <Button
                variant="light"
                appearance="ghost"
                size="sm"
                dataTestId="wave-message-button"
                onclick={() => act(sendMessage)}
            >
                {$LL.social.wave.message()}
            </Button>
        {/if}
    {/snippet}
</ToastContainer>

<style>
    /* A small wave of the hand, once, when the toast appears. Skipped for users who asked for less motion. */
    .wave-hand {
        display: inline-block;
        transform-origin: 70% 70%;
        animation: wave-hand 1.2s ease-in-out 1;
    }

    @media (prefers-reduced-motion: reduce) {
        .wave-hand {
            animation: none;
        }
    }

    @keyframes wave-hand {
        0%,
        60%,
        100% {
            transform: rotate(0deg);
        }
        10%,
        30% {
            transform: rotate(14deg);
        }
        20% {
            transform: rotate(-8deg);
        }
        40% {
            transform: rotate(-4deg);
        }
        50% {
            transform: rotate(10deg);
        }
    }
</style>
