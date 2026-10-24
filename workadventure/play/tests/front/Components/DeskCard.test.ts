import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { flushSync, mount, unmount } from "svelte";
import { get } from "svelte/store";
import DeskCard from "../../../src/front/Components/MapEditor/DeskCard.svelte";
import { deskCardStore, mySeatStore } from "../../../src/front/Stores/PersonalDeskStore";
import type { DeskCardInfo } from "../../../src/front/Phaser/Game/MapEditor/DeskCard";

const { scene, startDecoratingMyDesk } = vi.hoisted(() => ({
    scene: {
        walkToPersonalDesk: vi.fn(() => Promise.resolve()),
        walkToDesk: vi.fn((_areaId: string) => Promise.resolve()),
        sitOnSeat: vi.fn((_seatId: string) => Promise.resolve(true)),
        seatController: { stand: vi.fn() },
        bookDesk: vi.fn((_areaId: string, _slot: { start: string; end: string }) => Promise.resolve()),
        cancelDeskBooking: vi.fn((_areaId: string, _bookingId: string) => Promise.resolve()),
        refreshDeskCard: vi.fn((_areaId: string) => {}),
    },
    startDecoratingMyDesk: vi.fn(() => Promise.resolve()),
}));

vi.mock("../../../src/front/Phaser/Game/GameManager", () => ({ gameManager: { getCurrentGameScene: () => scene } }));
vi.mock("../../../src/front/Phaser/Game/MapEditor/DeskDecoration", () => ({ startDecoratingMyDesk }));
vi.mock("../../../src/i18n/i18n-svelte", async () => {
    const { readable } = await import("svelte/store");
    const LL = readable({
        area: {
            personalArea: {
                card: {
                    yours: () => "Your desk",
                    ownedBy: ({ name }: { name: string }) => `${name}'s desk`,
                    free: () => "Free desk",
                    assigned: () => "An administrator gives this desk.",
                    outOfService: () => "This desk is out of service.",
                    notForYou: () => "This desk is for another team.",
                    alreadyHaveDesk: () => "You already have a desk.",
                    atDesk: () => "At the desk now",
                    inOffice: () => "In the office, not at the desk",
                    away: () => "Not in the office right now",
                    youAreHere: () => "You are at your desk",
                    sit: () => "Sit at my desk",
                    claim: () => "Claim this desk",
                    close: () => "Close",
                    hot: () => "Hot desk: anyone can sit here",
                    reservedFor: ({ name, until }: { name: string; until: string }) =>
                        `Kept for ${name} until ${until}`,
                    reservedForYou: ({ until }: { until: string }) => `Kept for you until ${until}`,
                    occupiedBy: ({ name }: { name: string }) => `${name} is sitting here`,
                    sitHere: () => "Sit here",
                    standUp: () => "Stand up",
                    book: () => "Book this desk",
                    bookNextHours: () => "Next 2 hours",
                    bookRestOfDay: ({ until }: { until: string }) => `Today until ${until}`,
                    bookTomorrow: ({ from, until }: { from: string; until: string }) => `Tomorrow ${from}–${until}`,
                    yourBookings: () => "Your bookings",
                    booking: ({ from, until }: { from: string; until: string }) => `${from} – ${until}`,
                    cancelBooking: () => "Cancel",
                },
                errors: {
                    bookingConflict: () => "Someone already booked this desk for part of that time.",
                },
            },
        },
        actionbar: { personalDesk: { decorate: () => "Decorate my desk" } },
    });
    // The card reads LL by name, the explanation of a refused booking (EditDenial) by default import.
    return { locale: readable("en-US"), LL, default: LL };
});

const card = (overrides: Partial<DeskCardInfo>): DeskCardInfo => ({
    areaId: "desk-3",
    deskName: "Desk 3",
    kind: "free",
    deskType: "assigned",
    ownerId: null,
    viewerHasDesk: false,
    viewerBookings: [],
    ...overrides,
});

