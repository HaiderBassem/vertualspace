import { describe, expect, it } from "vitest";
import { z } from "zod";
import { isMapDetailsData } from "../src/lib/contract/workadventure";
import { buildMapDetails } from "../src/lib/server/adminApi/mapDetails";
import { parseForm } from "../src/lib/server/http/forms";
import type { Organization, Room, World } from "../src/lib/server/services/worlds";
import type { WorldSettings } from "../src/lib/settings/worldSettings";

const now = new Date("2026-01-01T00:00:00.000Z");

const organization: Organization = {
    id: "00000000-0000-4000-8000-000000000001",
    slug: "acme",
    name: "Acme",
    countryCode: "FR",
    defaultLocale: "fr-FR",
    contactEmail: null,
    logoUrl: null,
    brandColor: null,
    status: "active",
    suspendedAt: null,
    createdAt: now,
    updatedAt: now,
};

const world: World = {
    id: "00000000-0000-4000-8000-000000000002",
    organizationId: organization.id,
    workspaceId: "00000000-0000-4000-8000-000000000009",
    slug: "hq",
    name: "Headquarters",
    description: null,
    accessPolicy: "public",
    maxUsers: 0,
    expiresAt: null,
    archivedAt: null,
    settings: {},
    createdAt: now,
    updatedAt: now,
};

const wamRoom: Room = {
    id: "00000000-0000-4000-8000-000000000003",
    worldId: world.id,
    slug: "lobby",
    name: "Lobby",
    description: null,
    mapKind: "wam",
    mapUrl: null,
    wamUrl: "https://maps.example.com/lobby.wam",
    isDefault: true,
    requiredTags: [],
    position: 0,
    thumbnailUrl: null,
    syncState: "ready",
    syncError: null,
    collectionLinkedAt: null,
    templateVersionId: null,
    createdAt: now,
    updatedAt: now,
};

function build(settings: WorldSettings = {}, room: Room = wamRoom, w: World = world) {
    const details = buildMapDetails({ organization, world: w, room, settings });
    // Every answer must satisfy WorkAdventure's own schema.
    isMapDetailsData.parse(details);
    return details;
}

describe("buildMapDetails", () => {
    it("serves a WAM room as editable, without mapUrl", () => {
        const details = build();
        expect(details.wamUrl).toBe(wamRoom.wamUrl);
        expect(details.mapUrl).toBeUndefined();
        expect(details.editable).toBe(true);
        expect(details.group).toBe("acme/hq");
    });

    it("serves a Tiled room as not editable, without wamUrl", () => {
        const details = build(
            {},
            { ...wamRoom, mapKind: "tmj", wamUrl: null, mapUrl: "https://maps.example.com/a.tmj" },
        );
        expect(details.mapUrl).toBe("https://maps.example.com/a.tmj");
        expect(details.wamUrl).toBeUndefined();
        expect(details.editable).toBe(false);
    });

    it("only sends feature flags a world sets (absent means enabled for WorkAdventure)", () => {
        const details = build();
        expect("enableChat" in details).toBe(false);
        expect("enableSay" in details).toBe(false);
        const withFlags = build({ features: { chat: false, say: true } });
        expect(withFlags.enableChat).toBe(false);
        expect(withFlags.enableSay).toBe(true);
    });

    it("enables reporting unless disabled, and hides recording by default", () => {
        expect(build().canReport).toBe(true);
        expect(build({ features: { report: false } }).canReport).toBe(false);
        expect(build().recording).toEqual({ buttonState: "hidden", disabledReason: null });
        expect(build({ permissions: { recording: "tagged" } }).recording?.buttonState).toBe("enabled");
    });

    it("requires authentication for non-public worlds and sends the expiry as ISO 8601", () => {
        const expiring = {
            ...world,
            accessPolicy: "members" as const,
            expiresAt: new Date("2027-03-04T05:06:07.000Z"),
        };
        const details = build({}, wamRoom, expiring);
        expect(details.authenticationMandatory).toBe(true);
        expect(details.expireOn).toBe("2027-03-04T05:06:07.000Z");
    });

    it("sends third-party settings only when configured", () => {
        expect(build().thirdParty).toBeNull();
        expect(build({ thirdParty: { jitsiUrl: "meet.example.com" } }).thirdParty?.jitsi?.url).toBe("meet.example.com");
    });
});

describe("parseForm", () => {
    const schema = z.object({
        name: z.string().trim().min(1).max(5),
        email: z.string().email(),
        site: z.string().url(),
    });

    function formData(values: Record<string, string>): FormData {
        const data = new FormData();
        for (const [key, value] of Object.entries(values)) data.set(key, value);
        return data;
    }

    it("returns parsed data", () => {
        const result = parseForm(
            formData({ name: "Ada", email: "ada@example.com", site: "https://example.com" }),
            schema,
        );
        expect(result.ok && result.data.name).toBe("Ada");
    });

    it("returns error codes per field, not English text", () => {
        const result = parseForm(formData({ name: "", email: "nope", site: "nope" }), schema);
        expect(result.ok).toBe(false);
        if (result.ok) return;
        expect(result.failure.status).toBe(400);
        expect(result.failure.data.errors).toEqual({
            name: "requiredField",
            email: "invalidEmail",
            site: "invalidUrl",
        });
        expect(parseForm(formData({ name: "toolong", email: "a@b.co", site: "https://x.y" }), schema)).toMatchObject({
            ok: false,
            failure: { data: { errors: { name: "tooLong" } } },
        });
    });
});
