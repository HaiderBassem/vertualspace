/**
 * "Who's in" without a database (src/lib/presence/model.ts): WorkAdventure's availability statuses to what the page
 * shows (unknown values are "online", as the contract asks), the lifetime of a report (counted from its reception,
 * clamped), staleness, the same person reported twice, and the grouping by world then room with the counts.
 */
import { describe, expect, it } from "vitest";
import {
    MAX_TTL_SECONDS,
    MIN_TTL_SECONDS,
    PRESENCE_STATUSES,
    clampTtl,
    dedupePresence,
    groupPresence,
    isReportFresh,
    isoOrNull,
    presenceStatus,
    reportExpiry,
    statusTone,
    type PresenceDirectory,
    type PresenceEntry,
} from "../src/lib/presence/model";
import { messagesFor } from "../src/lib/i18n";

describe("availability status", () => {
    it("maps every status WorkAdventure names", () => {
        expect(
            Object.fromEntries(
                [
                    "ONLINE",
                    "AWAY",
                    "BUSY",
                    "DO_NOT_DISTURB",
                    "BACK_IN_A_MOMENT",
                    "SILENT",
                    "JITSI",
                    "BBB",
                    "DENY_PROXIMITY_MEETING",
                    "SPEAKER",
                ].map((raw) => [raw, presenceStatus(raw)]),
            ),
        ).toEqual({
            ONLINE: "online",
            AWAY: "away",
            BUSY: "busy",
            DO_NOT_DISTURB: "doNotDisturb",
            BACK_IN_A_MOMENT: "backInAMoment",
            SILENT: "silent",
            JITSI: "inMeeting",
            BBB: "inMeeting",
            DENY_PROXIMITY_MEETING: "noProximity",
            SPEAKER: "speaking",
        });
    });

    it("shows unknown, empty and differently cased values sensibly", () => {
        expect(presenceStatus("LIVEKIT_SOMETHING_NEW")).toBe("online");
        expect(presenceStatus("")).toBe("online");
        expect(presenceStatus(undefined)).toBe("online");
        expect(presenceStatus(" busy ")).toBe("busy");
    });

    it("has a colour and a label in every locale for every status", () => {
        for (const status of PRESENCE_STATUSES) {
            expect(["success", "warning", "danger", "accent", "neutral"]).toContain(statusTone(status));
            for (const locale of ["en-US", "fr-FR", "de-DE", "es-ES", "ar-SA"] as const) {
                expect(messagesFor(locale).presence.statuses[status]).toBeTruthy();
            }
        }
        expect(statusTone("online")).toBe("success");
        expect(statusTone("doNotDisturb")).toBe("danger");
        expect(statusTone("away")).toBe("warning");
    });
});

describe("staleness", () => {
    const received = new Date("2026-10-24T10:00:00.000Z");

    it("holds a report for ttlSeconds after it was received", () => {
        expect(reportExpiry(received, 90).toISOString()).toBe("2026-10-24T10:01:30.000Z");
        expect(isReportFresh(reportExpiry(received, 90), new Date("2026-10-24T10:01:29.999Z"))).toBe(true);
        expect(isReportFresh(reportExpiry(received, 90), new Date("2026-10-24T10:01:30.000Z"))).toBe(false);
    });

    it("clamps the lifetime a pusher asks for", () => {
        expect(clampTtl(1)).toBe(MIN_TTL_SECONDS);
        expect(clampTtl(86_400)).toBe(MAX_TTL_SECONDS);
        expect(clampTtl(90.7)).toBe(90);
        expect(clampTtl(Number.NaN)).toBe(MIN_TTL_SECONDS);
        expect(reportExpiry(received, 10 ** 9).getTime() - received.getTime()).toBe(MAX_TTL_SECONDS * 1000);
    });

    it("normalizes dates and refuses what is not one", () => {
        expect(isoOrNull("2026-10-24T12:00:00+02:00")).toBe("2026-10-24T10:00:00.000Z");
        expect(isoOrNull("yesterday")).toBeNull();
        expect(isoOrNull("")).toBeNull();
    });
});

const ORG = "00000000-0000-4000-8000-000000000000";
const W1 = "10000000-0000-4000-8000-000000000001";
const W2 = "10000000-0000-4000-8000-000000000002";
const LOBBY = "20000000-0000-4000-8000-000000000001";
const FLOOR = "20000000-0000-4000-8000-000000000002";
const GARDEN = "20000000-0000-4000-8000-000000000003";

