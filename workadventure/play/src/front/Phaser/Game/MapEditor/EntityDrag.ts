/**
 * Dragging an object of the entity picker onto the map.
 *
 * The browser only carries this marker. The object itself is the selected prefab of the picker: that selection is also
 * what shows the ghost of the object on the map, so a drag and a click-then-click place the very same thing.
 */
export const ENTITY_PREFAB_DRAG_TYPE = "application/x-workadventure-entity-prefab";

export function startEntityPrefabDrag(dataTransfer: DataTransfer | null, prefabId: string): void {
    if (!dataTransfer) {
        return;
    }
    dataTransfer.effectAllowed = "copy";
    // Firefox only starts a drag that carries some data.
    dataTransfer.setData(ENTITY_PREFAB_DRAG_TYPE, prefabId);
}

export function isEntityPrefabDrag(dataTransfer: DataTransfer | null): boolean {
    return dataTransfer?.types.includes(ENTITY_PREFAB_DRAG_TYPE) ?? false;
}

export interface EntityPrefabDropPoint {
    /** Position in the page, as Phaser's scale manager expects it. */
    pageX: number;
    pageY: number;
}

export interface EntityPrefabDropHandlers {
    /** The dragged object moves over the map. */
    onDragOver(point: EntityPrefabDropPoint): void;
    /** The dragged object is released over the map. */
    onDrop(point: EntityPrefabDropPoint): void;
}

/**
 * Makes an element (the game canvas) accept the objects dragged from the entity picker, and nothing else: other drags,
 * such as files to upload, are left alone.
 */
export class EntityPrefabDropTarget {
    constructor(
        private readonly element: HTMLElement,
        private readonly handlers: EntityPrefabDropHandlers,
    ) {}

    public bind(): void {
        this.element.addEventListener("dragover", this.dragOverListener);
        this.element.addEventListener("drop", this.dropListener);
    }

    public unbind(): void {
        this.element.removeEventListener("dragover", this.dragOverListener);
        this.element.removeEventListener("drop", this.dropListener);
    }

    private readonly dragOverListener = (event: DragEvent): void => {
        if (!isEntityPrefabDrag(event.dataTransfer)) {
            return;
        }
        // Without this the browser refuses the drop.
        event.preventDefault();
        if (event.dataTransfer) {
            event.dataTransfer.dropEffect = "copy";
        }
        this.handlers.onDragOver({ pageX: event.pageX, pageY: event.pageY });
    };

    private readonly dropListener = (event: DragEvent): void => {
        if (!isEntityPrefabDrag(event.dataTransfer)) {
            return;
        }
        event.preventDefault();
        this.handlers.onDrop({ pageX: event.pageX, pageY: event.pageY });
    };
}
