import { beforeEach, expect, it, vi } from "vitest";
import { jwtVerify } from "jose";

vi.mock("$lib/server/context", () => ({ loadWorld: vi.fn() }));
vi.mock("$lib/server/config", () => ({
    config: () => ({ WORKADVENTURE_PLAYER_TOKEN_SECRET: "test-launch-secret-0123456789abcdef0123456789abcdef" }),
}));
vi.mock("$lib/server/audit", () => ({ audit: vi.fn() }));
import { loadWorld } from "$lib/server/context";
import { audit } from "$lib/server/audit";
import { GET } from "../src/routes/(app)/o/[org]/w/[world]/edit/+server";

beforeEach(() => vi.clearAllMocks());
const event = { locals: { locale: "en-US" }, params: { org: "acme", world: "office" } } as Parameters<typeof GET>[0];

it("checks room management permission and posts a signed identity without putting it in a URL", async () => {
    vi.mocked(loadWorld).mockResolvedValue({
        account: { email: "owner@example.com", name: "Owner" },
        access: { organization: { id: "org" } },
        world: { id: "world" },
        worldUrl: "https://play.example.com/@/acme/office",
    } as Awaited<ReturnType<typeof loadWorld>>);
    const response = await GET(event);
    const html = await response.text();
    expect(loadWorld).toHaveBeenCalledWith(event.locals, "acme", "office", "room.manage");
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(response.headers.get("location")).toBeNull();
    expect(html).toContain('method="post" action="https://play.example.com/@/acme/office"');
    const token = /name="authToken" value="([^"]+)"/.exec(html)![1]!;
    const { payload } = await jwtVerify(
        token,
        new TextEncoder().encode("test-launch-secret-0123456789abcdef0123456789abcdef"),
    );
    expect(payload.identifier).toBe("owner@example.com");
    expect(payload.backofficeSession).toBe(true);
    expect(vi.mocked(audit).mock.calls[0]?.[0].details).toBeUndefined();
});

it("does not issue a launch when the permission check refuses access", async () => {
    vi.mocked(loadWorld).mockRejectedValue({ status: 403 });
    await expect(GET(event)).rejects.toMatchObject({ status: 403 });
    expect(audit).not.toHaveBeenCalled();
});
