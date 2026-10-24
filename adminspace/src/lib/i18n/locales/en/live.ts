import type { PluralMessage } from "../../index";

const p = (forms: PluralMessage): PluralMessage => forms;

/** Live occupancy of a world and messages broadcast to its rooms. */
export const live = {
    title: "Live",
    description: "Who is in the world right now, and messages shown to everyone in its rooms.",
    total: p({ zero: "Nobody online", one: "{count} person online", other: "{count} people online" }),
    perRoom: "Online per room",
    unavailable:
        "WorkAdventure could not be reached. Check the play URL and the internal pusher URL in the instance settings.",
    updatedAt: "Updated {time}",
    broadcast: {
        title: "Broadcast a message",
        intro: "WorkAdventure delivers the message to everyone currently in the chosen rooms. Some WorkAdventure versions receive these messages without displaying them: see the integration guide.",
        message: "Message",
        target: "Send to",
        allRooms: "Every room of the world",
        send: "Send",
        sent: "Message handed to WorkAdventure.",
        failed: "The message could not be delivered: WorkAdventure could not be reached.",
    },
    people: {
        title: "Connected people",
        connecting: "Connecting to WorkAdventure…",
        connected: "Live: the list updates as people join and leave.",
        disconnected: "Disconnected from WorkAdventure.",
        reconnect: "Reconnect",
        empty: "Nobody connected.",
        notConfigured:
            "To see who is connected in real time, give the same random secret to WorkAdventure's play service (ADMIN_SOCKETS_TOKEN) and to this admin (ADMIN_SOCKETS_TOKEN in its .env), then restart both.",
        columns: {
            name: "Name",
            room: "Room",
            ipAddress: "IP address",
        },
    },
};
