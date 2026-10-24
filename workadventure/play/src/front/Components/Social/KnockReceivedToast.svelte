<script lang="ts">
    import { LL } from "../../../i18n/i18n-svelte";
    import { toastStore } from "../../Stores/ToastStoreSingleton";
    import ToastContainer from "../Toasts/ToastContainer.svelte";
    import Button from "../UI/Button.svelte";
    import WokaFromUserId from "../Woka/WokaFromUserId.svelte";
    import { KNOCK_ANSWER_TIMEOUT_MS } from "../../Social/KnockManager";

    interface Props {
        toastUuid: string;
        knockerUserId: number;
        knockerName: string;
        onAnswer: (accept: boolean) => void;
    }

    let { toastUuid, knockerUserId, knockerName, onAnswer }: Props = $props();

    // Without an answer, the knock simply goes away: the knocker can knock again.
    const duration = KNOCK_ANSWER_TIMEOUT_MS;

    function answer(accept: boolean) {
        toastStore.removeToast(toastUuid);
        onAnswer(accept);
    }
</script>

<ToastContainer theme="secondary" extraClasses="w-full min-w-72 max-w-sm sm:min-w-80" {toastUuid} {duration}>
    <div class="flex items-center gap-3 text-start" data-testid="knock-received-toast">
        <div class="shrink-0 w-10 h-10 rounded-full bg-white/10 overflow-hidden flex items-end justify-center">
            <WokaFromUserId userId={knockerUserId} placeholderSrc="" customWidth="40px" />
        </div>
        <span>✊ {$LL.social.knock.received({ name: knockerName })}</span>
    </div>
    {#snippet buttons()}
        <Button variant="secondary" size="sm" dataTestId="knock-let-in-button" onclick={() => answer(true)}>
            {$LL.social.knock.letIn()}
        </Button>
        <Button
            variant="light"
            appearance="ghost"
            size="sm"
            dataTestId="knock-not-now-button"
            onclick={() => answer(false)}
        >
            {$LL.social.knock.notNow()}
        </Button>
    {/snippet}
</ToastContainer>
