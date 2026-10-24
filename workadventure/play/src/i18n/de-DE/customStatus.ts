import type { DeepPartial } from "../DeepPartial";
import type { Translation } from "../i18n-types";

const customStatus: DeepPartial<Translation["customStatus"]> = {
    title: "Eigener Status",
    set: "Status festlegen…",
    clear: "Status löschen",
    edit: "Status bearbeiten",
    emojiLabel: "Emoji",
    textLabel: "Wie ist Ihr Status?",
    textPlaceholder: "z. B. Bis Montag im Urlaub",
    durationLabel: "Löschen nach",
    durations: {
        never: "Nicht löschen",
        "30m": "30 Minuten",
        "1h": "1 Stunde",
        "4h": "4 Stunden",
        today: "Heute",
        week: "Diese Woche",
    },
    presets: {
        meeting: "In einer Besprechung",
        commuting: "Unterwegs",
        sick: "Krank",
        vacation: "Im Urlaub",
        remote: "Im Homeoffice",
        focus: "Konzentriert",
    },
    save: "Speichern",
    cancel: "Abbrechen",
    focusSession: {
        title: "Fokus",
        hint: "Eine Weile nicht stören, auch beim Herumlaufen",
        minutes: "{count} Min.",
        until: "🎧 Konzentriert bis {time}",
        end: "Beenden",
        status: "Konzentriert",
    },
};

export default customStatus;
