import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { get } from "svelte/store";
import { createMinimapExpandedStore, MINIMAP_EXPANDED_STORAGE_KEY } from "../../../src/front/Stores/MinimapStore";

/** In-memory stand-in: recent Node versions shadow jsdom's localStorage with their own, unusable without a file. */
function createMemoryStorage() {
    const items = new Map<string, string>();
    return {
        getItem: (key: string): string | null => items.get(key) ?? null,
        setItem: (key: string, value: string): void => {
            items.set(key, value);
        },
        removeItem: (key: string): void => {
            items.delete(key);
        },
        clear: (): void => items.clear(),
    };
}

describe("createMinimapExpandedStore", () => {
    let storage: ReturnType<typeof createMemoryStorage>;

    beforeEach(() => {
        storage = createMemoryStorage();
        vi.stubGlobal("localStorage", storage);
    });

    afterEach(() => {
        vi.restoreAllMocks();
        vi.unstubAllGlobals();
    });

    it("should be expanded by default", () => {
        expect(get(createMinimapExpandedStore())).toBe(true);
    });

    it("should remember the collapsed state", () => {
        createMinimapExpandedStore().set(false);

        expect(storage.getItem(MINIMAP_EXPANDED_STORAGE_KEY)).toBe("false");
        expect(get(createMinimapExpandedStore())).toBe(false);
    });

    it("should remember the expanded state", () => {
        storage.setItem(MINIMAP_EXPANDED_STORAGE_KEY, "false");
        createMinimapExpandedStore().set(true);

        expect(get(createMinimapExpandedStore())).toBe(true);
    });

    it("should fall back to expanded when the storage cannot be read", () => {
        vi.spyOn(console, "info").mockImplementation(() => {});
        vi.spyOn(storage, "getItem").mockImplementation(() => {
            throw new Error("SecurityError");
        });

        expect(get(createMinimapExpandedStore())).toBe(true);
    });

    it("should still update the state when the storage cannot be written", () => {
        vi.spyOn(console, "info").mockImplementation(() => {});
        vi.spyOn(storage, "setItem").mockImplementation(() => {
            throw new Error("QuotaExceededError");
        });
        const store = createMinimapExpandedStore();

        store.set(false);

        expect(get(store)).toBe(false);
    });
});
