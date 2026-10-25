import { beforeEach, expect, it, vi } from "vitest";
import { jwtVerify } from "jose";

const SECRET = "test-launch-secret-0123456789abcdef0123456789abcdef";
vi.mock("$lib/server/config", () => ({ config: () => ({ WORKADVENTURE_PLAYER_TOKEN_SECRET: SECRET }) }));
vi.mock("$lib/server/audit", () => ({ audit: vi.fn() }));
vi.mock("$lib/server/context", () => ({ fullyAuthenticated: vi.fn() }));
vi.mock("$lib/server/services/instance", () => ({
    getInstanceSettings: vi.fn(async () => ({ playUrl: "https://play.example.com" })),
}));
vi.mock("$lib/server/services/worlds", () => ({ resolveWorldOfPlayUri: vi.fn() }));
vi.mock("$lib/server/services/directory", () => ({ isWorldPerson: vi.fn() }));
import { fullyAuthenticated } from "$lib/server/context";
import { resolveWorldOfPlayUri } from "$lib/server/services/worlds";
import { isWorldPerson } from "$lib/server/services/directory";
import { GET } from "../src/routes/play/enter/+server";

beforeEach(() => vi.clearAllMocks());

const room = "https://play.example.com/@/acme/office/lobby";
function event(playUri: string) {
    return {
        locals: { locale: "en-US" },
        url: new URL(`https://admin.example.com/play/enter?playUri=${encodeURIComponent(playUri)}`),
    } as Parameters<typeof GET>[0];
}
const person = { email: "ana@example.com", name: "Ana" };
const context = { organization: { id: "org" }, world: { id: "world", organizationId: "org", workspaceId: "ws" } };

it("sends a signed-out visitor to sign in, then back here", async () => {
    vi.mocked(fullyAuthenticated).mockReturnValue(undefined);
    await expect(GET(event(room))).rejects.toMatchObject({
        status: 303,
        location: `/login?redirectTo=${encodeURIComponent(`/play/enter?playUri=${encodeURIComponent(room)}`)}`,
    });
});

it("posts a 30-day signed identity to the room of a person of the world", async () => {
    vi.mocked(fullyAuthenticated).mockReturnValue(person as never);
    vi.mocked(resolveWorldOfPlayUri).mockResolvedValue(context as never);
    vi.mocked(isWorldPerson).mockResolvedValue(true);
    const html = await (await GET(event(room))).text();
    expect(html).toContain(`method="post" action="${room}"`);
    const token = /name="authToken" value="([^"]+)"/.exec(html)![1]!;
    const { payload } = await jwtVerify(token, new TextEncoder().encode(SECRET));
    expect(payload).toMatchObject({ identifier: "ana@example.com", username: "Ana", backofficeSession: true });
    expect(payload.exp! - payload.iat!).toBe(30 * 24 * 3600);
});

it("never sends the token to another site", async () => {
    vi.mocked(fullyAuthenticated).mockReturnValue(person as never);
    await expect(GET(event("https://evil.example.net/@/acme/office/lobby"))).rejects.toMatchObject({ status: 400 });
    await expect(GET(event("not a url"))).rejects.toMatchObject({ status: 400 });
    expect(resolveWorldOfPlayUri).not.toHaveBeenCalled();
});

it("refuses someone who is not a person of the world", async () => {
    vi.mocked(fullyAuthenticated).mockReturnValue(person as never);
    vi.mocked(resolveWorldOfPlayUri).mockResolvedValue(context as never);
    vi.mocked(isWorldPerson).mockResolvedValue(false);
    await expect(GET(event(room))).rejects.toMatchObject({ status: 403 });
});
