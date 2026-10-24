import type { DeepPartial } from "../DeepPartial";
import type { Translation } from "../i18n-types";

const customStatus: DeepPartial<Translation["customStatus"]> = {
    title: "Stato personalizzato",
    set: "Imposta uno stato…",
    clear: "Cancella stato",
    edit: "Modifica stato",
    emojiLabel: "Emoji",
    textLabel: "Qual è il tuo stato?",
    textPlaceholder: "es. In ferie fino a lunedì",
    durationLabel: "Cancella dopo",
    durations: {
        never: "Non cancellare",
        "30m": "30 minuti",
        "1h": "1 ora",
        "4h": "4 ore",
        today: "Oggi",
        week: "Questa settimana",
    },
    presets: {
        meeting: "In una riunione",
        commuting: "In viaggio",
        sick: "In malattia",
        vacation: "In ferie",
        remote: "In smart working",
        focus: "Concentrazione",
    },
    save: "Salva",
    cancel: "Annulla",
    focusSession: {
        title: "Concentrazione",
        hint: "Non disturbare per un po', anche quando ti sposti",
        minutes: "{count} min",
        until: "🎧 Concentrazione fino alle {time}",
        end: "Termina",
        status: "Concentrazione",
    },
};

export default customStatus;
