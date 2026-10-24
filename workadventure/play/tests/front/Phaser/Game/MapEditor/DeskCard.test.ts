import { describe, expect, it } from "vitest";
import { deskAt, describeDesk, presenceAt } from "../../../../../src/front/Phaser/Game/MapEditor/DeskCard";

interface DeskOptions {
    ownerId?: string | null;
    mode?: "dynamic" | "static";
    disabled?: boolean;
    allowedTags?: string[];
}

function desk(id: string, options: DeskOptions = {}, x = 0) {
    return {
        id,
        name: `Desk ${id}`,
        x,
        y: 0,
        width: 64,
        height: 64,
        properties: [
            {
                id: `${id}-p`,
                type: "personalAreaPropertyData" as const,
                accessClaimMode: options.mode ?? ("dynamic" as const),
                allowedTags: options.allowedTags ?? [],
                ownerId: options.ownerId ?? null,
                ...(options.disabled === undefined ? {} : { disabled: options.disabled }),
            },
        ],
    };
}

const viewer = { uuid: "alice@example.com", tags: [] as string[], hasDesk: false };

describe("describeDesk", () => {
    it("says it is the viewer's own desk", () => {
        expect(describeDesk(desk("1", { ownerId: "alice@example.com" }), viewer)).toMatchObject({
            kind: "mine",
            deskName: "Desk 1",
            ownerId: "alice@example.com",
        });
    });

    it("says whose desk it is when it belongs to somebody else", () => {
        expect(describeDesk(desk("2", { ownerId: "bob@example.com" }), viewer)).toMatchObject({
            kind: "taken",
            ownerId: "bob@example.com",
        });
    });

    it("keeps a desk its owner's even when it is out of service", () => {
        expect(describeDesk(desk("3", { ownerId: "bob@example.com", disabled: true }), viewer)?.kind).toBe("taken");
    });

    it("tells why a free desk cannot be claimed", () => {
        expect(describeDesk(desk("4", { disabled: true }), viewer)?.kind).toBe("outOfService");
        expect(describeDesk(desk("5", { mode: "static" }), viewer)?.kind).toBe("assigned");
        expect(describeDesk(desk("6", { allowedTags: ["design"] }), viewer)?.kind).toBe("notForYou");
    });

    it("offers a free desk to a viewer who can claim it, and says so when they already have one", () => {
        expect(describeDesk(desk("7"), viewer)).toMatchObject({ kind: "free", viewerHasDesk: false });
        expect(describeDesk(desk("7"), { ...viewer, hasDesk: true })).toMatchObject({
            kind: "free",
            viewerHasDesk: true,
        });
        expect(describeDesk(desk("8", { allowedTags: ["design"] }), { ...viewer, tags: ["design"] })?.kind).toBe(
            "free",
        );
    });

    it("is nothing for an area that is not a desk, and never mine for somebody unknown", () => {
        expect(describeDesk({ id: "room", name: "Meeting room", properties: [] }, viewer)).toBeUndefined();
        expect(describeDesk(desk("9", { ownerId: "bob@example.com" }), { ...viewer, uuid: undefined })?.kind).toBe(
            "taken",
        );
    });
});

describe("describeDesk with desk types and reservations", () => {
    const now = Date.parse("2026-10-24T10:00:00Z");
    const withProperty = (area: ReturnType<typeof desk>, extra: Record<string, unknown>) => ({
        ...area,
        properties: area.properties.map((property) => ({ ...property, ...extra })),
    });

    it("shows the name saved on the desk, and treats the co-owners of a shared desk as owners", () => {
        const shared = withProperty(desk("s", { ownerId: "bob@example.com", mode: "static" }), {
            deskType: "shared",
            coOwnerIds: ["alice@example.com"],
            ownerName: "Bob",
        });
        expect(describeDesk(shared, viewer, now)).toMatchObject({ kind: "mine", deskType: "shared", ownerName: "Bob" });
        expect(describeDesk(shared, { ...viewer, uuid: "carol@example.com" }, now)?.kind).toBe("taken");
    });

    it("says a hot desk is open to anyone it is open to", () => {
        const hot = withProperty(desk("h", { allowedTags: ["sales"] }), { deskType: "hot" });
        expect(describeDesk(hot, { ...viewer, tags: ["sales"] }, now)?.kind).toBe("hot");
        expect(describeDesk(hot, viewer, now)?.kind).toBe("notForYou");
    });

    it("says for whom a free desk is kept, and lets that person use it", () => {
        const kept = withProperty(desk("k", { allowedTags: ["design"] }), {
            reservations: [
                {
                    id: "r",
                    userId: "dan@example.com",
                    userName: "Dan",
                    start: "2026-10-24T09:00:00Z",
                    end: "2026-10-24T12:00:00Z",
                },
            ],
        });
        expect(describeDesk(kept, viewer, now)).toMatchObject({
            kind: "reserved",
            reservation: { userId: "dan@example.com", userName: "Dan", forViewer: false },
        });
        expect(describeDesk(kept, { ...viewer, uuid: "dan@example.com" }, now)).toMatchObject({
            kind: "free",
            reservation: { forViewer: true },
        });
        // After the reservation the desk is for the design team again.
        expect(describeDesk(kept, viewer, Date.parse("2026-10-24T13:00:00Z"))?.kind).toBe("notForYou");
    });

    it("says that only an administrator gives a shared desk that nobody has yet", () => {
        expect(describeDesk(withProperty(desk("e"), { deskType: "shared" }), viewer, now)?.kind).toBe("assigned");
    });
});

