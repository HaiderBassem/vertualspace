/**
 * Unit tests of the enterprise features that need no database: the authorization policy (roles,
 * workspace scope, support access, who may grant which role), the component package validation, image
 * sniffing, the ZIP writer/reader and its defenses, and the job retry policy.
 */
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
    buildAccess,
    canManageMember,
    grantableRoles,
    PERMISSIONS,
    SUPPORT_PERMISSIONS,
    WORKSPACE_PERMISSIONS,
    type Organization,
    type Permission,
} from "../src/lib/server/auth/rbac";
import { componentIdOfPrefab, prefabId, compareVersions } from "../src/lib/catalog/manifest";
import { inspectImage } from "../src/lib/server/catalog/images";
import { buildZip, readZip, ZipError } from "../src/lib/server/catalog/mapStorage";
import { readPackage } from "../src/lib/server/catalog/builtin";
import { validatePackage } from "../src/lib/server/catalog/validate";
import { retryDelayMs, sanitizeJobError } from "../src/lib/server/services/jobs";
import { isForeignKeyViolation, isUniqueViolation } from "../src/lib/server/db/errors";
import { normalizeEmail } from "../src/lib/server/services/invitations";

const organization = { id: "00000000-0000-4000-8000-000000000001", slug: "acme" } as Organization;
const WS_A = "00000000-0000-4000-8000-00000000000a";
const WS_B = "00000000-0000-4000-8000-00000000000b";

describe("authorization policy", () => {
    it("gives employees no administrative permission", () => {
        const access = buildAccess({ organization, role: "employee", workspaceRoles: new Map(), support: undefined });
        const granted = (Object.keys(PERMISSIONS) as Permission[]).filter((p) => access.can(p));
        // integration.personal only lets people connect their own accounts (My integrations): not administration.
        expect(granted.sort()).toEqual([
            "component.read",
            "directory.read",
            "integration.personal",
            "organization.read",
        ]);
    });

    it("limits workspace managers to their own workspace", () => {
        const access = buildAccess({
            organization,
            role: "employee",
            workspaceRoles: new Map([[WS_A, "manager"]]),
            support: undefined,
        });
        expect(access.can("room.manage", { workspaceId: WS_A })).toBe(true);
        expect(access.can("room.manage", { workspaceId: WS_B })).toBe(false);
        // Never organization-wide, never the team or integrations.
        expect(access.can("room.manage")).toBe(false);
        for (const p of [
            "team.manage",
            "team.invite",
            "apiKey.manage",
            "domain.manage",
            "organization.update",
        ] as const) {
            expect(access.can(p, { workspaceId: WS_A })).toBe(false);
        }
        expect(access.canSomewhere("world.update")).toBe(true);
    });

    it("gives workspace members entry only, no back-office right", () => {
        expect(WORKSPACE_PERMISSIONS.member).toEqual([]);
    });

    it("keeps support access away from people, ownership, integrations and secrets", () => {
        const access = buildAccess({
            organization,
            role: undefined,
            workspaceRoles: new Map(),
            support: { id: "g", reason: "ticket 42", expiresAt: new Date() },
        });
        for (const p of [
            "team.invite",
            "team.manage",
            "ownership.transfer",
            "apiKey.manage",
            "domain.manage",
            "secrets.read",
            "organization.delete",
            "world.delete",
        ] as const) {
            expect(access.can(p), p).toBe(false);
            expect(SUPPORT_PERMISSIONS).not.toContain(p);
        }
        expect(access.can("world.update")).toBe(true);
    });

    it("lets owners manage everyone but owners, and admins only the roles below admin", () => {
        // Ownership only changes hands through the password-confirmed transfer.
        expect(grantableRoles("owner")).toEqual(["employee", "viewer", "moderator", "admin"]);
        expect(canManageMember("owner", "owner")).toBe(false);
        expect(canManageMember("owner", "admin")).toBe(true);
        expect(grantableRoles("admin")).toEqual(["employee", "viewer", "moderator"]);
        expect(canManageMember("admin", "admin")).toBe(false);
        expect(canManageMember("admin", "owner")).toBe(false);
        expect(canManageMember("admin", "employee")).toBe(true);
        for (const role of ["moderator", "viewer", "employee", undefined] as const) {
            expect(grantableRoles(role)).toEqual([]);
        }
    });
});

