<script lang="ts">
    import { LL } from "../../../i18n/i18n-svelte";
    import ToastContainer from "../Toasts/ToastContainer.svelte";
    import Button from "../UI/Button.svelte";
    import { IconLock } from "@wa-icons";

    interface Props {
        toastUuid: string;
        /** True once knocked, while waiting for a member to answer. */
        waiting: boolean;
        onKnock: () => void;
    }

    let { toastUuid, waiting, onKnock }: Props = $props();
</script>

<!-- No duration: shown as long as the user stands next to the locked conversation. -->
<ToastContainer theme="secondary" extraClasses="w-full min-w-72 max-w-sm sm:min-w-80" {toastUuid}>
    <div class="flex items-center gap-3 text-start" data-testid="knock-prompt">
        <IconLock font-size="20" class="shrink-0" aria-hidden="true" />
        <div class="flex flex-col">
            <span class="font-bold">{$LL.social.knock.prompt()}</span>
            {#if waiting}
                <span class="text-sm opacity-80" aria-live="polite">{$LL.social.knock.waiting()}</span>
            {/if}
        </div>
    </div>
    {#snippet buttons()}
        <Button variant="secondary" size="sm" dataTestId="knock-button" disabled={waiting} onclick={onKnock}>
            <span aria-hidden="true">✊</span>
            {$LL.social.knock.knock()}
        </Button>
    {/snippet}
</ToastContainer>