describe("booking a hot desk from its card", () => {
    // Local times: the slots follow the viewer's own working day, wherever the tests run.
    const now = new Date(2026, 9, 24, 10, 0).getTime();
    const hotDesk = (reservations: { id: string; userId: string; start: string; end: string }[] = [], extra = {}) => {
        const area = desk("h");
        return {
            ...area,
            properties: area.properties.map((property) => ({
                ...property,
                deskType: "hot" as const,
                reservations,
                ...extra,
            })),
        };
    };
    const local = (day: number, hour: number) => new Date(2026, 9, day, hour, 0).toISOString();

    it("offers the next hours, the rest of the day and tomorrow", () => {
        const slots = describeDesk(hotDesk(), viewer, now)?.bookingSlots;
        expect(slots).toEqual([
            { kind: "nextHours", start: local(24, 10), end: local(24, 12), available: true },
            { kind: "restOfDay", start: local(24, 10), end: local(24, 19), available: true },
            { kind: "tomorrow", start: local(25, 9), end: local(25, 19), available: true },
        ]);
    });

    it("tells which bookings someone else's booking or one of the viewer's on another desk prevents", () => {
        const bob = { id: "b", userId: "bob@example.com", start: local(24, 11), end: local(24, 13) };
        const elsewhere = { reservations: [{ id: "x", userId: viewer.uuid, start: local(25, 8), end: local(25, 10) }] };
        const slots = describeDesk(hotDesk([bob]), { ...viewer, otherDesks: [elsewhere] }, now)?.bookingSlots;
        expect(slots?.map((slot) => [slot.kind, slot.available, slot.reason])).toEqual([
            ["nextHours", false, "BOOKING_CONFLICT"],
            ["restOfDay", false, "BOOKING_CONFLICT"],
            ["tomorrow", false, "BOOKING_DOUBLE"],
        ]);
    });

    it("offers no booking on other desks, out of service, or to another team", () => {
        expect(describeDesk(desk("1"), viewer, now)?.bookingSlots).toBeUndefined();
        expect(describeDesk(hotDesk([], { disabled: true }), viewer, now)?.bookingSlots).toBeUndefined();
        expect(describeDesk(hotDesk([], { allowedTags: ["design"] }), viewer, now)?.bookingSlots).toBeUndefined();
        expect(describeDesk(hotDesk(), { ...viewer, uuid: undefined }, now)?.bookingSlots).toBeUndefined();
    });

    it("does not offer again a time the viewer already booked the desk for", () => {
        const mine = { id: "m", userId: viewer.uuid, start: local(24, 10), end: local(24, 12) };
        expect(describeDesk(hotDesk([mine]), viewer, now)?.bookingSlots?.map((slot) => slot.kind)).toEqual([
            "tomorrow",
        ]);
    });

    it("lists the viewer's own bookings that are not over, soonest first", () => {
        const card = describeDesk(
            hotDesk([
                { id: "late", userId: viewer.uuid, start: local(26, 9), end: local(26, 12) },
                { id: "past", userId: viewer.uuid, start: local(23, 9), end: local(23, 12) },
                { id: "bob", userId: "bob@example.com", start: local(25, 9), end: local(25, 12) },
                { id: "soon", userId: viewer.uuid, start: local(24, 14), end: local(24, 16) },
            ]),
            viewer,
            now,
        );
        expect(card?.viewerBookings.map((booking) => booking.id)).toEqual(["soon", "late"]);
    });

    it("offers only tomorrow late in the evening, and the whole working day early in the morning", () => {
        const evening = new Date(2026, 9, 24, 18, 0).getTime();
        expect(describeDesk(hotDesk(), viewer, evening)?.bookingSlots?.map((slot) => slot.kind)).toEqual([
            "nextHours",
            "tomorrow",
        ]);
        const early = new Date(2026, 9, 24, 6, 30).getTime();
        expect(describeDesk(hotDesk(), viewer, early)?.bookingSlots?.[1]).toMatchObject({
            kind: "restOfDay",
            start: local(24, 9),
            end: local(24, 19),
            available: true,
        });
    });
});

describe("presenceAt", () => {
    const area = { x: 100, y: 100, width: 64, height: 64 };

    it("is at the desk inside it, in the office elsewhere, away when not in the office", () => {
        expect(presenceAt({ x: 130, y: 130 }, area)).toBe("atDesk");
        expect(presenceAt({ x: 100, y: 164 }, area)).toBe("atDesk");
        expect(presenceAt({ x: 300, y: 130 }, area)).toBe("inOffice");
        expect(presenceAt(undefined, area)).toBe("away");
    });
});

describe("deskAt", () => {
    const meeting = { id: "room", name: "Meeting", x: 0, y: 0, width: 400, height: 400, properties: [] };

    it("finds the desk under a point, ignoring other areas around it", () => {
        const areas = [meeting, desk("a", {}, 0), desk("b", {}, 100)];

        expect(deskAt(areas, { x: 120, y: 20 })?.id).toBe("b");
        expect(deskAt(areas, { x: 20, y: 20 })?.id).toBe("a");
        expect(deskAt(areas, { x: 300, y: 300 })).toBeUndefined();
    });
});
