import { beforeEach, expect, it, vi } from "vitest";

vi.mock("$lib/server/context", () => ({ loadOrganization: vi.fn() }));
vi.mock("$lib/server/services/workspaces", () => ({ listWorkspaces: vi.fn() }));
vi.mock("$lib/server/services/worldAdmin", () => ({
    createWorld: vi.fn(),
    WorldTemplateError: class extends Error {},
}));
vi.mock("$lib/server/audit", () => ({ audit: vi.fn() }));
vi.mock("$lib/server/catalog/install", () => ({ mapOfAnotherOrganization: vi.fn() }));
vi.mock("$lib/server/catalog/store", () => ({ searchCatalog: vi.fn() }));

import { loadOrganization } from "$lib/server/context";
import { listWorkspaces } from "$lib/server/services/workspaces";
import { createWorld } from "$lib/server/services/worldAdmin";
import { mapOfAnotherOrganization } from "$lib/server/catalog/install";
import { searchCatalog } from "$lib/server/catalog/store";
import { actions } from "../src/routes/(app)/o/[org]/w/new/+page.server";

const workspaceId = "00000000-0000-4000-8000-000000000001";
const villageId = "00000000-0000-4000-8000-000000000002";
const meetingId = "00000000-0000-4000-8000-000000000003";

beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(loadOrganization).mockResolvedValue({
        account: { id: "owner", email: "owner@example.com", name: "Owner" },
        access: { organization: { id: "org", slug: "acme" }, can: () => true, canSomewhere: () => true },
    } as unknown as Awaited<ReturnType<typeof loadOrganization>>);
    vi.mocked(listWorkspaces).mockResolvedValue([{ id: workspaceId }] as Awaited<ReturnType<typeof listWorkspaces>>);
    vi.mocked(createWorld).mockResolvedValue("slugTaken");
    vi.mocked(mapOfAnotherOrganization).mockResolvedValue(false);
    vi.mocked(searchCatalog).mockResolvedValue({
        total: 2,
        items: [
            { id: villageId, key: "wa-village", name: "WA Village", owned: false },
            { id: meetingId, key: "meeting-room", name: "Meeting room", owned: false },
        ],
    } as Awaited<ReturnType<typeof searchCatalog>>);
});

async function submit(mapKind: string, mapUrl: string, extra: Record<string, string> = {}) {
    const data = new FormData();
    for (const [key, value] of Object.entries({
        workspaceId,
        name: "Office",
        slug: "office",
        accessPolicy: "public",
        roomName: "Lobby",
        roomSlug: "lobby",
        mapKind,
        mapUrl,
        ...extra,
    }))
        data.set(key, value);
    const action = actions.default!;
    return action({
        request: new Request("http://localhost/o/acme/w/new", { method: "POST", body: data }),
        params: { org: "acme" },
        locals: {},
    } as Parameters<typeof action>[0]);
}

it.each([
    ["wam", "https://skillture.club"],
    ["tmj", "https://maps.example/image.png"],
])("refuses a %s first room that points to a non-map URL", async (kind, url) => {
    expect(await submit(kind, url)).toMatchObject({ status: 400, data: { errors: { mapUrl: "validation" } } });
    expect(createWorld).not.toHaveBeenCalled();
});

it("defaults new worlds to the Village template rather than leaving them empty", async () => {
    await submit("wam", "", { roomName: "", roomSlug: "", mapMode: "template" });
    expect(createWorld).toHaveBeenCalledWith(
        expect.objectContaining({
            firstRoom: undefined,
            firstRoomTemplate: { componentId: villageId, name: "WA Village", actorId: "owner" },
        }),
    );
});

it("uses a different published template when selected", async () => {
    await submit("wam", "", { roomName: "", roomSlug: "", mapMode: "template", templateId: meetingId });
    expect(createWorld).toHaveBeenCalledWith(
        expect.objectContaining({ firstRoomTemplate: expect.objectContaining({ componentId: meetingId }) }),
    );
});

it("refuses a template outside the organization's published catalog", async () => {
    expect(
        await submit("wam", "", {
            roomName: "",
            mapMode: "template",
            templateId: "00000000-0000-4000-8000-000000000099",
        }),
    ).toMatchObject({ status: 400 });
    expect(createWorld).not.toHaveBeenCalled();
});

it("refuses another organization's map when creating the first room", async () => {
    vi.mocked(mapOfAnotherOrganization).mockResolvedValue(true);
    expect(await submit("wam", "https://maps.example/private.wam")).toMatchObject({
        status: 400,
        data: { errors: { mapUrl: "validation" } },
    });
    expect(createWorld).not.toHaveBeenCalled();
});

it("accepts a valid map URL and continues to world creation", async () => {
    await submit("wam", "https://maps.example/office.wam");
    expect(createWorld).toHaveBeenCalledWith(
        expect.objectContaining({
            firstRoom: expect.objectContaining({ url: "https://maps.example/office.wam", mapKind: "wam" }),
            creator: { email: "owner@example.com", name: "Owner" },
        }),
    );
});