describe("component manifests", () => {
    it("builds stable prefab ids that WorkAdventure can look up across collections", () => {
        const id = prefabId("4f9f1c7e-1d1b-4a9c-8a55-0a0b0c0d0e0f", "oak");
        expect(id).toBe("adminspace:4f9f1c7e-1d1b-4a9c-8a55-0a0b0c0d0e0f:oak");
        expect(componentIdOfPrefab(id)).toBe("4f9f1c7e-1d1b-4a9c-8a55-0a0b0c0d0e0f");
        expect(componentIdOfPrefab("basic furniture:Table:brown:Down")).toBeUndefined();
    });

    it("orders semantic versions numerically", () => {
        expect(["1.10.0", "1.2.0", "1.9.3"].sort(compareVersions)).toEqual(["1.2.0", "1.9.3", "1.10.0"]);
    });

    it("validates every package of the built-in pack", async () => {
        const { readdirSync, statSync } = await import("node:fs");
        const root = path.resolve("catalog/builtin");
        const keys = readdirSync(root).filter((d) => statSync(path.join(root, d)).isDirectory());
        expect(keys.length).toBeGreaterThanOrEqual(30);
        for (const key of keys) {
            const { manifest, files } = readPackage(path.join(root, key));
            const result = validatePackage(manifest, files);
            expect(result.issues, key).toEqual([]);
            expect(result.ok, key).toBe(true);
        }
    });

    function desk() {
        const { manifest, files } = readPackage(path.resolve("catalog/builtin/desk-classic"));
        return {
            manifest: manifest as Record<string, unknown> & { entity: { variants: Record<string, unknown>[] } },
            files,
        };
    }

    it("refuses a file that is not a raster image whatever its name", () => {
        const { manifest, files } = desk();
        files.set("oak.png", Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>'));
        const result = validatePackage(manifest, files);
        expect(result.ok).toBe(false);
        expect(result.issues).toContainEqual({ code: "notAnImage", path: "oak.png" });
    });

    it("refuses a collision grid that does not match the image", () => {
        const { manifest, files } = desk();
        manifest.entity.variants[0]!.collisionGrid = [[1]];
        expect(validatePackage(manifest, files).issues.map((i) => i.code)).toContain("collisionGridShape");
    });

    it("refuses missing files and path traversal in the manifest", () => {
        const { manifest, files } = desk();
        files.delete("walnut.png");
        expect(validatePackage(manifest, files).issues).toContainEqual({ code: "fileMissing", path: "walnut.png" });
        manifest.preview = "../../etc/passwd.png";
        expect(validatePackage(manifest, files).issues[0]?.code).toBe("manifestInvalid");
    });

    it("requires floorLayer, a start layer and embedded tilesets in room templates", () => {
        const { manifest, files } = readPackage(path.resolve("catalog/builtin/meeting-room"));
        const map = JSON.parse(files.get("map.tmj")!.toString("utf8"));
        map.layers = map.layers.filter((l: { name: string }) => l.name !== "floorLayer" && l.name !== "start");
        map.tilesets[0].image = "https://evil.example/tiles.png";
        files.set("map.tmj", Buffer.from(JSON.stringify(map)));
        const codes = validatePackage(manifest, files).issues.map((i) => i.code);
        expect(codes).toEqual(expect.arrayContaining(["mapFloorLayer", "mapStartLayer", "mapExternalTileset"]));
    });

    it("refuses non-image previews and variant images, and links that are not http(s)", () => {
        const { manifest, files } = desk();
        manifest.preview = "oak.json";
        expect(validatePackage(manifest, files).issues[0]?.code).toBe("manifestInvalid");
        const second = desk();
        (second.manifest.provenance as Record<string, unknown>).url = "javascript:alert(1)";
        expect(validatePackage(second.manifest, second.files).issues[0]?.code).toBe("manifestInvalid");
    });

    it("refuses maps with group layers nested too deep instead of crashing", () => {
        const { manifest, files } = readPackage(path.resolve("catalog/builtin/meeting-room"));
        const map = JSON.parse(files.get("map.tmj")!.toString("utf8"));
        // Construct JSON iteratively: JSON.stringify itself overflows on this fixture in Node 22.
        let nested = '{"type":"group","name":"g","layers":[';
        for (let depth = 0; depth < 5000; depth++) {
            nested += `{"type":"group","name":"g${depth}","layers":[`;
        }
        nested += "]}".repeat(5001);
        const originalLayers = JSON.stringify(map.layers);
        map.layers = [];
        const json = JSON.stringify(map).replace('"layers":[]', `"layers":[${originalLayers.slice(1, -1)},${nested}]`);
        files.set("map.tmj", Buffer.from(json));
        expect(validatePackage(manifest, files).issues.map((i) => i.code)).toContain("mapInvalid");
    });

    it("reads the real size of PNG images", () => {
        const { files } = desk();
        expect(inspectImage(files.get("oak.png")!)).toMatchObject({ format: "png", width: 64, height: 64 });
        expect(inspectImage(Buffer.from("GIF89a"))).toBeUndefined();
    });
});

describe("ZIP archives", () => {
    it("round-trips deterministic archives", () => {
        const entries = [
            { name: "manifest.json", data: Buffer.from('{"a":1}') },
            { name: "images/oak.png", data: Buffer.alloc(5000, 7) },
        ];
        const zip = buildZip(entries);
        expect(buildZip(entries).equals(zip)).toBe(true);
        const read = readZip(zip, { maxEntries: 10, maxEntryBytes: 10_000, maxTotal: 20_000 });
        expect(read.get("images/oak.png")?.equals(entries[1]!.data)).toBe(true);
    });

    it("refuses names leaving the package and archives larger than the limits", () => {
        const evil = buildZip([{ name: "../outside.png", data: Buffer.from("x") }]);
        expect(() => readZip(evil, { maxEntries: 10, maxEntryBytes: 100, maxTotal: 100 })).toThrow(ZipError);
        const bomb = buildZip([{ name: "big.json", data: Buffer.alloc(1_000_000, 0) }]);
        expect(bomb.length).toBeLessThan(5_000);
        expect(() => readZip(bomb, { maxEntries: 10, maxEntryBytes: 10_000, maxTotal: 10_000 })).toThrow(ZipError);
        expect(() => readZip(Buffer.from("not a zip"), { maxEntries: 1, maxEntryBytes: 1, maxTotal: 1 })).toThrow(
            ZipError,
        );
    });
});

describe("job retries", () => {
    it("backs off exponentially with jitter, capped at 15 minutes", () => {
        expect(retryDelayMs(1, () => 0)).toBe(2_500);
        expect(retryDelayMs(1, () => 1)).toBe(5_000);
        expect(retryDelayMs(3, () => 1)).toBe(20_000);
        expect(retryDelayMs(30, () => 1)).toBe(15 * 60_000);
    });

    it("never keeps credentials in job errors", () => {
        const text = sanitizeJobError(new Error("refused: Bearer abc.def token=s3cr3t\npassword: hunter2"));
        expect(text).not.toMatch(/abc\.def|s3cr3t|hunter2/);
        expect(text).not.toContain("\n");
    });
});

describe("invitation addresses", () => {
    it("accept plain addresses only (nothing a mail library would read as a name or a list)", () => {
        expect(normalizeEmail(" First.Last+tag@Example.com ")).toBe("first.last+tag@example.com");
        for (const value of ["foo<bar@evil.com>", 'a"b@c.de', "a@b", "a@b.co,c@d.co", "a b@c.de"]) {
            expect(normalizeEmail(value), value).toBeUndefined();
        }
    });
});

describe("support access limits", () => {
    it("never manages members' data nor workspace access", () => {
        expect(SUPPORT_PERMISSIONS).not.toContain("member.manage");
    });
});

describe("constraint errors", () => {
    it("are recognised when Drizzle wraps the PostgreSQL error", () => {
        // Regression: DrizzleQueryError keeps the PostgresError as `cause`; "slug taken" answers were exceptions.
        const wrapped = Object.assign(new Error("Failed query"), { cause: { code: "23505" } });
        expect(isUniqueViolation(wrapped)).toBe(true);
        expect(isForeignKeyViolation(Object.assign(new Error("x"), { cause: { code: "23503" } }))).toBe(true);
        expect(isUniqueViolation(new Error("plain"))).toBe(false);
        expect(isUniqueViolation({ code: "ECONNREFUSED" })).toBe(false);
    });
});
