<script lang="ts">
    import { LL } from "../../../i18n/i18n-svelte";
    import { toastStore } from "../../Stores/ToastStoreSingleton";
    import Button from "../UI/Button.svelte";
    import ToastContainer from "./ToastContainer.svelte";

    interface Props {
        /** Set by the toast store. */
        toastUuid?: string;
        /** Takes the player to their desk and opens the object picker. */
        onDecorate: () => void;
    }

    let { toastUuid = "", onDecorate }: Props = $props();

    function decorate() {
        toastStore.removeToast(toastUuid);
        onDecorate();
    }
</script>

<ToastContainer
    extraClasses="w-full min-w-72 max-w-sm sm:min-w-80 sm:max-w-md"
    {toastUuid}
    duration={15000}
    theme="success"
>
    <div class="flex flex-col gap-1">
        <p class="m-0 font-bold" data-testid="deskClaimedTitle">{$LL.area.personalArea.claimed.title()}</p>
        <p class="m-0 text-sm text-white/80" data-testid="deskClaimedDescription">
            {$LL.area.personalArea.claimed.description()}
        </p>
    </div>
    {#snippet buttons()}
        <Button variant="secondary" size="sm" dataTestId="decorateDeskButton" onclick={decorate}>
            {$LL.actionbar.personalDesk.decorate()}
        </Button>
    {/snippet}
</ToastContainer>
