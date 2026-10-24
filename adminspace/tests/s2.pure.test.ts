/** Unit tests (no database) for the data, domain and WorkAdventure-facing fixes. */
import { describe, expect, it } from "vitest";
import { httpUrlOrUndefined, isHttpUrl, isUuid, MAX_PAGE, optionalUrl, pageParam } from "../src/lib/server/http/forms";
import { readWorldSettings, WorldSettings } from "../src/lib/settings/worldSettings";
import { readInstanceSettings, retentionPolicy, RETENTION_DEFAULTS } from "../src/lib/settings/instanceSettings";
import { resolveLivekitCredentials } from "../src/lib/server/adminApi/handlers/platform";
import { capacityAllows, CAPACITY_GRACE_MS } from "../src/lib/server/adminApi/handlers/rooms";
import { ensureSealed, isSealed, openSecret, sealSecret } from "../src/lib/server/services/secrets";
import { checkTagChange, type TagPolicy } from "../src/lib/server/services/memberAdmin";
import { parseMemberImport } from "../src/lib/server/services/csv";
import { isNonPublicAddress, mapExtensionOk } from "../src/lib/server/services/rooms";
import { toMemberData } from "../src/lib/server/services/members";

describe("http(s)-only URLs", () => {
    it.each(["javascript:alert(1)//", "data:text/html,<script>1</script>", "file:///etc/passwd", "ftp://x.test/a"])(
        "refuses %s",
        (value) => {
            expect(isHttpUrl(value)).toBe(false);
            expect(optionalUrl.safeParse(value).success).toBe(false);
            expect(httpUrlOrUndefined(value)).toBeUndefined();
        },
    );

    it("accepts http and https, and empty as undefined", () => {
        expect(optionalUrl.parse("https://example.com/a")).toBe("https://example.com/a");
        expect(optionalUrl.parse("http://example.com")).toBe("http://example.com");
        expect(optionalUrl.parse("")).toBeUndefined();
    });

    it("reports the invalidUrl code for a javascript: URL in a form", () => {
        const result = optionalUrl.safeParse("javascript:alert(1)//");
        expect(result.success).toBe(false);
        if (!result.success) {
            const issue = result.error.issues[0];
            expect(issue?.code === "custom" ? (issue.params as { code?: string }).code : issue?.code).toBe(
                "invalidUrl",
            );
        }
    });

    it("never hands a non-http visit card to WorkAdventure", () => {
        const data = toMemberData({
            uuid: "u",
            name: null,
            email: null,
            visitCardUrl: "javascript:alert(1)//",
            chatId: null,
        } as never);
        expect(data.visitCardUrl).toBeNull();
    });
});

describe("world settings parsing", () => {
    it("drops only the invalid fields, not the whole settings", () => {
        const settings = readWorldSettings({
            branding: { loadingLogo: "javascript:alert(1)//", primaryColor: "#112233" },
            features: { chat: false },
            applications: [
                { name: "Good", image: "https://ok.test/i.png" },
                { name: "Bad", script: "javascript:alert(1)//" },
            ],
        });
        expect(settings.branding).toEqual({ primaryColor: "#112233" });
        expect(settings.features).toEqual({ chat: false });
        expect(settings.applications?.map((a) => a.name)).toEqual(["Good"]);
    });

    it("refuses javascript: in application URLs at save time", () => {
        expect(WorldSettings.safeParse({ applications: [{ name: "x", targetUrl: "javascript:1" }] }).success).toBe(
            false,
        );
    });

    it("reads instance retention policies with defaults", () => {
        expect(retentionPolicy(readInstanceSettings({}))).toEqual(RETENTION_DEFAULTS);
        expect(
            retentionPolicy(readInstanceSettings({ auditLogRetentionDays: 30, playUrl: "javascript:1" }))
                .auditLogRetentionDays,
        ).toBe(30);
        expect(readInstanceSettings({ playUrl: "javascript:1" }).playUrl).toBeUndefined();
    });
});

describe("ids and pages", () => {
    it("recognises UUIDs only", () => {
        expect(isUuid("6f1c9a52-0d7e-4c55-9b0a-4b8f9a3e2b11")).toBe(true);
        expect(isUuid("1 or 1=1")).toBe(false);
        expect(isUuid("")).toBe(false);
        expect(isUuid(undefined)).toBe(false);
    });

    it("clamps page numbers", () => {
        expect(pageParam(null)).toBe(1);
        expect(pageParam("-4")).toBe(1);
        expect(pageParam("abc")).toBe(1);
        expect(pageParam("99999999999999999999")).toBe(MAX_PAGE);
        expect(pageParam("3")).toBe(3);
    });
});

describe("LiveKit credentials", () => {
    const instance = { livekitHost: "https://lk.instance.test", livekitApiKey: "ikey", livekitApiSecret: "isecret" };

    it("never mixes a world host with the instance key and secret", () => {
        expect(resolveLivekitCredentials({ livekitHost: "https://attacker.test" }, instance)).toEqual({
            livekitHost: "https://lk.instance.test",
            livekitApiKey: "ikey",
            livekitApiSecret: "isecret",
        });
    });

    it("uses the world's server only when it is complete", () => {
        const world = {
            livekitHost: "https://lk.world.test",
            livekitApiKey: "wkey",
            livekitApiSecret: sealSecret("wsecret"),
        };
        expect(resolveLivekitCredentials(world, instance)).toEqual({
            livekitHost: "https://lk.world.test",
            livekitApiKey: "wkey",
            livekitApiSecret: "wsecret",
        });
    });

    it("answers nothing when neither is complete", () => {
        expect(resolveLivekitCredentials({ livekitApiKey: "k" }, { livekitHost: "https://x.test" })).toBeUndefined();
    });
});

