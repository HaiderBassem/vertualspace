import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { flushSync, mount, unmount } from "svelte";
import { get } from "svelte/store";

const mocks = vi.hoisted(() => ({
    moveTo: vi.fn(() => Promise.resolve({ x: 0, y: 0, cancelled: false })),
    unsubscribeMapChanged: vi.fn(),
    controlsEnabled: true,
    // Recent Node versions shadow jsdom's localStorage with their own, unusable without a file.
    storage: new Map<string, string>(),
}));

function stubLocalStorage(): void {
    vi.stubGlobal("localStorage", {
        getItem: (key: string) => mocks.storage.get(key) ?? null,
        setItem: (key: string, value: string) => mocks.storage.set(key, value),
    });
}
// Before the minimap store module reads it.
vi.hoisted(() => {
    vi.stubGlobal("localStorage", { getItem: () => null, setItem: () => {} });
});

vi.mock("../../../../src/i18n/i18n-svelte", async () => {
    const { readable } = await import("svelte/store");
    return {
        LL: readable({
            minimap: {
                title: () => "Minimap",
                show: () => "Show the minimap",
                hide: () => "Hide the minimap",
                surfaceLabel: () => "Map overview",
                keyboardHint: () => "Arrow keys pick a spot",
                peopleCount: ({ count }: { count: number }) => `${count} other people`,
                you: () => "You",
            },
        }),
    };
});

// A map of 4800x1600 pixels: the card is 240x80 CSS pixels, 1 card pixel = 20 world pixels.
vi.mock("../../../../src/front/Stores/GameSceneStore", async () => {
    const { writable } = await import("svelte/store");
    const scene = {
        Map: { widthInPixels: 4800, heightInPixels: 1600 },
        MapPlayersByKey: new Map(),
        groups: new Map(),
        CurrentPlayer: undefined,
        userInputManager: {
            get isControlsEnabled() {
                return mocks.controlsEnabled;
            },
            isRightClickEnabled: true,
        },
        moveTo: mocks.moveTo,
        getGameMapFrontWrapper: () => ({
            initializedPromise: { promise: new Promise<void>(() => {}) },
            getMapChangedObservable: () => ({
                subscribe: () => ({ unsubscribe: mocks.unsubscribeMapChanged }),
            }),
        }),
        getCameraManager: () => ({
            getCamera: () => ({ worldView: { x: 0, y: 0, width: 800, height: 600 } }),
        }),
    };
    return { gameSceneStore: writable(scene) };
});
vi.mock("../../../../src/front/Phaser/Game/Minimap/MinimapBackgroundRenderer", () => ({
    renderMinimapBackground: vi.fn(() => new Promise(() => {})),
}));
vi.mock("../../../../src/front/Stores/CoWebsiteStore", async () => {
    const { writable } = await import("svelte/store");
    return { windowSize: writable({ width: 1280, height: 800 }) };
});
vi.mock("../../../../src/front/Stores/UserInputStore", async () => {
    const { writable } = await import("svelte/store");
    return { enableUserInputsStore: writable(true) };
});
vi.mock("../../../../src/front/Stores/HighlightedEmbedScreenStore", async () => {
    const { writable } = await import("svelte/store");
    return { highlightedEmbedScreen: writable(undefined) };
});
vi.mock("../../../../src/front/Stores/ActionsCamStore", async () => {
    const { writable } = await import("svelte/store");
    return { highlightFullScreen: writable(false) };
});
vi.mock("../../../../src/front/Stores/MyMediaStore", async () => {
    const { writable } = await import("svelte/store");
    return { inExternalServiceStore: writable(false), proximityMeetingStore: writable(true) };
});
vi.mock("../../../../src/front/Stores/StreamableCollectionStore", async () => {
    const { writable } = await import("svelte/store");
    return { streamableCollectionStore: writable(new Map()) };
});
vi.mock("../../../../src/front/Stores/VideoLayoutStore", async () => {
    const { writable } = await import("svelte/store");
    return { isOnOneLine: writable(true), playerMovedInTheLast10Seconds: writable(false) };
});
vi.mock("../../../../src/front/Stores/PeerStore", async () => {
    const { writable } = await import("svelte/store");
    return { activePictureInPictureStore: writable(false) };
});

import Minimap from "../../../../src/front/Components/Minimap/Minimap.svelte";
import { mapEditorModeStore } from "../../../../src/front/Stores/MapEditorStore";
import {
    MINIMAP_EXPANDED_STORAGE_KEY,
    minimapExpandedStore,
    minimapReservedHeightStore,
} from "../../../../src/front/Stores/MinimapStore";

