/** Texts shown to players on WorkAdventure's error screens, returned through the Admin API. */
export const workadventure = {
    errorTitle: "Access denied",
    roomNotFound: {
        subtitle: "This room does not exist.",
        details: "Check the link you followed, or ask the people who invited you for a new one.",
    },
    worldNotFound: {
        subtitle: "This world does not exist.",
        details: "Check the link you followed, or ask the people who invited you for a new one.",
    },
    worldArchived: {
        subtitle: "This world is closed.",
        details: "Its administrators have archived it. Contact them if you think this is a mistake.",
    },
    worldExpired: {
        subtitle: "This world has expired.",
        details: "Contact its administrators to have it reopened.",
    },
    organizationSuspended: {
        subtitle: "This world is not available.",
        details: "Its organization has been suspended by the platform administrators.",
    },
    roomPreparing: {
        subtitle: "This room is being prepared.",
        details: "Its map is being published. Try again in a minute.",
    },
    invalidUrl: {
        subtitle: "This address is not a valid WorkAdventure room.",
        details: "Check the link you followed.",
    },
    banned: {
        subtitle: "You have been banned from this world.",
        details: "Reason: {reason}",
    },
    membersOnly: {
        subtitle: "This world is reserved to its members.",
        details: "Log in with the account that was invited, or ask the administrators of the world for an invitation.",
        button: "Log out",
    },
    loginRequired: {
        subtitle: "You need to log in to enter this world.",
        details: "Log in to continue.",
        button: "Log in",
    },
    tagRequired: {
        subtitle: "You cannot enter this room.",
        details: "This room is restricted. Ask the administrators of the world if you need access.",
        button: "Log out",
    },
    worldFull: {
        title: "World full",
        subtitle: "This world has reached its maximum number of people.",
        details: "Another attempt will be made automatically in a few moments.",
        button: "Retry",
    },
    banNotAllowed: {
        subtitle: "You are not allowed to ban people in this world.",
        details: "Only administrators of the world can ban people.",
    },
    defaultBanReason: "No reason given.",
};
