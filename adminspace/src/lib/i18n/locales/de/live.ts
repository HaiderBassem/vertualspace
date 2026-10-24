import type { PluralMessage } from "../../index";
import type { Messages } from "../en";

const p = (forms: PluralMessage): PluralMessage => forms;

/** Aktuelle Belegung einer Welt und Nachrichten an ihre Räume. */
export const live: Messages["live"] = {
    title: "Live",
    description: "Wer gerade in der Welt ist, und Nachrichten, die allen in ihren Räumen angezeigt werden.",
    total: p({ zero: "Niemand online", one: "{count} Person online", other: "{count} Personen online" }),
    perRoom: "Online pro Raum",
    unavailable:
        "WorkAdventure ist nicht erreichbar. Prüfen Sie die Play-URL und die interne Pusher-URL in den Instanzeinstellungen.",
    updatedAt: "Aktualisiert {time}",
    broadcast: {
        title: "Nachricht senden",
        intro: "WorkAdventure übermittelt die Nachricht an alle Personen, die sich gerade in den gewählten Räumen befinden. Manche WorkAdventure-Versionen empfangen diese Nachrichten, ohne sie anzuzeigen: siehe Integrationsleitfaden.",
        message: "Nachricht",
        target: "Senden an",
        allRooms: "Alle Räume der Welt",
        send: "Senden",
        sent: "Nachricht an WorkAdventure übergeben.",
        failed: "Die Nachricht konnte nicht zugestellt werden: WorkAdventure ist nicht erreichbar.",
    },
    people: {
        title: "Verbundene Personen",
        connecting: "Verbindung zu WorkAdventure wird hergestellt …",
        connected: "Live: Die Liste aktualisiert sich, wenn Personen kommen und gehen.",
        disconnected: "Verbindung zu WorkAdventure getrennt.",
        reconnect: "Erneut verbinden",
        empty: "Niemand verbunden.",
        notConfigured:
            "Um in Echtzeit zu sehen, wer verbunden ist, geben Sie dem Play-Dienst von WorkAdventure (ADMIN_SOCKETS_TOKEN) und dieser Verwaltung (ADMIN_SOCKETS_TOKEN in ihrer .env) dasselbe zufällige Geheimnis und starten Sie beide neu.",
        columns: {
            name: "Name",
            room: "Raum",
            ipAddress: "IP-Adresse",
        },
    },
};
