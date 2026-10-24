/**
 * The offices of the "Create an office" wizard (client-safe): which rooms each layout has, from which built-in room
 * template, at which size, and which one people land in. Doors link every room to the default room.
 */
import { ROOM_SIZE_PRESETS, presetSize, type RoomSize, type RoomSizePresetKey } from "./size";

export const OFFICE_LAYOUTS = ["open", "hybrid", "private"] as const;
export type OfficeLayout = (typeof OFFICE_LAYOUTS)[number];

export type OfficeRoomKind = "reception" | "openOffice" | "meeting" | "lounge" | "focus";

/** Built-in room templates (catalog/builtin) each kind of room is made from. */
export const OFFICE_TEMPLATES: Record<OfficeRoomKind, string> = {
    reception: "reception-lobby",
    openOffice: "open-office",
    meeting: "meeting-room",
    lounge: "lounge",
    focus: "meeting-room",
};

/** Focus rooms of a "Private" office, by team size. */
export const FOCUS_ROOMS: Record<RoomSizePresetKey, number> = { small: 3, medium: 4, large: 6, huge: 8 };

export interface PlannedRoom {
    kind: OfficeRoomKind;
    /** 1-based number among the rooms of its kind, when there are several (Meeting room 2). */
    number: number | undefined;
    slug: string;
    template: string;
    /** Undefined: the template's own size. */
    size: RoomSize | undefined;
    isDefault: boolean;
}

/** One preset smaller than `size` (the template's own size below Small). */
function smaller(size: RoomSizePresetKey): RoomSize | undefined {
    const index = ROOM_SIZE_PRESETS.findIndex((p) => p.key === size);
    return index > 0 ? presetSize(ROOM_SIZE_PRESETS[index - 1]!.key) : undefined;
}

function room(
    kind: OfficeRoomKind,
    slug: string,
    size: RoomSize | undefined,
    isDefault = false,
    number?: number,
): PlannedRoom {
    return { kind, number, slug, template: OFFICE_TEMPLATES[kind], size, isDefault };
}

/**
 * The rooms of an office. The main room gets the chosen size; secondary shared rooms one size smaller; meeting and
 * focus rooms keep their template's comfortable size.
 */
export function planOffice(layout: OfficeLayout, size: RoomSizePresetKey): PlannedRoom[] {
    const main = presetSize(size);
    switch (layout) {
        case "open":
            return [room("openOffice", "open-office", main, true), room("meeting", "meeting-room", undefined)];
        case "hybrid":
            return [
                room("reception", "reception", smaller(size), true),
                room("openOffice", "open-office", main),
                room("meeting", "meeting-room-1", undefined, false, 1),
                room("meeting", "meeting-room-2", undefined, false, 2),
                room("lounge", "lounge", smaller(size)),
            ];
        case "private":
            return [
                room("reception", "reception", main, true),
                ...Array.from({ length: FOCUS_ROOMS[size] }, (_, i) =>
                    room("focus", `focus-room-${i + 1}`, undefined, false, i + 1),
                ),
            ];
    }
}

/** Template sizes of the built-in templates (catalog/builtin manifests), for previews before creation. */
export const BUILTIN_TEMPLATE_SIZES: Record<string, RoomSize> = {
    "reception-lobby": { width: 16, height: 11 },
    "open-office": { width: 22, height: 14 },
    "meeting-room": { width: 12, height: 10 },
    lounge: { width: 14, height: 10 },
};

/** The size a planned room will have (for previews). */
export function plannedSize(room: PlannedRoom): RoomSize {
    return room.size ?? BUILTIN_TEMPLATE_SIZES[room.template] ?? { width: 16, height: 12 };
}
