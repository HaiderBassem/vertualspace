<script lang="ts">
    import { LL, locale } from "../../../i18n/i18n-svelte";
    import { deskCardStore, mySeatStore } from "../../Stores/PersonalDeskStore";
    import { gameManager } from "../../Phaser/Game/GameManager";
    import { startDecoratingMyDesk } from "../../Phaser/Game/MapEditor/DeskDecoration";
    import type { DeskBookingSlot } from "../../Phaser/Game/MapEditor/DeskBookingSlots";
    import { getEditDenialMessage } from "../../Phaser/Game/MapEditor/EditDenial";
    import PopUpContainer from "../PopUp/PopUpContainer.svelte";
    import Button from "../UI/Button.svelte";

    // The card of the desk that was clicked in the office: whose desk it is, are they at it, what can be done with it.
    const card = $derived($deskCardStore);
    const t = $derived($LL.area.personalArea.card);

    /** When a reservation ends: the time only when it is today, the date and time otherwise. */
    function formatEnd(end: string): string {
        const date = new Date(end);
        if (Number.isNaN(date.getTime())) return end;
        const sameDay = date.toDateString() === new Date().toDateString();
        return sameDay
            ? date.toLocaleTimeString($locale, { hour: "2-digit", minute: "2-digit" })
            : date.toLocaleString($locale, { dateStyle: "medium", timeStyle: "short" });
    }

    const ownerLine = $derived.by(() => {
        if (!card) return "";
        switch (card.kind) {
            case "mine":
                return t.yours();
            case "taken":
                return t.ownedBy({ name: card.ownerName ?? card.ownerId ?? "" });
            case "free":
                return t.free();
            case "hot":
                return t.hot();
            case "reserved":
                return t.reservedFor({
                    name: card.reservation?.userName ?? card.reservation?.userId ?? "",
                    until: card.reservation ? formatEnd(card.reservation.end) : "",
                });
            case "assigned":
                return t.assigned();
            case "outOfService":
                return t.outOfService();
            case "notForYou":
                return t.notForYou();
        }
    });

    const presenceLine = $derived.by(() => {
        if (!card) return "";
        if (card.kind === "mine") return card.presence === "atDesk" ? t.youAreHere() : "";
        if (card.kind === "taken") {
            if (card.presence === "atDesk") return t.atDesk();
            if (card.presence === "inOffice") return t.inOffice();
            return t.away();
        }
        if (card.kind === "free" && card.viewerHasDesk) return t.alreadyHaveDesk();
        return "";
    });

    function close(): void {
        deskCardStore.set(undefined);
    }

    function sit(): void {
        close();
        gameManager
            .getCurrentGameScene()
            .walkToPersonalDesk()
            .catch((error) => console.error("Error while walking to the personal desk", error));
    }

    function sitHere(): void {
        const seatId = card?.seatId;
        close();
        if (!seatId) return;
        gameManager
            .getCurrentGameScene()
            .sitOnSeat(seatId)
            .catch((error) => console.error("Error while sitting down", error));
    }

    function standUp(): void {
        close();
        gameManager.getCurrentGameScene().seatController?.stand();
    }

    function decorate(): void {
        close();
        startDecoratingMyDesk(gameManager.getCurrentGameScene()).catch((error) =>
            console.error("Error while opening the editor on the personal desk", error),
        );
    }

    function formatTime(iso: string): string {
        return new Date(iso).toLocaleTimeString($locale, { hour: "2-digit", minute: "2-digit" });
    }

    /** A booking of the viewer: the times only when it is today, with the day otherwise. */
    function formatBooking(booking: { start: string; end: string }): string {
        const start = new Date(booking.start);
        const sameDay = start.toDateString() === new Date().toDateString();
        return t.booking({
            from: sameDay
                ? formatTime(booking.start)
                : start.toLocaleString($locale, {
                      weekday: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                  }),
            until: formatTime(booking.end),
        });
    }

    function slotLabel(slot: DeskBookingSlot): string {
        switch (slot.kind) {
            case "nextHours":
                return t.bookNextHours();
            case "restOfDay":
                return t.bookRestOfDay({ until: formatTime(slot.end) });
            case "tomorrow":
                return t.bookTomorrow({ from: formatTime(slot.start), until: formatTime(slot.end) });
        }
    }

    function book(slot: DeskBookingSlot): void {
        const areaId = card?.areaId;
        if (!areaId) return;
        const scene = gameManager.getCurrentGameScene();
        scene
            .bookDesk(areaId, slot)
            .then(() => scene.refreshDeskCard(areaId))
            .catch((error) => console.error("Error while booking the desk", error));
    }

    function cancelBooking(bookingId: string): void {
        const areaId = card?.areaId;
        if (!areaId) return;
        const scene = gameManager.getCurrentGameScene();
        scene
            .cancelDeskBooking(areaId, bookingId)
            .then(() => scene.refreshDeskCard(areaId))
            .catch((error) => console.error("Error while cancelling the booking", error));
    }

    function claim(): void {
        const areaId = card?.areaId;
        close();
        if (!areaId) return;
        // Walking into the free desk opens the usual claim question: the claim itself is checked by the server.
        gameManager
            .getCurrentGameScene()
            .walkToDesk(areaId)
            .catch((error) => console.error("Error while walking to the desk", error));
    }
