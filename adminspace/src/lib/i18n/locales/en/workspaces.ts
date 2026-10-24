/** Workspaces: AdminSpace groupings of worlds (departments, sites), their managers and members. */
import type { PluralMessage } from "../../index";

const p = (forms: PluralMessage): PluralMessage => forms;

export const workspaces = {
    defaultName: "Main workspace",
    title: "Workspaces",
    intro: "A workspace groups worlds, for a department or a site. Its managers administer its worlds; its members can enter them. WorkAdventure addresses do not change.",
    create: "New workspace",
    createTitle: "Create a workspace",
    created: "The workspace has been created.",
    updated: "The workspace has been updated.",
    empty: "No workspace yet.",
    showArchived: "Show archived workspaces",
    archived: "Archived",
    worldCount: p({ zero: "No worlds", one: "{count} world", other: "{count} worlds" }),
    peopleCount: p({ zero: "No one assigned", one: "{count} person", other: "{count} people" }),
    fields: {
        name: "Name",
        slug: "URL identifier",
        description: "Description",
    },
    hints: {
        slug: "Used in back-office addresses only, not in WorkAdventure.",
        description: "What this workspace is for, e.g. the Paris office or the sales team.",
    },
    detail: {
        worlds: "Worlds",
        worldsIntro: "Worlds of this workspace. Moving a world to another workspace keeps its WorkAdventure address.",
        noWorlds: "This workspace has no world yet.",
        newWorld: "New world in this workspace",
        people: "Managers and members",
        peopleIntro:
            "Managers administer the worlds of this workspace. Members can enter them when the world is reserved to members. Organization administrators already have access to every workspace.",
        noPeople: "No one is assigned to this workspace.",
        assign: "Assign someone",
        assignPerson: "Person",
        assignRole: "Access",
        assignSubmit: "Assign",
        assigned: "Access updated.",
        unassign: "Remove access",
        unassignTitle: "Remove {name} from this workspace?",
        unassigned: "Access removed.",
        notMember: "This person is not a member of the organization. Invite them first.",
        settings: "Workspace settings",
    },
    archive: {
        action: "Archive the workspace",
        title: "Archive {name}?",
        description:
            "Its active worlds are archived too: WorkAdventure refuses their addresses until the workspace is restored. Restoring brings back exactly these worlds.",
        done: p({
            zero: "The workspace has been archived.",
            one: "The workspace and {count} world have been archived.",
            other: "The workspace and {count} worlds have been archived.",
        }),
        lastActive: "An organization needs at least one active workspace.",
        restore: "Restore the workspace",
        restored: p({
            zero: "The workspace has been restored.",
            one: "The workspace and {count} world have been restored.",
            other: "The workspace and {count} worlds have been restored.",
        }),
    },
    remove: {
        action: "Delete the workspace",
        title: "Delete {name}?",
        description: "Only an empty workspace can be deleted. Its access assignments are deleted with it.",
        notEmpty: "Move or delete the worlds of this workspace first.",
        lastWorkspace: "An organization needs at least one workspace.",
        done: "The workspace has been deleted.",
    },
    move: {
        title: "Workspace",
        intro: "The workspace this world belongs to. Its managers administer the world.",
        submit: "Move the world",
        done: "The world has been moved.",
    },
    pick: "Workspace",
    pickHint: "Who administers this world: the organization's administrators and this workspace's managers.",
};