describe("sealed secrets", () => {
    it("seals, opens, and accepts legacy plain values", () => {
        const sealed = sealSecret("s3cret");
        expect(isSealed(sealed)).toBe(true);
        expect(sealed).not.toContain("s3cret");
        expect(openSecret(sealed)).toBe("s3cret");
        expect(openSecret("legacy-plain")).toBe("legacy-plain");
        expect(ensureSealed(sealed)).toBe(sealed);
        expect(openSecret(ensureSealed("legacy-plain"))).toBe("legacy-plain");
        expect(ensureSealed("")).toBeUndefined();
    });
});

describe("capacity", () => {
    const now = new Date("2026-01-01T12:00:00Z");
    it("lets people in below capacity or without limit", () => {
        expect(capacityAllows({ maxUsers: 0, online: 500, lastSeenAt: null, now })).toBe(true);
        expect(capacityAllows({ maxUsers: 10, online: 9, lastSeenAt: null, now })).toBe(true);
    });
    it("refuses a newcomer at capacity", () => {
        expect(capacityAllows({ maxUsers: 10, online: 10, lastSeenAt: null, now })).toBe(false);
        expect(
            capacityAllows({
                maxUsers: 10,
                online: 10,
                lastSeenAt: new Date(now.getTime() - CAPACITY_GRACE_MS - 1),
                now,
            }),
        ).toBe(false);
    });
    it("lets someone already in the world change rooms at capacity", () => {
        expect(capacityAllows({ maxUsers: 10, online: 10, lastSeenAt: new Date(now.getTime() - 30_000), now })).toBe(
            true,
        );
    });
});

describe("tag policy", () => {
    const moderator: TagPolicy = {
        canManageTags: false,
        privileged: new Set(["admin", "editor", "builders"]),
        existing: new Set(["admin", "editor", "builders", "vip"]),
    };
    const owner: TagPolicy = { ...moderator, canManageTags: true };

    it("refuses invalid names for everyone", () => {
        expect(checkTagChange([], ["a,b"], owner)).toEqual({ ok: false, error: "invalidTag" });
        expect(checkTagChange([], ["x".repeat(65)], owner)).toEqual({ ok: false, error: "invalidTag" });
    });
    it("stops a moderator from granting or removing privileged tags", () => {
        expect(checkTagChange([], ["admin"], moderator)).toEqual({ ok: false, error: "reservedTag" });
        expect(checkTagChange(["builders"], [], moderator)).toEqual({ ok: false, error: "reservedTag" });
    });
    it("stops a moderator from creating tags", () => {
        expect(checkTagChange([], ["newtag"], moderator)).toEqual({ ok: false, error: "unknownTag" });
    });
    it("lets a moderator manage ordinary existing tags, keeping privileged ones untouched", () => {
        expect(checkTagChange(["admin"], ["admin", "vip"], moderator)).toEqual({ ok: true, tags: ["admin", "vip"] });
    });
    it("lets tag managers do everything valid", () => {
        expect(checkTagChange([], ["admin", "newtag"], owner)).toEqual({ ok: true, tags: ["admin", "newtag"] });
    });
});

describe("member CSV import", () => {
    it("reports duplicate emails and invalid tags per line", () => {
        const parsed = parseMemberImport(
            [
                "email,name,tags",
                "a@x.test,A,vip",
                "A@X.test,A again,",
                `b@x.test,B,"ok;${"y".repeat(70)}"`,
                "c@x.test,C,good",
            ].join("\n"),
        );
        expect(parsed.rows.map((r) => r.email)).toEqual(["a@x.test", "c@x.test"]);
        expect(parsed.errors).toEqual([
            { line: 3, code: "duplicateEmail" },
            { line: 4, code: "invalidTag" },
        ]);
    });
});

describe("map checks", () => {
    it("checks the map file extension", () => {
        expect(mapExtensionOk("wam", "https://maps.test/office.wam")).toBe(true);
        expect(mapExtensionOk("wam", "https://maps.test/office.tmj")).toBe(false);
        expect(mapExtensionOk("tmj", "https://maps.test/office.tmj?v=2")).toBe(true);
        expect(mapExtensionOk("tmj", "https://maps.test/office.json")).toBe(true);
        expect(mapExtensionOk("tmj", "https://maps.test/office.png")).toBe(false);
    });
    it("recognises non-public addresses (SSRF guard)", () => {
        for (const a of [
            "127.0.0.1",
            "10.1.2.3",
            "172.16.0.1",
            "192.168.1.1",
            "169.254.169.254",
            "::1",
            "fd00::1",
            "fe80::1",
            "::ffff:127.0.0.1",
            "100.64.0.1",
        ]) {
            expect(isNonPublicAddress(a)).toBe(true);
        }
        for (const a of ["93.184.216.34", "2606:4700::1111", "8.8.8.8"]) {
            expect(isNonPublicAddress(a)).toBe(false);
        }
    });
});
