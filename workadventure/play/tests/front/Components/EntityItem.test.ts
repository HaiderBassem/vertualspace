import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { flushSync, mount, unmount } from "svelte";
import EntityItem from "../../../src/front/Components/MapEditor/EntityEditor/EntityItem/EntityItem.svelte";
import type { EntityVariant } from "../../../src/front/Phaser/Game/MapEditor/Entities/EntityVariant";
import { ENTITY_PREFAB_DRAG_TYPE } from "../../../src/front/Phaser/Game/MapEditor/EntityDrag";

const entityVariant = {
    defaultPrefab: { id: "desk-lamp", name: "Desk lamp", imagePath: "https://cdn.example.test/desk-lamp.png" },
} as unknown as EntityVariant;

function dragStartEvent(dataTransfer: unknown): Event {
    const event = new Event("dragstart", { bubbles: true, cancelable: true });
    Object.defineProperty(event, "dataTransfer", { value: dataTransfer });
    return event;
}

describe("EntityItem", () => {
    let target: HTMLElement;
    let component: ReturnType<typeof mount> | undefined;
    let onselectentity: ReturnType<typeof vi.fn<(entityVariant: EntityVariant) => void>>;

    function render(isActive = false): HTMLElement {
        flushSync(() => {
            component = mount(EntityItem, { target, props: { entityVariant, isActive, onselectentity } });
        });
        return target.querySelector('[data-testid="entity-item"]') as HTMLElement;
    }

    beforeEach(() => {
        vi.useFakeTimers();
        target = document.createElement("div");
        document.body.append(target);
        onselectentity = vi.fn<(entityVariant: EntityVariant) => void>();
    });

    afterEach(async () => {
        vi.useRealTimers();
        const mounted = component;
        component = undefined;
        if (mounted) await unmount(mounted);
        target.remove();
    });

    it("can be dragged, to be put down on the map", () => {
        expect(render().getAttribute("draggable")).toBe("true");
    });

    it("marks the drag as an object of the picker", () => {
        const item = render();
        const setData = vi.fn();
        const dataTransfer = { effectAllowed: "uninitialized", setData };

        item.dispatchEvent(dragStartEvent(dataTransfer));

        expect(dataTransfer.effectAllowed).toBe("copy");
        expect(setData).toHaveBeenCalledExactlyOnceWith(ENTITY_PREFAB_DRAG_TYPE, "desk-lamp");
    });

    it("picks the object once the drag has started, so that its ghost follows the pointer over the map", () => {
        const item = render();

        item.dispatchEvent(dragStartEvent({ effectAllowed: "uninitialized", setData: vi.fn() }));

        // Not in the middle of the dragstart event: the picker changes its layout when an object is picked.
        expect(onselectentity).not.toHaveBeenCalled();
        vi.advanceTimersByTime(0);
        expect(onselectentity).toHaveBeenCalledExactlyOnceWith(entityVariant);
    });

    it("still picks the object with a click, for those who do not drag", () => {
        const item = render();

        item.click();

        expect(onselectentity).toHaveBeenCalledExactlyOnceWith(entityVariant);
    });
});
