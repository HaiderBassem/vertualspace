/**
 * The welcome of a newcomer who has no desk yet: once per browser, when they enter a map with at least one desk they can
 * claim, they are offered to be taken to the nearest one. Claiming itself stays what it always was (walking into the desk
 * opens the usual dialog), so everything the server checks about a claim still applies.
 *
 * What the browser does around it is passed in, so that the decision can be tested without a game.
 */
export interface DeskWelcomeDeps {
    /** The player has no desk and at least one free desk on the map is open to them. */
    freeDeskAvailable: () => boolean;
    /** The offer was already made in this browser. */
    alreadyOffered: () => boolean;
    markOffered: () => void;
    /** Shows the offer. `onFind` takes the player to the nearest free desk, `onLater` lets them be. */
    show: (actions: { onFind: () => void; onLater: () => void }) => void;
    /** Takes the player to the nearest free desk. */
    findDesk: () => Promise<void>;
}

/** Makes the offer if it is due. Returns whether it was shown. */
export function offerDeskToNewcomer(deps: DeskWelcomeDeps): boolean {
    if (deps.alreadyOffered() || !deps.freeDeskAvailable()) return false;
    // Offered once, even if it is missed or dismissed: the menu keeps "find a free desk" for whenever they want it.
    deps.markOffered();
    deps.show({
        onFind: () => {
            deps.findDesk().catch((error) => console.error("Error while walking to a free desk", error));
        },
        onLater: () => undefined,
    });
    return true;
}
