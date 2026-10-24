import { describe, expect, it } from "vitest";
import {
    buildRoomUrl,
    buildWorldUrl,
    parsePlayUri,
    slugify,
    SLUG_PATTERN,
} from "../src/lib/server/workadventure/playUri";

describe("parsePlayUri", () => {
    it("parses a room of a world", () => {
        expect(parsePlayUri("https://play.example.com/@/acme/hq/lobby")).toEqual({
            kind: "world",
            origin: "https://play.example.com",
            organizationSlug: "acme",
            worldSlug: "hq",
            roomSlug: "lobby",
        });
    });

    it("keeps nested room slugs and decodes segments", () => {
        const parsed = parsePlayUri("https://play.example.com/@/acme/hq/floor-1/caf%C3%A9");
        expect(parsed).toMatchObject({ kind: "world", roomSlug: "floor-1/café" });
    });

    it("parses a world without room", () => {
        expect(parsePlayUri("https://play.example.com/@/acme/hq/")).toMatchObject({
            kind: "world",
            roomSlug: undefined,
        });
    });

    it("accepts paths without origin", () => {
        expect(parsePlayUri("/@/acme/hq/lobby")).toMatchObject({ kind: "world", origin: "", roomSlug: "lobby" });
    });

    it("parses map-storage URLs", () => {
        expect(parsePlayUri("http://play.test/~/office/map.wam")).toEqual({
            kind: "mapStorage",
            origin: "http://play.test",
            path: "office/map.wam",
        });
    });

    it("parses global URLs and keeps the protocol of the origin", () => {
        expect(parsePlayUri("http://play.test/_/global/maps.test/starter/map.json")).toEqual({
            kind: "global",
            origin: "http://play.test",
            instance: "global",
            mapUrl: "http://maps.test/starter/map.json",
        });
    });

    it("recognizes the root", () => {
        expect(parsePlayUri("https://play.example.com/")).toEqual({ kind: "root", origin: "https://play.example.com" });
    });

    it("rejects incomplete and unknown paths", () => {
        expect(parsePlayUri("https://play.example.com/@/acme").kind).toBe("invalid");
        expect(parsePlayUri("https://play.example.com/~/").kind).toBe("invalid");
        expect(parsePlayUri("https://play.example.com/something").kind).toBe("invalid");
    });
});

describe("URL builders", () => {
    it("builds world and room URLs", () => {
        expect(buildWorldUrl("https://play.example.com/", "acme", "hq")).toBe("https://play.example.com/@/acme/hq/");
        expect(buildRoomUrl("https://play.example.com", "acme", "hq", "floor-1/meeting")).toBe(
            "https://play.example.com/@/acme/hq/floor-1/meeting",
        );
    });

    it("round-trips through the parser", () => {
        const url = buildRoomUrl("https://play.example.com", "acme", "hq", "lobby");
        expect(parsePlayUri(url)).toMatchObject({ organizationSlug: "acme", worldSlug: "hq", roomSlug: "lobby" });
    });
});

describe("slugs", () => {
    it("folds accents and punctuation", () => {
        expect(slugify("Café Été — Paris!")).toBe("cafe-ete-paris");
        expect(SLUG_PATTERN.test(slugify("Café Été — Paris!"))).toBe(true);
    });

    it("rejects slugs starting or ending with a dash", () => {
        expect(SLUG_PATTERN.test("-acme")).toBe(false);
        expect(SLUG_PATTERN.test("acme-")).toBe(false);
    });
});
