import type { PluralMessage } from "../../index";
import type { Messages } from "../en";

const p = (forms: PluralMessage): PluralMessage => forms;

/** „Wer ist da“: wer gerade mit den Welten der Organisation verbunden ist (docs/PRESENCE.md). */
export const presence: Messages["presence"] = {
    nav: "Wer ist da",
    title: "Wer ist da",
    intro: "Personen, die gerade mit den Welten Ihrer Organisation verbunden sind, so wie WorkAdventure sie meldet. Die Liste aktualisiert sich alle 15 Sekunden von selbst.",
    privacy:
        "Nur Personen, die Mitglieder sehen dürfen, sehen diese Seite. Nichts wird gespeichert: Wer geht, verschwindet sofort aus der Liste.",
    online: p({ zero: "Niemand online", one: "{count} Person online", other: "{count} Personen online" }),
    signedIn: p({ zero: "niemand angemeldet", one: "{count} angemeldet", other: "{count} angemeldet" }),
    guests: p({ zero: "keine Gäste", one: "{count} Gast", other: "{count} Gäste" }),
    inWorld: p({ one: "{count} Person", other: "{count} Personen" }),
    updated: "Aktualisiert",
    refreshing: "Wird aktualisiert…",
    refreshFailed: "Die Liste konnte nicht aktualisiert werden. Neuer Versuch in wenigen Sekunden.",
    emptyTitle: "Gerade ist niemand da",
    emptyText:
        "Personen erscheinen hier wenige Sekunden, nachdem sie eine Ihrer Welten betreten haben. WorkAdventure meldet sie nur, wenn es diesen Server als Admin-API verwendet.",
    columns: {
        person: "Person",
        status: "Status",
        since: "Seit",
        account: "Mitglied",
    },
    signedInBadge: "Angemeldet",
    guestBadge: "Gast",
    memberPage: "Mitgliedsseite",
    notAMember: "Kein Mitglied dieser Welt",
    roomLabel: "Raum {room}",
    statuses: {
        online: "Online",
        away: "Abwesend",
        backInAMoment: "Gleich zurück",
        busy: "Beschäftigt",
        doNotDisturb: "Nicht stören",
        inMeeting: "In einem Meeting",
        speaking: "Spricht",
        silent: "Stumm",
        noProximity: "Nimmt keine Gespräche an",
    },
    onlineNow: "Gerade online",
};
