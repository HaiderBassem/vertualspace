import type { DeepPartial } from "../DeepPartial";
import type { Translation } from "../i18n-types";

const customStatus: DeepPartial<Translation["customStatus"]> = {
    title: "Estat personalitzat",
    set: "Definir un estat…",
    clear: "Esborrar l'estat",
    edit: "Editar l'estat",
    emojiLabel: "Emoji",
    textLabel: "Quin és el vostre estat?",
    textPlaceholder: "p. ex. De vacances fins dilluns",
    durationLabel: "Esborrar després de",
    durations: {
        never: "No esborrar",
        "30m": "30 minuts",
        "1h": "1 hora",
        "4h": "4 hores",
        today: "Avui",
        week: "Aquesta setmana",
    },
    presets: {
        meeting: "En una reunió",
        commuting: "De camí",
        sick: "De baixa",
        vacation: "De vacances",
        remote: "Teletreballant",
        focus: "Concentració",
    },
    save: "Guardar",
    cancel: "Cancel·lar",
    focusSession: {
        title: "Concentració",
        hint: "No molestar durant una estona, fins i tot quan us desplaceu",
        minutes: "{count} min",
        until: "🎧 Concentració fins a les {time}",
        end: "Acabar",
        status: "Concentració",
    },
};

export default customStatus;
