import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
    ENTITY_PREFAB_DRAG_TYPE,
    EntityPrefabDropTarget,
    type EntityPrefabDropPoint,
    isEntityPrefabDrag,
    startEntityPrefabDrag,
} from "../../../../../src/front/Phaser/Game/MapEditor/EntityDrag";

/** jsdom has no DataTransfer: this is the small part of it that the drag code uses. */
function fakeDataTransfer(types: string[] = []): DataTransfer {
    const data = new Map<string, string>(types.map((type) => [type, ""]));
    return {
        effectAllowed: "uninitialized",
        dropEffect: "none",
        get types() {
            return [...data.keys()];
        },
        setData: (type: string, value: string) => {
            data.set(type, value);
        },
        getData: (type: string) => data.get(type) ?? "",
    } as unknown as DataTransfer;
}

function dragEvent(type: "dragover" | "drop", dataTransfer: DataTransfer | null, pageX = 120, pageY = 80): DragEvent {
    const event = new Event(type, { bubbles: true, cancelable: true }) as DragEvent;
    Object.defineProperties(event, {
        dataTransfer: { value: dataTransfer },
        pageX: { value: pageX },
        pageY: { value: pageY },
    });
    return event;
}

describe("startEntityPrefabDrag", () => {
    it("marks the drag as an object of the picker, so that the map can tell it from a file", () => {
        const dataTransfer = fakeDataTransfer();

        startEntityPrefabDrag(dataTransfer, "desk-lamp");

        expect(dataTransfer.effectAllowed).toBe("copy");
        expect(dataTransfer.getData(ENTITY_PREFAB_DRAG_TYPE)).toBe("desk-lamp");
        expect(isEntityPrefabDrag(dataTransfer)).toBe(true);
    });

    it("does nothing when the browser gives no data transfer", () => {
        expect(() => startEntityPrefabDrag(null, "desk-lamp")).not.toThrow();
    });
});

describe("isEntityPrefabDrag", () => {
    it("is false for a file dragged from the desktop", () => {
        expect(isEntityPrefabDrag(fakeDataTransfer(["Files"]))).toBe(false);
    });

    it("is false for a text or a link", () => {
        expect(isEntityPrefabDrag(fakeDataTransfer(["text/plain", "text/uri-list"]))).toBe(false);
    });

    it("is false without a data transfer", () => {
        expect(isEntityPrefabDrag(null)).toBe(false);
    });
});

describe("EntityPrefabDropTarget", () => {
    let canvas: HTMLCanvasElement;
    let onDragOver: ReturnType<typeof vi.fn<(point: EntityPrefabDropPoint) => void>>;
    let onDrop: ReturnType<typeof vi.fn<(point: EntityPrefabDropPoint) => void>>;
    let target: EntityPrefabDropTarget;

    beforeEach(() => {
        canvas = document.createElement("canvas");
        onDragOver = vi.fn<(point: EntityPrefabDropPoint) => void>();
        onDrop = vi.fn<(point: EntityPrefabDropPoint) => void>();
        target = new EntityPrefabDropTarget(canvas, { onDragOver, onDrop });
        target.bind();
    });

    afterEach(() => {
        target.unbind();
    });

    it("accepts an object of the picker moving over the map and reports where it is", () => {
        const event = dragEvent("dragover", fakeDataTransfer([ENTITY_PREFAB_DRAG_TYPE]), 300, 200);

        canvas.dispatchEvent(event);

        // preventDefault is what tells the browser that the object may be dropped here.
        expect(event.defaultPrevented).toBe(true);
        expect(event.dataTransfer?.dropEffect).toBe("copy");
        expect(onDragOver).toHaveBeenCalledExactlyOnceWith({ pageX: 300, pageY: 200 });
    });

    it("places the object where it is released", () => {
        const event = dragEvent("drop", fakeDataTransfer([ENTITY_PREFAB_DRAG_TYPE]), 410, 255);

        canvas.dispatchEvent(event);

        expect(event.defaultPrevented).toBe(true);
        expect(onDrop).toHaveBeenCalledExactlyOnceWith({ pageX: 410, pageY: 255 });
    });

    it("leaves a file drag alone, for the file upload to handle", () => {
        const over = dragEvent("dragover", fakeDataTransfer(["Files"]));
        const drop = dragEvent("drop", fakeDataTransfer(["Files"]));

        canvas.dispatchEvent(over);
        canvas.dispatchEvent(drop);

        expect(over.defaultPrevented).toBe(false);
        expect(drop.defaultPrevented).toBe(false);
        expect(onDragOver).not.toHaveBeenCalled();
        expect(onDrop).not.toHaveBeenCalled();
    });

    it("stops listening once unbound", () => {
        target.unbind();

        canvas.dispatchEvent(dragEvent("dragover", fakeDataTransfer([ENTITY_PREFAB_DRAG_TYPE])));
        canvas.dispatchEvent(dragEvent("drop", fakeDataTransfer([ENTITY_PREFAB_DRAG_TYPE])));

        expect(onDragOver).not.toHaveBeenCalled();
        expect(onDrop).not.toHaveBeenCalled();
    });
});
