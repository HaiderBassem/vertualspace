import { z } from "zod";

/**
 * Where the user's desk is, across the maps of the world, so that "Go to my desk" works from any map of the office.
 * It is a private player variable of the world, saved for signed-in users, written whenever the user is in the map of
 * their desk (whoever gave it to them: a claim, an administrator).
 */
export const MY_DESK_VARIABLE = "wa:myDesk";

export const MyDesk = z.object({
    roomUrl: z.string(),
    areaId: z.string(),
    deskName: z.string().optional(),
});
export type MyDesk = z.infer<typeof MyDesk>;

export function parseMyDesk(value: unknown): MyDesk | undefined {
    const result = MyDesk.safeParse(value);
    return result.success ? result.data : undefined;
}

/**
 * What to remember of the user's desk after looking at the map they are in: their desk here, nothing (their desk was
 * in this map and is not theirs any more), or what was remembered (their desk is in another map). Undefined: no change.
 */
export function nextMyDesk(
    saved: MyDesk | undefined,
    roomUrl: string,
    deskHere: { id: string; name: string } | undefined,
): MyDesk | null | undefined {
    if (deskHere) {
        const next: MyDesk = { roomUrl, areaId: deskHere.id, deskName: deskHere.name };
        return saved &&
            saved.roomUrl === next.roomUrl &&
            saved.areaId === next.areaId &&
            saved.deskName === next.deskName
            ? undefined
            : next;
    }
    return saved && saved.roomUrl === roomUrl ? null : undefined;
}

let sitAtDeskOnArrival = false;

/** The user travels to the map of their desk: they will sit at it once there. */
export function requestSitAtDeskOnArrival(): void {
    sitAtDeskOnArrival = true;
}

/** Whether the user just travelled to sit at their desk (asked once). */
export function consumeSitAtDeskOnArrival(): boolean {
    const requested = sitAtDeskOnArrival;
    sitAtDeskOnArrival = false;
    return requested;
}
