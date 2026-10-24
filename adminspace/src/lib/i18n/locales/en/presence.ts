import type { PluralMessage } from "../../index";

const p = (forms: PluralMessage): PluralMessage => forms;

/** "Who's in": people connected to the organization's worlds right now (docs/PRESENCE.md). */
export const presence = {
    nav: "Who's in",
    title: "Who's in",
    intro: "People connected to your organization's worlds right now, as WorkAdventure reports them. The list refreshes by itself every 15 seconds.",
    privacy:
        "Only people allowed to see members see this page. Nothing is recorded: a person disappears from the list as soon as they leave.",
    online: p({ zero: "Nobody online", one: "{count} person online", other: "{count} people online" }),
    signedIn: p({ zero: "nobody signed in", one: "{count} signed in", other: "{count} signed in" }),
    guests: p({ zero: "no guests", one: "{count} guest", other: "{count} guests" }),
    inWorld: p({ one: "{count} person", other: "{count} people" }),
    updated: "Updated",
    refreshing: "Refreshing…",
    refreshFailed: "The list could not be refreshed. It will try again in a few seconds.",
    emptyTitle: "Nobody is in right now",
    emptyText:
        "People appear here a few seconds after they enter one of your worlds. WorkAdventure reports them only when it uses this server as its Admin API.",
    columns: {
        person: "Person",
        status: "Status",
        since: "Since",
        account: "Member",
    },
    signedInBadge: "Signed in",
    guestBadge: "Guest",
    memberPage: "Member page",
    notAMember: "Not a member of this world",
    roomLabel: "Room {room}",
    statuses: {
        online: "Online",
        away: "Away",
        backInAMoment: "Back in a moment",
        busy: "Busy",
        doNotDisturb: "Do not disturb",
        inMeeting: "In a meeting",
        speaking: "Speaking",
        silent: "Silent",
        noProximity: "Not taking conversations",
    },
    onlineNow: "Online now",
};
