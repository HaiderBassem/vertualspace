import type { PluralMessage } from "../../index";

const p = (forms: PluralMessage): PluralMessage => forms;

/** Rooms of a world and the maps they load. */
export const rooms = {
    title: "Rooms",
    description:
        "Each room loads one map. Its URL is the world URL followed by the room identifier, and people move between rooms through that URL or through exits drawn in the maps.",
    newRoom: "New room",
    editRoom: "Edit room",
    empty: "This world has no room yet. Create one so that people can enter it.",
    columns: {
        name: "Room",
        map: "Map",
        access: "Access",
        online: "Online now",
    },
    defaultBadge: "Default",
    defaultHelp: "People opening the world URL without a room name land in the default room.",
    setDefault: "Make default",
    moveUp: "Move up",
    moveDown: "Move down",
    everyone: "Everyone",
    restrictedTo: "Tags: {tags}",
    online: p({ zero: "Nobody", one: "{count} person", other: "{count} people" }),
    occupancyUnavailable: "Occupancy is unavailable: WorkAdventure could not be reached.",
    reload: "Reload for everyone",
    reloadTitle: "Reload this room for everyone?",
    reloadDescription: "Everyone currently in the room is asked to reload it, for example after its map has changed.",
    reloaded: "Everyone in the room has been asked to reload it.",
    deleteTitle: "Delete this room?",
    deleteDescription:
        "Links to this room will show an error. The map file itself is not deleted from where it is hosted.",
    created: "Room created.",
    fields: {
        name: "Name",
        slug: "Room identifier",
        slugHelp: "Lowercase letters, digits, dashes, underscores and slashes (for example floor-1/meeting).",
        description: "Description",
        mapKind: "Map type",
        mapKindWam: "Map-storage map (.wam), editable with WorkAdventure's map editor",
        mapKindTmj: "Tiled map (.tmj or .json) hosted on any web server",
        wamUrl: "WAM file URL",
        wamUrlHelp: "URL of the .wam file in WorkAdventure's map-storage.",
        mapUrl: "Tiled map URL",
        mapUrlHelp: "Public URL of the Tiled map file. Its tilesets must be reachable from the same place.",
        requiredTags: "Tags required to enter",
        requiredTagsHelp:
            "Comma-separated. When set, only members holding at least one of these tags (or the admin tag) may enter.",
        thumbnailUrl: "Thumbnail URL",
        isDefault: "Default room of the world",
    },
    mapStorage: {
        title: "Maps found in map-storage",
        use: "Use this map",
        notConfigured: "Set the map-storage URLs in the instance settings to browse its maps here.",
        unreachable: "Map-storage could not be reached. You can still type the URL of the map.",
        none: "Map-storage contains no map yet.",
    },
    mapWarning:
        "The map of room {slug} did not answer. WorkAdventure will not be able to load the room until its map is reachable.",
    checkMap: "Check map",
    mapCheck: {
        ok: "The map answers (HTTP {status}).",
        unreachable: "The map could not be reached.",
        httpError: "The map answered with an error (HTTP {status}).",
        notChecked: "Not checked: the map is on a private network address.",
    },
    mapProblems: {
        extensionWam: "A map-storage map must be a .wam file.",
        extensionTmj: "A Tiled map must be a .tmj or .json file.",
        otherOrganization: "This map belongs to another organization and cannot be used here.",
    },
};
