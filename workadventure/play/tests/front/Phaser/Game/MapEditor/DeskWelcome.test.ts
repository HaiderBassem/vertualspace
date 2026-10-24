import { beforeEach, describe, expect, it, vi } from "vitest";
import { offerDeskToNewcomer, type DeskWelcomeDeps } from "../../../../../src/front/Phaser/Game/MapEditor/DeskWelcome";

describe("offerDeskToNewcomer", () => {
    let deps: DeskWelcomeDeps;
    let shown: { onFind: () => void; onLater: () => void } | undefined;
    let findDesk: ReturnType<typeof vi.fn<() => Promise<void>>>;
    let markOffered: ReturnType<typeof vi.fn<() => void>>;

    function makeDeps(overrides: Partial<DeskWelcomeDeps> = {}): DeskWelcomeDeps {
        return {
            freeDeskAvailable: () => true,
            alreadyOffered: () => false,
            markOffered,
            show: (actions) => {
                shown = actions;
            },
            findDesk,
            ...overrides,
        };
    }

    beforeEach(() => {
        shown = undefined;
        findDesk = vi.fn<() => Promise<void>>().mockResolvedValue(undefined);
        markOffered = vi.fn<() => void>();
        deps = makeDeps();
    });

    it("offers a desk to a newcomer when one is free for them, and remembers that it did", () => {
        expect(offerDeskToNewcomer(deps)).toBe(true);

        expect(shown).toBeDefined();
        expect(markOffered).toHaveBeenCalledOnce();
    });

    it("says nothing when no desk is free for them (they have one already, or none is open to them)", () => {
        expect(offerDeskToNewcomer(makeDeps({ freeDeskAvailable: () => false }))).toBe(false);

        expect(shown).toBeUndefined();
        expect(markOffered).not.toHaveBeenCalled();
    });

    it("never offers twice in the same browser", () => {
        expect(offerDeskToNewcomer(makeDeps({ alreadyOffered: () => true }))).toBe(false);

        expect(shown).toBeUndefined();
        expect(markOffered).not.toHaveBeenCalled();
    });

    it("takes the player to a free desk when they accept", () => {
        offerDeskToNewcomer(deps);

        shown?.onFind();

        expect(findDesk).toHaveBeenCalledOnce();
    });

    it("leaves the player alone when they say not now", () => {
        offerDeskToNewcomer(deps);

        shown?.onLater();

        expect(findDesk).not.toHaveBeenCalled();
    });

    it("does not let a failure to walk to the desk escape", async () => {
        const error = vi.spyOn(console, "error").mockImplementation(() => undefined);
        findDesk.mockRejectedValue(new Error("no path"));
        offerDeskToNewcomer(deps);

        shown?.onFind();
        await Promise.resolve();
        await Promise.resolve();

        expect(error).toHaveBeenCalled();
        error.mockRestore();
    });
});
