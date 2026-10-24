import type { DeepPartial } from "../DeepPartial";
import type { Translation } from "../i18n-types";

const customStatus: DeepPartial<Translation["customStatus"]> = {
    title: "Aangepaste status",
    set: "Status instellen…",
    clear: "Status wissen",
    edit: "Status bewerken",
    emojiLabel: "Emoji",
    textLabel: "Wat is je status?",
    textPlaceholder: "bijv. Op vakantie tot maandag",
    durationLabel: "Wissen na",
    durations: {
        never: "Niet wissen",
        "30m": "30 minuten",
        "1h": "1 uur",
        "4h": "4 uur",
        today: "Vandaag",
        week: "Deze week",
    },
    presets: {
        meeting: "In een vergadering",
        commuting: "Onderweg",
        sick: "Ziek",
        vacation: "Op vakantie",
        remote: "Werkt op afstand",
        focus: "Gefocust",
    },
    save: "Opslaan",
    cancel: "Annuleren",
    focusSession: {
        title: "Focus",
        hint: "Een tijdje niet storen, ook als je rondloopt",
        minutes: "{count} min",
        until: "🎧 Gefocust tot {time}",
        end: "Beëindigen",
        status: "Gefocust",
    },
};

export default customStatus;
