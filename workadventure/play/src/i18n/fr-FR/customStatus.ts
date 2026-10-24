import type { DeepPartial } from "../DeepPartial";
import type { Translation } from "../i18n-types";

const customStatus: DeepPartial<Translation["customStatus"]> = {
    title: "Statut personnalisé",
    set: "Définir un statut…",
    clear: "Effacer le statut",
    edit: "Modifier le statut",
    emojiLabel: "Émoji",
    textLabel: "Quel est votre statut ?",
    textPlaceholder: "ex. En vacances jusqu'à lundi",
    durationLabel: "Effacer après",
    durations: {
        never: "Ne pas effacer",
        "30m": "30 minutes",
        "1h": "1 heure",
        "4h": "4 heures",
        today: "Aujourd'hui",
        week: "Cette semaine",
    },
    presets: {
        meeting: "En réunion",
        commuting: "En déplacement",
        sick: "Malade",
        vacation: "En vacances",
        remote: "En télétravail",
        focus: "Concentré",
    },
    save: "Enregistrer",
    cancel: "Annuler",
    focusSession: {
        title: "Concentration",
        hint: "Ne pas déranger pendant un moment, même en vous déplaçant",
        minutes: "{count} min",
        until: "🎧 Concentré jusqu'à {time}",
        end: "Terminer",
        status: "Concentré",
    },
};

export default customStatus;