function entry(partial: Partial<PresenceEntry>): PresenceEntry {
    return {
        userIdentifier: "jane@example.com",
        name: "Jane",
        isLogged: true,
        status: "ONLINE",
        connectedAt: "2026-10-24T09:00:00.000Z",
        organizationId: ORG,
        worldId: W1,
        roomId: LOBBY,
        ...partial,
    };
}

describe("the same person reported twice", () => {
    it("shows a person once per room, connected since the earliest time, with the latest status", () => {
        const result = dedupePresence([
            entry({ status: "ONLINE", connectedAt: "2026-10-24T09:00:00.000Z" }),
            entry({ userIdentifier: "JANE@example.com", status: "BUSY", connectedAt: "2026-10-24T09:30:00.000Z" }),
            entry({ roomId: FLOOR }),
        ]);
        expect(result).toHaveLength(2);
        const lobby = result.find((e) => e.roomId === LOBBY);
        expect(lobby).toMatchObject({ status: "BUSY", connectedAt: "2026-10-24T09:00:00.000Z" });
    });
});

describe("grouping by world then room", () => {
    const directory: PresenceDirectory = {
        worlds: new Map([
            [W1, { slug: "hq", name: "Headquarters" }],
            [W2, { slug: "annex", name: "Annex" }],
        ]),
        rooms: new Map([
            [LOBBY, { worldId: W1, name: "Lobby", position: 0 }],
            [FLOOR, { worldId: W1, name: "Floor 1", position: 1 }],
            [GARDEN, { worldId: W2, name: "Garden", position: 0 }],
        ]),
        memberOf: (worldId, identifier) =>
            worldId === W1 && identifier.toLowerCase() === "jane@example.com" ? "member-jane" : null,
        accountOf: (identifier) =>
            identifier.toLowerCase() === "jane@example.com" ? { name: "Jane Doe", email: "jane@example.com" } : null,
    };
    const now = new Date("2026-10-24T10:00:00.000Z");

    it("sorts worlds and people by name and rooms in the world's order, and counts guests and signed-in people", () => {
        const view = groupPresence(
            [
                entry({ roomId: FLOOR, userIdentifier: "zoe@example.com", name: "Zoé" }),
                entry({}),
                entry({ userIdentifier: "6f0c8f0e-guest", name: "Anonymous fox", isLogged: false }),
                entry({ worldId: W2, roomId: GARDEN, userIdentifier: "bob@example.com", name: "Bob", status: "AWAY" }),
            ],
            directory,
            now,
        );
        expect(view.checkedAt).toBe(now.toISOString());
        expect(view.counts).toEqual({ total: 4, signedIn: 3, guests: 1 });
        expect(view.worlds.map((w) => [w.name, w.count])).toEqual([
            ["Annex", 1],
            ["Headquarters", 3],
        ]);
        const hq = view.worlds[1]!;
        expect(hq.rooms.map((r) => r.name)).toEqual(["Lobby", "Floor 1"]);
        expect(hq.rooms[0]!.people.map((p) => p.name)).toEqual(["Anonymous fox", "Jane"]);
        expect(hq.rooms[0]!.people[1]).toMatchObject({
            memberId: "member-jane",
            account: { name: "Jane Doe", email: "jane@example.com" },
            status: "online",
        });
        expect(view.worlds[0]!.rooms[0]!.people[0]).toMatchObject({ status: "away", memberId: null, account: null });
    });

    it("links an account to signed-in people only", () => {
        const view = groupPresence([entry({ isLogged: false })], directory, now);
        expect(view.worlds[0]!.rooms[0]!.people[0]!.account).toBeNull();
    });

    it("leaves out rooms and worlds that are unknown or do not match", () => {
        const view = groupPresence(
            [
                entry({ roomId: "20000000-0000-4000-8000-0000000000ff" }),
                entry({ worldId: "10000000-0000-4000-8000-0000000000ff" }),
                entry({ worldId: W2, roomId: LOBBY }),
            ],
            directory,
            now,
        );
        expect(view).toEqual({
            worlds: [],
            counts: { total: 0, signedIn: 0, guests: 0 },
            checkedAt: now.toISOString(),
        });
    });
});
