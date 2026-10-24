import { describe, expect, it } from "vitest";
import {
    consumeSitAtDeskOnArrival,
    nextMyDesk,
    parseMyDesk,
    requestSitAtDeskOnArrival,
} from "../../../src/front/Utils/MyDesk";

const LOBBY = "http://play.test/@/acme/hq/lobby";
const FLOOR2 = "http://play.test/@/acme/hq/floor-2";

describe("MyDesk", () => {
    it("remembers the desk the user has in the map they are in", () => {
        expect(nextMyDesk(undefined, FLOOR2, { id: "d7", name: "Desk 7" })).toEqual({
            roomUrl: FLOOR2,
            areaId: "d7",
            deskName: "Desk 7",
        });
    });

    it("changes nothing when it already knows that desk", () => {
        const saved = { roomUrl: FLOOR2, areaId: "d7", deskName: "Desk 7" };
        expect(nextMyDesk(saved, FLOOR2, { id: "d7", name: "Desk 7" })).toBeUndefined();
    });

    it("keeps a desk of another map while the user is elsewhere", () => {
        const saved = { roomUrl: FLOOR2, areaId: "d7" };
        expect(nextMyDesk(saved, LOBBY, undefined)).toBeUndefined();
    });

    it("forgets a desk of this map that is no longer theirs", () => {
        expect(nextMyDesk({ roomUrl: FLOOR2, areaId: "d7" }, FLOOR2, undefined)).toBeNull();
    });

    it("reads only well-formed values", () => {
        expect(parseMyDesk({ roomUrl: FLOOR2, areaId: "d7" })).toEqual({ roomUrl: FLOOR2, areaId: "d7" });
        expect(parseMyDesk(null)).toBeUndefined();
        expect(parseMyDesk({ areaId: "d7" })).toBeUndefined();
    });

    it("asks to sit on arrival once", () => {
        expect(consumeSitAtDeskOnArrival()).toBe(false);
        requestSitAtDeskOnArrival();
        expect(consumeSitAtDeskOnArrival()).toBe(true);
        expect(consumeSitAtDeskOnArrival()).toBe(false);
    });
});
