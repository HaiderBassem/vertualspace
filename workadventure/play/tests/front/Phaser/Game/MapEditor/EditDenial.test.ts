import { describe, expect, it, vi } from "vitest";
import { getEditDenialMessage, parseEditDenialCode } from "../../../../../src/front/Phaser/Game/MapEditor/EditDenial";

vi.mock("../../../../../src/i18n/i18n-svelte", async () => {
    const { readable } = await import("svelte/store");
    const text = (message: string) => () => message;
    return {
        default: readable({
            area: {
                personalArea: {
                    errors: {
                        taken: text("taken"),
                        notClaimable: text("not claimable"),
                        disabled: text("disabled"),
                        notEligible: text("not eligible"),
                        alreadyOwned: text("already owned"),
                    },
                },
            },
            mapEditor: { entityEditor: { errors: { cannotPlaceHere: text("cannot place here") } } },
        }),
    };
});

describe("parseEditDenialCode", () => {
    it("reads the code at the start of the reason of a refusal", () => {
        expect(parseEditDenialCode("DESK_TAKEN: user alice may not make this change to the desk d1")).toBe(
            "DESK_TAKEN",
        );
        expect(parseEditDenialCode("ENTITY_OUTSIDE_EDITABLE_AREA: the object is not inside an area")).toBe(
            "ENTITY_OUTSIDE_EDITABLE_AREA",
        );
    });

    it("finds no code in any other reason", () => {
        expect(parseEditDenialCode("Could not find WAM file")).toBeUndefined();
        expect(parseEditDenialCode("")).toBeUndefined();
    });

    it("finds no code that is not at the start, which a user could not forge into the message", () => {
        expect(parseEditDenialCode("something went wrong: DESK_TAKEN: x")).toBeUndefined();
    });
});

describe("getEditDenialMessage", () => {
    it.each([
        ["DESK_TAKEN", "taken"],
        ["DESK_NOT_CLAIMABLE", "not claimable"],
        ["DESK_DISABLED", "disabled"],
        ["DESK_NOT_ELIGIBLE", "not eligible"],
        ["DESK_ALREADY_OWNED", "already owned"],
        ["ENTITY_OUTSIDE_EDITABLE_AREA", "cannot place here"],
    ])("explains %s", (code, message) => {
        expect(getEditDenialMessage(`${code}: whatever follows`)).toBe(message);
    });

    it("has no message of its own for a refusal that is not a known case, so that the generic one is shown", () => {
        expect(getEditDenialMessage("DESK_CHANGE_NOT_ALLOWED: nope")).toBeUndefined();
        expect(getEditDenialMessage("DESK_FROM_THE_FUTURE: nope")).toBeUndefined();
        expect(getEditDenialMessage("Unknown error")).toBeUndefined();
    });
});
