import type { DeepPartial } from "../DeepPartial";
import type { Translation } from "../i18n-types";

const customStatus: DeepPartial<Translation["customStatus"]> = {
    title: "Status personalizado",
    set: "Definir um status…",
    clear: "Limpar status",
    edit: "Editar status",
    emojiLabel: "Emoji",
    textLabel: "Qual é o seu status?",
    textPlaceholder: "ex.: De férias até segunda",
    durationLabel: "Limpar após",
    durations: {
        never: "Não limpar",
        "30m": "30 minutos",
        "1h": "1 hora",
        "4h": "4 horas",
        today: "Hoje",
        week: "Esta semana",
    },
    presets: {
        meeting: "Em uma reunião",
        commuting: "Em trânsito",
        sick: "Doente",
        vacation: "De férias",
        remote: "Trabalhando remotamente",
        focus: "Modo foco",
    },
    save: "Salvar",
    cancel: "Cancelar",
    focusSession: {
        title: "Foco",
        hint: "Não perturbe por um tempo, mesmo quando você se movimentar",
        minutes: "{count} min",
        until: "🎧 Modo foco até {time}",
        end: "Encerrar",
        status: "Modo foco",
    },
};

export default customStatus;
