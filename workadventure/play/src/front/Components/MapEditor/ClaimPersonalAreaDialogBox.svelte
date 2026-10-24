<script lang="ts">
    import { onMount } from "svelte";
    import { mapEditorAskToClaimPersonalAreaStore } from "../../Stores/MapEditorStore";
    import LL from "../../../i18n/i18n-svelte";
    import { gameManager } from "../../Phaser/Game/GameManager";
    import { localUserStore } from "../../Connection/LocalUserStore";
    import { toastStore } from "../../Stores/ToastStoreSingleton";
    import { startDecoratingMyDesk } from "../../Phaser/Game/MapEditor/DeskDecoration";
    import DeskClaimedToast from "../Toasts/DeskClaimedToast.svelte";
    import PopUpContainer from "../PopUp/PopUpContainer.svelte";
    import Input from "../Input/Input.svelte";
    import Button from "../UI/Button.svelte";

    let name = $state("");
    /** True if this user already owns another personal area on the map (may be replaced when claiming). */
    let alreadyHasPersonalArea = $state(false);
    /** User acknowledged that the existing personal area will be removed. */
    let replaceExistingConfirmed = $state(false);

    const mapEditorModeManager = gameManager.getCurrentGameScene().getMapEditorModeManager();

    function closeDialog() {
        mapEditorAskToClaimPersonalAreaStore.set(undefined);
    }

    function claimDesk() {
        mapEditorModeManager?.claimPersonalArea(name);
        closeDialog();
        // Say what happened and what to do with the desk now, so that its new owner is not left wondering.
        toastStore.addToast(DeskClaimedToast, {
            onDecorate: () => {
                startDecoratingMyDesk(gameManager.getCurrentGameScene()).catch((error) => {
                    console.error("Error while opening the editor on the personal desk", error);
                });
            },
        });
    }

    // function to check key press and if it is enter key then click on yes button
    function emitKeypressEvents(event: KeyboardEvent) {
        if (event.key === "Enter") {
            const claimPersonalAreaButton = document.querySelector("[data-testid=claimPersonalAreaButton]");
            claimPersonalAreaButton?.dispatchEvent(new MouseEvent("click"));
        }
    }

    onMount(() => {
        // set name to current user name
        name = gameManager.getCurrentGameScene().CurrentPlayer.playerName;

        const userUUID = localUserStore.getLocalUser()?.uuid;
        if (userUUID === undefined) {
            console.error("Unable to claim the area, your UUID is undefined");
            return;
        }
        const gameMapFrontWrapper = gameManager.getCurrentGameScene().getGameMapFrontWrapper();
        gameMapFrontWrapper.areasManager?.getAreasByPropertyType("personalAreaPropertyData").forEach((area) => {
            const property = area.areaData.properties.find((property) => property.type === "personalAreaPropertyData");
            if (
                property !== undefined &&
                property.type === "personalAreaPropertyData" &&
                property.ownerId === userUUID
            ) {
                alreadyHasPersonalArea = true;
            }
        });
    });
</script>

<div class="absolute w-fit bottom-0 left-0 right-0 pb-4 pointer-events-auto z-[150] m-auto hover:animate-none">
    {#if alreadyHasPersonalArea && !replaceExistingConfirmed}
        <PopUpContainer extraClasses="w-fit">
            <p class="m-0 mt-2 max-w-xs">{$LL.area.personalArea.alreadyHavePersonalArea()}</p>
            {#snippet buttons()}
                <div class="flex flex-row justify-center items-center w-full">
                    <Button
                        dataTestId="claimPersonalAreaReplaceConfirmButton"
                        type="button"
                        variant="secondary"
                        class="w-fit px-10"
                        onclick={(event) => {
                            event.preventDefault();
                            replaceExistingConfirmed = true;
                        }}
                    >
                        {$LL.area.personalArea.buttons.confirm()}
                    </Button>
                </div>
            {/snippet}
        </PopUpContainer>
    {:else}
        <PopUpContainer extraClasses="w-fit">
            <p class="m-0 mt-2 max-w-xs">{$LL.area.personalArea.claimDescription()}</p>
            <Input
                id="claimPersonalAreaInput"
                type="text"
                label="Your Name"
                bind:value={name}
                onkeydown={emitKeypressEvents}
            />
            {#snippet buttons()}
                <div class="flex flex-row justify-center w-full gap-2">
                    <Button
                        type="button"
                        class="btn-outline w-fit px-10 hover:bg-contrast-600/50"
                        onclick={(event) => {
                            event.preventDefault();
                            closeDialog();
                        }}
                    >
                        {$LL.area.personalArea.buttons.no()}
                    </Button>
                    <Button
                        dataTestId="claimPersonalAreaButton"
                        type="button"
                        variant="secondary"
                        class="w-fit px-10"
                        onclick={claimDesk}
                    >
                        {$LL.area.personalArea.buttons.yes()}
                    </Button>
                </div>
            {/snippet}
        </PopUpContainer>
    {/if}
</div>
