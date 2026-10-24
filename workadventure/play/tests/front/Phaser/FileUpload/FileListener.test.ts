import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { get } from "svelte/store";
import { FileListener } from "../../../../src/front/Phaser/FileUpload/FileListener";
import { draggingFile } from "../../../../src/front/Stores/FileUploadStore";
import { ENTITY_PREFAB_DRAG_TYPE } from "../../../../src/front/Phaser/Game/MapEditor/EntityDrag";

// What the listener reaches for when a file is dropped. The drag-enter logic under test needs none of it.
vi.mock("../../../../src/front/Phaser/Game/GameManager", () => ({ gameManager: {} }));
vi.mock("../../../../src/front/Stores/PopupStore", () => ({ popupStore: { addPopup: vi.fn() } }));
vi.mock("../../../../src/front/Stores/ErrorStore", () => ({ warningMessageStore: { addWarningMessage: vi.fn() } }));
vi.mock("../../../../src/front/Stores/MenuStore", async () => {
    const { writable } = await import("svelte/store");
    return { userIsConnected: writable(true) };
});
vi.mock("../../../../src/front/Components/PopUp/PopUpDropFileEntity.svelte", () => ({ default: {} }));
vi.mock("../../../../src/front/Components/PopUp/PopUpConnect.svelte", () => ({ default: {} }));
vi.mock("../../../../src/front/Enum/EnvironmentVariable", () => ({ GRPC_MAX_MESSAGE_SIZE: 1_000_000 }));
vi.mock("../../../../src/i18n/i18n-svelte", async () => {
    const { readable } = await import("svelte/store");
    return { default: readable({}) };
});

function dragEvent(type: string, types: string[], relatedTarget: EventTarget | null = null): Event {
    const event = new Event(type, { bubbles: true, cancelable: true });
    Object.defineProperties(event, {
        dataTransfer: { value: { types, files: [] } },
        relatedTarget: { value: relatedTarget },
    });
    return event;
}

describe("FileListener", () => {
    let canvas: HTMLCanvasElement;
    let listener: FileListener;

    beforeEach(() => {
        draggingFile.set(false);
        canvas = document.createElement("canvas");
        listener = new FileListener(canvas);
        listener.initDomListeners();
    });

    afterEach(() => {
        listener.close();
    });

    it("shows the file overlay when files are dragged onto the map", () => {
        canvas.dispatchEvent(dragEvent("dragenter", ["Files"]));

        expect(get(draggingFile)).toBe(true);
    });

    it("hides the overlay when the files leave the map", () => {
        canvas.dispatchEvent(dragEvent("dragenter", ["Files"]));

        canvas.dispatchEvent(dragEvent("dragleave", ["Files"]));

        expect(get(draggingFile)).toBe(false);
    });

    it("ignores an object dragged from the entity picker, even where the browser gives no relatedTarget", () => {
        // Safari never fills relatedTarget, so a drag that starts inside the page looks like one from outside.
        canvas.dispatchEvent(dragEvent("dragenter", [ENTITY_PREFAB_DRAG_TYPE], null));

        expect(get(draggingFile)).toBe(false);
    });

    it("ignores a text or a link dragged onto the map", () => {
        canvas.dispatchEvent(dragEvent("dragenter", ["text/plain", "text/uri-list"]));

        expect(get(draggingFile)).toBe(false);
    });

    it("does not take a drag that starts inside the page for a file", () => {
        canvas.dispatchEvent(dragEvent("dragenter", ["Files"], document.body));

        expect(get(draggingFile)).toBe(false);
    });
});
