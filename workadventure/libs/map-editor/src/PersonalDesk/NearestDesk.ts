import type { AreaData, PersonalAreaPropertyData } from "../types";
import { isDeskClaimableBy } from "./DeskEligibility";

export interface DeskPoint {
    x: number;
    y: number;
}

/** The personal-area property of an area, if the area is a desk. */
export function getDeskProperty(area: Pick<AreaData, "properties">): PersonalAreaPropertyData | undefined {
    const property = area.properties.find((candidate) => candidate.type === "personalAreaPropertyData");
    return property?.type === "personalAreaPropertyData" ? property : undefined;
}

/** Whether this user already has a desk among these areas. Users are told apart by the identifier the desk was given to. */
export function hasADesk(areas: readonly Pick<AreaData, "properties">[], userId: string | undefined): boolean {
    if (!userId) return false;
    return areas.some((area) => getDeskProperty(area)?.ownerId === userId);
}

/** How many desks a user with these tags could claim right now. */
export function countClaimableDesks(
    areas: readonly Pick<AreaData, "properties">[],
    userTags: readonly string[],
): number {
    return areas.filter((area) => {
        const desk = getDeskProperty(area);
        return desk !== undefined && isDeskClaimableBy(desk, userTags);
    }).length;
}

/**
 * The free desk closest to a point that a user with these tags can claim, or undefined when there is none. Distances are
 * taken to the centre of each desk; two desks at the same distance are told apart by their id so that the answer never
 * depends on the order of the areas.
 */
export function findNearestClaimableDesk<
    T extends Pick<AreaData, "id" | "x" | "y" | "width" | "height" | "properties">,
>(areas: readonly T[], userTags: readonly string[], from: DeskPoint): T | undefined {
    let best: { area: T; distance: number } | undefined;
    for (const area of areas) {
        const desk = getDeskProperty(area);
        if (desk === undefined || !isDeskClaimableBy(desk, userTags)) continue;
        const distance = Math.hypot(area.x + area.width / 2 - from.x, area.y + area.height / 2 - from.y);
        if (best === undefined || distance < best.distance || (distance === best.distance && area.id < best.area.id)) {
            best = { area, distance };
        }
    }
    return best?.area;
}
