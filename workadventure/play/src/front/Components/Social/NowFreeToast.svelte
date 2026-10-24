<script lang="ts">
    import { LL } from "../../../i18n/i18n-svelte";
    import Avatar from "../../Chat/Components/Avatar.svelte";
    import type { PictureStore } from "../../Stores/PictureStore";
    import { toastStore } from "../../Stores/ToastStoreSingleton";
    import ToastContainer from "../Toasts/ToastContainer.svelte";
    import Button from "../UI/Button.svelte";

    interface Props {
        toastUuid: string;
        name: string;
        pictureStore: PictureStore | undefined;
        onGoTo: () => void;
        onWave: () => void;
        /** Undefined when the person cannot be messaged (no chat, no chat account). */
        onMessage: (() => void) | undefined;
    }

    let { toastUuid, name, pictureStore, onGoTo, onWave, onMessage }: Props = $props();

    // The user asked for it: it stays long enough to be seen when coming back to the tab.
    const duration = 30000;

    function act(action: () => void) {
        toastStore.removeToast(toastUuid);
        action();
    }
</script>

<ToastContainer theme="secondary" extraClasses="w-full min-w-72 max-w-sm sm:min-w-80" {toastUuid} {duration}>
    <div class="flex items-center gap-3 text-start" data-testid="now-free-toast">
        <Avatar compact {pictureStore} fallbackName={name} />
        <span>{$LL.social.notifyWhenFree.nowFree({ name })}</span>
    </div>
    {#snippet buttons()}
        <Button variant="secondary" size="sm" dataTestId="now-free-go-to-button" onclick={() => act(onGoTo)}>
            {$LL.social.wave.goTo()}
        </Button>
        <Button
            variant="light"
            appearance="ghost"
            size="sm"
            dataTestId="now-free-wave-button"
            onclick={() => act(onWave)}
        >
            {$LL.social.wave.action()}
        </Button>
        {#if onMessage}
            {@const sendMessage = onMessage}
            <Button
                variant="light"
                appearance="ghost"
                size="sm"
                dataTestId="now-free-message-button"
                onclick={() => act(sendMessage)}
            >
                {$LL.social.wave.message()}
            </Button>
        {/if}
    {/snippet}
</ToastContainer>