describe("DeskCard", () => {
    const originalAnimate = Object.getOwnPropertyDescriptor(Element.prototype, "animate");
    beforeAll(() => {
        // jsdom has no Web Animations API, which the pop-up container's transition needs.
        Object.defineProperty(Element.prototype, "animate", {
            configurable: true,
            writable: true,
            value: vi.fn(() => ({
                cancel: vi.fn(),
                finish: vi.fn(),
                onfinish: null,
                currentTime: 0,
                finished: Promise.resolve(),
            })),
        });
    });
    afterAll(() => {
        if (originalAnimate) Object.defineProperty(Element.prototype, "animate", originalAnimate);
        else Reflect.deleteProperty(Element.prototype, "animate");
    });

    let target: HTMLElement;
    let component: ReturnType<typeof mount> | undefined;
    const text = (id: string) => target.querySelector(`[data-testid="${id}"]`)?.textContent?.trim();
    const button = (id: string) => target.querySelector<HTMLButtonElement>(`[data-testid="${id}"]`);

    function show(info: DeskCardInfo): void {
        deskCardStore.set(info);
        flushSync(() => {
            component = mount(DeskCard, { target });
        });
    }

    beforeEach(() => {
        vi.clearAllMocks();
        target = document.createElement("div");
        document.body.append(target);
    });

    afterEach(async () => {
        const mounted = component;
        component = undefined;
        if (mounted) await unmount(mounted);
        deskCardStore.set(undefined);
        target.remove();
    });

    it("tells whose desk it is and that they are at it", () => {
        show(card({ kind: "taken", ownerId: "bob@example.com", ownerName: "Bob Martin", presence: "atDesk" }));

        expect(text("deskCardTitle")).toBe("Desk 3");
        expect(text("deskCardOwner")).toBe("Bob Martin's desk");
        expect(text("deskCardPresence")).toBe("At the desk now");
        expect(button("deskCardClaim")).toBeNull();
        expect(button("deskCardSit")).toBeNull();
    });

    it("falls back to the owner's email when their name is not known, and says when they are away", () => {
        show(card({ kind: "taken", ownerId: "bob@example.com", presence: "away" }));

        expect(text("deskCardOwner")).toBe("bob@example.com's desk");
        expect(text("deskCardPresence")).toBe("Not in the office right now");
    });

    it("lets the owner sit at their desk and decorate it", () => {
        show(card({ kind: "mine", ownerId: "alice@example.com", presence: "inOffice" }));

        expect(text("deskCardOwner")).toBe("Your desk");
        button("deskCardSit")?.click();
        expect(scene.walkToPersonalDesk).toHaveBeenCalledOnce();
        expect(get(deskCardStore)).toBeUndefined();
    });

    it("offers to sit to somebody standing at their desk, and to decorate it", () => {
        show(card({ kind: "mine", ownerId: "alice@example.com", presence: "atDesk" }));

        expect(text("deskCardPresence")).toBe("You are at your desk");
        expect(button("deskCardSit")).not.toBeNull();
        button("deskCardDecorate")?.click();
        expect(startDecoratingMyDesk).toHaveBeenCalledOnce();
    });

    it("offers to stand up to somebody sitting at the desk", () => {
        mySeatStore.set({ seatId: "entity:chair", x: 1, y: 2, direction: "Up", deskAreaId: "desk-3" });
        show(card({ kind: "mine", ownerId: "alice@example.com", presence: "atDesk", viewerSitting: true }));

        expect(button("deskCardSit")).toBeNull();
        button("deskCardStand")?.click();
        expect(scene.seatController.stand).toHaveBeenCalledOnce();
        mySeatStore.set(undefined);
    });

    it("lets anyone sit at a hot desk, and says who sits there", () => {
        show(card({ kind: "hot", deskType: "hot", seatId: "entity:chair-2", occupantName: "Carol" }));

        expect(text("deskCardOwner")).toBe("Hot desk: anyone can sit here");
        expect(text("deskCardOccupant")).toBe("Carol is sitting here");
        button("deskCardSitHere")?.click();
        expect(scene.sitOnSeat).toHaveBeenCalledWith("entity:chair-2");
        expect(get(deskCardStore)).toBeUndefined();
    });

    it("says for whom a desk is kept, and until when", () => {
        const end = new Date(Date.now() + 60 * 60 * 1000);
        end.setSeconds(0, 0);
        show(
            card({
                kind: "reserved",
                reservation: { userId: "dan@example.com", userName: "Dan", end: end.toISOString(), forViewer: false },
            }),
        );

        expect(text("deskCardOwner")).toMatch(/^Kept for Dan until /);
        expect(button("deskCardSitHere")).toBeNull();
        expect(button("deskCardClaim")).toBeNull();
    });

    it("tells the person a desk is kept for", () => {
        show(
            card({
                kind: "hot",
                deskType: "hot",
                seatId: "entity:chair-2",
                reservation: { userId: "alice@example.com", end: "2099-01-01T10:00:00.000Z", forViewer: true },
            }),
        );

        expect(text("deskCardReservedForYou")).toMatch(/^Kept for you until /);
    });

    it("books a hot desk, and offers only the bookings the server will accept", async () => {
        const tomorrow = {
            kind: "tomorrow" as const,
            start: "2099-01-02T08:00:00.000Z",
            end: "2099-01-02T18:00:00.000Z",
        };
        show(
            card({
                kind: "hot",
                deskType: "hot",
                bookingSlots: [
                    {
                        kind: "nextHours",
                        start: "2099-01-01T10:00:00.000Z",
                        end: "2099-01-01T12:00:00.000Z",
                        available: false,
                        reason: "BOOKING_CONFLICT",
                    },
                    { ...tomorrow, available: true },
                ],
            }),
        );

        const taken = button("deskCardBook-nextHours");
        expect(taken?.disabled).toBe(true);
        expect(taken?.title).toBe("Someone already booked this desk for part of that time.");
        expect(text("deskCardBook-tomorrow")).toMatch(/^Tomorrow /);

        button("deskCardBook-tomorrow")?.click();
        expect(scene.bookDesk).toHaveBeenCalledWith("desk-3", expect.objectContaining(tomorrow));
        await Promise.resolve();
        expect(scene.refreshDeskCard).toHaveBeenCalledWith("desk-3");
    });

    it("lists the viewer's bookings of the desk and cancels one", () => {
        show(
            card({
                kind: "hot",
                deskType: "hot",
                viewerBookings: [{ id: "b1", start: "2099-01-02T08:00:00.000Z", end: "2099-01-02T18:00:00.000Z" }],
            }),
        );

        expect(target.querySelectorAll('[data-testid="deskCardBookings"] li')).toHaveLength(1);
        button("deskCardCancelBooking")?.click();
        expect(scene.cancelDeskBooking).toHaveBeenCalledWith("desk-3", "b1");
    });

    it("offers a free desk, and walks there to claim it", () => {
        show(card({ kind: "free" }));

        expect(text("deskCardOwner")).toBe("Free desk");
        button("deskCardClaim")?.click();
        expect(scene.walkToDesk).toHaveBeenCalledWith("desk-3");
    });

    it("does not offer a free desk to somebody who already has one", () => {
        show(card({ kind: "free", viewerHasDesk: true }));

        expect(text("deskCardPresence")).toBe("You already have a desk.");
        expect(button("deskCardClaim")).toBeNull();
    });

    it("says why a desk cannot be taken", () => {
        show(card({ kind: "assigned" }));
        expect(text("deskCardOwner")).toBe("An administrator gives this desk.");
        expect(button("deskCardClaim")).toBeNull();
    });

    it("closes", () => {
        show(card({ kind: "free" }));

        button("deskCardClose")?.click();

        expect(get(deskCardStore)).toBeUndefined();
    });
});
