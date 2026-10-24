import type { DeepPartial } from "../DeepPartial";
import type { Translation } from "../i18n-types";

const customStatus: DeepPartial<Translation["customStatus"]> = {
    title: "Estado personalizado",
    set: "Establecer un estado…",
    clear: "Borrar el estado",
    edit: "Editar el estado",
    emojiLabel: "Emoji",
    textLabel: "¿Cuál es su estado?",
    textPlaceholder: "p. ej. De vacaciones hasta el lunes",
    durationLabel: "Borrar después de",
    durations: {
        never: "No borrar",
        "30m": "30 minutos",
        "1h": "1 hora",
        "4h": "4 horas",
        today: "Hoy",
        week: "Esta semana",
    },
    presets: {
        meeting: "En una reunión",
        commuting: "De camino",
        sick: "De baja",
        vacation: "De vacaciones",
        remote: "Teletrabajando",
        focus: "Concentración",
    },
    save: "Guardar",
    cancel: "Cancelar",
    focusSession: {
        title: "Concentración",
        hint: "No molestar durante un rato, incluso al desplazarse",
        minutes: "{count} min",
        until: "🎧 Concentración hasta las {time}",
        end: "Terminar",
        status: "Concentración",
    },
};

export default customStatus;
