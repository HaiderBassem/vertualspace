/** Organization home: the administrators' overview, the employees' workspace, and the directory. */
import type { PluralMessage } from "../../index";

const p = (forms: PluralMessage): PluralMessage => forms;

export const home = {
    joined: "Welcome! You are now a member of {organization}.",
    overview: {
        title: "Overview",
        intro: "The state of your organization at a glance.",
        stats: {
            workspaces: "Workspaces",
            worlds: "Worlds",
            rooms: "Rooms",
            people: "People",
            pendingInvitations: "Pending invitations",
        },
        setup: "Finish setting up",
        setupProgress: "{done} of {total} done",
        worldsTitle: "Worlds",
        worldsIntro: "Virtual offices in WorkAdventure. Each belongs to a workspace.",
        workspaceColumn: "Workspace",
        activity: "Recent activity",
        activityEmpty: "Nothing has happened yet.",
        allActivity: "See the audit log",
        newWorld: "New world",
        invite: "Invite people",
    },
    employee: {
        greeting: "Welcome, {name}",
        intro: "Your offices in {organization}, your teammates and the shared components.",
        offices: "Your offices",
        officesIntro: "Open an office in WorkAdventure. Log in there with {email} to be recognized as a member.",
        noOffices: "You do not have access to an office yet.",
        noOfficesHint: "An administrator of your organization can give you access to a workspace.",
        enter: "Enter",
        rooms: p({ zero: "No room yet", one: "{count} room", other: "{count} rooms" }),
        unavailable: "WorkAdventure's address is not configured on this platform.",
        teammates: "Teammates",
        allTeammates: "See everyone",
        components: "Office components",
        componentsIntro: "Furniture and decorations available for your offices.",
        browseComponents: "Browse components",
    },
    directory: {
        title: "Directory",
        intro: "The people of {organization}.",
        search: "Search by name or email",
        empty: "No one matches your search.",
        count: p({ zero: "No one", one: "{count} person", other: "{count} people" }),
    },
};