</script>

{#if card}
    <div
        class="absolute w-fit bottom-0 left-0 right-0 pb-4 pointer-events-auto z-[150] m-auto"
        data-testid="deskCard"
        role="dialog"
        aria-labelledby="desk-card-title"
    >
        <PopUpContainer extraClasses="w-fit">
            <div class="flex flex-col gap-1 max-w-xs">
                <p class="m-0 font-bold" id="desk-card-title" data-testid="deskCardTitle">{card.deskName}</p>
                <p class="m-0" data-testid="deskCardOwner">{ownerLine}</p>
                {#if card.reservation?.forViewer}
                    <p class="m-0 text-sm text-white/80" data-testid="deskCardReservedForYou">
                        {t.reservedForYou({ until: formatEnd(card.reservation.end) })}
                    </p>
                {/if}
                {#if presenceLine}
                    <p class="m-0 text-sm text-white/80" data-testid="deskCardPresence">{presenceLine}</p>
                {/if}
                {#if card.occupantName}
                    <p class="m-0 text-sm text-white/80" data-testid="deskCardOccupant">
                        {t.occupiedBy({ name: card.occupantName })}
                    </p>
                {/if}
                {#if card.viewerBookings.length > 0}
                    <p class="m-0 mt-2 text-sm font-bold">{t.yourBookings()}</p>
                    <ul class="m-0 p-0 list-none flex flex-col gap-1" data-testid="deskCardBookings">
                        {#each card.viewerBookings as booking (booking.id)}
                            <li class="flex flex-row items-center justify-between gap-2 text-sm">
                                <span>{formatBooking(booking)}</span>
                                <Button
                                    type="button"
                                    size="xs"
                                    class="btn-outline"
                                    dataTestId="deskCardCancelBooking"
                                    onclick={() => cancelBooking(booking.id)}
                                >
                                    {t.cancelBooking()}
                                </Button>
                            </li>
                        {/each}
                    </ul>
                {/if}
                {#if card.bookingSlots}
                    <p class="m-0 mt-2 text-sm font-bold">{t.book()}</p>
                    <div class="flex flex-row flex-wrap gap-1" data-testid="deskCardBookingSlots">
                        {#each card.bookingSlots as slot (slot.kind)}
                            <Button
                                type="button"
                                size="xs"
                                variant="light"
                                disabled={!slot.available}
                                title={slot.reason ? getEditDenialMessage(`${slot.reason}: `) : undefined}
                                dataTestId={`deskCardBook-${slot.kind}`}
                                onclick={() => book(slot)}
                            >
                                {slotLabel(slot)}
                            </Button>
                        {/each}
                    </div>
                {/if}
            </div>
            {#snippet buttons()}
                <div class="flex flex-row flex-wrap justify-center w-full gap-2">
                    {#if card.viewerSitting && $mySeatStore}
                        <Button
                            type="button"
                            variant="secondary"
                            size="sm"
                            dataTestId="deskCardStand"
                            onclick={standUp}
                        >
                            {t.standUp()}
                        </Button>
                    {:else if card.kind === "mine"}
                        <Button type="button" variant="secondary" size="sm" dataTestId="deskCardSit" onclick={sit}>
                            {t.sit()}
                        </Button>
                    {:else if card.seatId}
                        <Button
                            type="button"
                            variant="secondary"
                            size="sm"
                            dataTestId="deskCardSitHere"
                            onclick={sitHere}
                        >
                            {t.sitHere()}
                        </Button>
                    {/if}
                    {#if card.kind === "mine"}
                        <Button
                            type="button"
                            variant="light"
                            size="sm"
                            dataTestId="deskCardDecorate"
                            onclick={decorate}
                        >
                            {$LL.actionbar.personalDesk.decorate()}
                        </Button>
                    {/if}
                    {#if card.kind === "free" && !card.viewerHasDesk}
                        <Button type="button" variant="secondary" size="sm" dataTestId="deskCardClaim" onclick={claim}>
                            {t.claim()}
                        </Button>
                    {/if}
                    <Button type="button" size="sm" class="btn-outline" dataTestId="deskCardClose" onclick={close}>
                        {t.close()}
                    </Button>
                </div>
            {/snippet}
        </PopUpContainer>
    </div>
{/if}
