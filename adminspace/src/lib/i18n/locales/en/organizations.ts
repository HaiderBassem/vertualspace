/** Organizations: list, creation, settings, team (back-office administrators). */
import type { PluralMessage } from "../../index";

const p = (forms: PluralMessage): PluralMessage => forms;

export const organizations = {
    title: "Organizations",
    intro: "An organization groups worlds and the people who administer them.",
    create: "New organization",
    createTitle: "Create an organization",
    createIntro: "You will be its owner. You can add other administrators afterwards.",
    createNotAllowed: "Only platform administrators can create organizations on this instance.",
    created: "The organization has been created.",
    empty: "You are not a member of any organization yet.",
    worldCount: p({ zero: "No worlds", one: "{count} world", other: "{count} worlds" }),
    fields: {
        name: "Name",
        slug: "URL identifier",
        country: "Country",
        defaultLocale: "Default language",
        contactEmail: "Contact email",
    },
    hints: {
        slug: "Appears in every world address: /@/{slug}/…",
        country: "Country where the organization is established (ISO 3166-1).",
        defaultLocale: "Language suggested for content created for this organization.",
        contactEmail: "Who to contact about this organization.",
    },
    noCountry: "Not specified",
    worlds: {
        title: "Worlds",
        newWorld: "New world",
        empty: "This organization has no world yet.",
        showArchived: "Show archived worlds",
        columns: {
            world: "World",
            access: "Access",
            state: "State",
            created: "Created",
        },
    },
    settings: {
        title: "Organization settings",
        intro: "Identity and contact details of the organization.",
        slugReadOnly: "The URL identifier cannot be changed: it would break every world address.",
        dangerZone: "Danger zone",
        deleteTitle: "Delete this organization",
        deleteDescription:
            "Deletes all its worlds, rooms, members, bans, reports and API keys. WorkAdventure will refuse every address of these worlds. This cannot be undone.",
    },
    team: {
        addRequested:
            "If an account uses this email address, it is now part of the team with this role. Invitations by email are not available: if needed, ask a superadmin to create the account first.",
        title: "Team",
        intro: "People who can administer this organization in Adminspace, and what they are allowed to do.",
        add: "Add an administrator",
        addIntro: "The person needs an Adminspace account. Ask a platform administrator to create one if needed.",
        accountNotFound: "No account uses this email address.",
        alreadyMember: "This person is already in the team.",
        lastOwner: "An organization needs at least one owner.",
        added: "The administrator has been added.",
        roleChanged: "The role has been changed.",
        removed: "The administrator has been removed.",
        remove: "Remove",
        removeTitle: "Remove {name} from the team?",
        removeDescription: "They will lose access to this organization in Adminspace.",
        you: "you",
        rolesTitle: "Roles",
        columns: {
            person: "Person",
            role: "Role",
            since: "Member since",
            lastLogin: "Last login",
        },
    },
    audit: {
        title: "Audit log",
        intro: "Every change made in this organization, by its administrators or by WorkAdventure (bans, reports). Times are shown in your time zone.",
        filterAction: "Action starts with",
        empty: "No entry.",
        columns: {
            time: "Time",
            actor: "By",
            action: "Action",
            target: "Target",
            ip: "IP address",
            details: "Details",
        },
    },
};