describe("Minimap", () => {
    const target = document.createElement("div");
    let component: ReturnType<typeof mount> | undefined;
    const storage = mocks.storage;

    function render(): void {
        component = mount(Minimap, { target, intro: false });
        flushSync();
    }

    function pressKey(key: string, eventTarget: EventTarget = window): void {
        eventTarget.dispatchEvent(new KeyboardEvent("keydown", { key, bubbles: true }));
        flushSync();
    }

    function toggle(): HTMLButtonElement {
        const button = target.querySelector<HTMLButtonElement>("[data-testid='minimap-toggle']");
        if (!button) {
            throw new Error("No minimap toggle");
        }
        return button;
    }

    beforeEach(() => {
        document.body.appendChild(target);
        stubLocalStorage();
        // jsdom has no layout observer (bind:clientHeight) and no canvas: the overlay loop simply does not start.
        vi.stubGlobal(
            "ResizeObserver",
            class {
                observe(): void {}
                unobserve(): void {}
                disconnect(): void {}
            },
        );
        vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(null);
        minimapExpandedStore.set(true);
        mapEditorModeStore.set(false);
        mocks.controlsEnabled = true;
    });

    afterEach(async () => {
        const mountedComponent = component;
        component = undefined;
        if (mountedComponent) {
            await unmount(mountedComponent, { outro: false });
        }
        target.replaceChildren();
        target.remove();
        storage.clear();
        vi.restoreAllMocks();
        vi.unstubAllGlobals();
        mocks.moveTo.mockClear();
    });

    it("shows an expanded card sized to the map, with an accessible name", () => {
        render();

        const card = target.querySelector("section[aria-label='Minimap']");
        expect(card).not.toBeNull();
        const surface = target.querySelector<HTMLElement>("[data-testid='minimap-surface']");
        expect(surface?.parentElement?.style.width).toBe("240px");
        expect(surface?.parentElement?.style.height).toBe("80px");
        expect(toggle().getAttribute("aria-expanded")).toBe("true");
        expect(toggle().getAttribute("aria-keyshortcuts")).toBe("M");
    });

    it("collapses to a button and remembers it", () => {
        render();

        toggle().click();
        flushSync();

        expect(target.querySelector("section[aria-label='Minimap']")).toBeNull();
        expect(toggle().getAttribute("aria-expanded")).toBe("false");
        expect(toggle().getAttribute("aria-label")).toBe("Show the minimap");
        expect(storage.get(MINIMAP_EXPANDED_STORAGE_KEY)).toBe("false");
    });

    it("toggles with the M key, but not while typing", () => {
        render();

        pressKey("m");
        expect(get(minimapExpandedStore)).toBe(false);

        const input = document.createElement("input");
        document.body.appendChild(input);
        pressKey("m", input);
        expect(get(minimapExpandedStore)).toBe(false);
        input.remove();

        pressKey("M");
        expect(get(minimapExpandedStore)).toBe(true);
    });

    it("is hidden while the map editor is open, and ignores the shortcut then", () => {
        render();
        const wrapper = target.querySelector("[data-testid='minimap']");
        expect(wrapper?.classList.contains("hidden")).toBe(false);

        mapEditorModeStore.set(true);
        flushSync();

        expect(wrapper?.classList.contains("hidden")).toBe(true);
        expect(get(minimapReservedHeightStore)).toBe(0);
        pressKey("m");
        expect(get(minimapExpandedStore)).toBe(true);
    });

    it("walks the woka to the clicked point of the map", () => {
        render();
        const surface = target.querySelector<HTMLElement>("[data-testid='minimap-surface']");

        // jsdom lays nothing out: the surface is at (0, 0), so client coordinates are card coordinates.
        surface?.dispatchEvent(new MouseEvent("click", { bubbles: true, detail: 1, clientX: 120, clientY: 40 }));

        expect(mocks.moveTo).toHaveBeenCalledWith({ x: 2400, y: 800 }, true);
    });

    it("does not walk when a script disabled the controls", () => {
        mocks.controlsEnabled = false;
        render();
        const surface = target.querySelector<HTMLElement>("[data-testid='minimap-surface']");

        surface?.dispatchEvent(new MouseEvent("click", { bubbles: true, detail: 1, clientX: 120, clientY: 40 }));

        expect(mocks.moveTo).not.toHaveBeenCalled();
    });
});
