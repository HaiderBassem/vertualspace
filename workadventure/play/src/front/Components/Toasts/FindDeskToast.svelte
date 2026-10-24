<script lang="ts">
    import { LL } from "../../../i18n/i18n-svelte";
    import { toastStore } from "../../Stores/ToastStoreSingleton";
    import Button from "../UI/Button.svelte";
    import ToastContainer from "./ToastContainer.svelte";

    interface Props {
        /** Set by the toast store. */
        toastUuid?: string;
        /** Takes the player to the nearest free desk. */
        onFind: () => void;
        onLater: () => void;
    }

    let { toastUuid = "", onFind, onLater }: Props = $props();

    function find() {
        toastStore.removeToast(toastUuid);
        onFind();
    }

    function later() {
        toastStore.removeToast(toastUuid);
        onLater();
    }
</script>

<ToastContainer
    extraClasses="w-full min-w-72 max-w-sm sm:min-w-80 sm:max-w-md"
    {toastUuid}
    duration={30000}
    theme="secondary"
>
    <div class="flex flex-col gap-1">
        <p class="m-0 font-bold" data-testid="findDeskTitle">{$LL.area.personalArea.welcome.title()}</p>
        <p class="m-0 text-sm text-white/80" data-testid="findDeskDescription">
            {$LL.area.personalArea.welcome.description()}
        </p>
    </div>
    {#snippet buttons()}
        <Button variant="light" size="sm" dataTestId="findDeskButton" onclick={find}>
            {$LL.area.personalArea.welcome.findDesk()}
        </Button>
        <Button variant="secondary" size="sm" dataTestId="findDeskLaterButton" onclick={later}>
            {$LL.area.personalArea.welcome.later()}
        </Button>
    {/snippet}
</ToastContainer>
