import type { DeepPartial } from "../DeepPartial";
import type { Translation } from "../i18n-types";

const social: DeepPartial<Translation["social"]> = {
    localTime: "🕐 {time} horário local",
    activity: {
        listening: "🎵 {title} — {artist}",
        listeningTitle: "🎵 {title}",
        coding: "💻 Trabalhando em {repo}",
    },
    notifyWhenFree: {
        action: "Avise-me quando estiver livre",
        stop: "Parar de esperar",
        watching: "Avisaremos você quando {name} estiver livre.",
        alreadyFree: "{name} está livre agora.",
        nowFree: "{name} está livre agora",
    },
    wave: {
        action: "Acenar",
        received: "{name} acenou para você",
        receivedBack: "{name} acenou de volta",
        waveBack: "Acenar de volta",
        goTo: "Ir até",
        message: "Mensagem",
        sent: "Você acenou para {name} 👋",
        rateLimited: "Calma! Você poderá acenar para {name} de novo em {seconds} segundo{{s}}.",
        receiverGone: "{name} não está mais online.",
        failed: "Não foi possível enviar seu aceno para {name}. Tente novamente.",
    },
    goTo: {
        action: "Ir até",
        notFound: "{name} não está mais neste mapa.",
        noFreeSpot: "Não há espaço livre ao lado de {name}.",
        failed: "Não foi possível ir até {name}. Tente novamente.",
    },
    knock: {
        prompt: "Esta conversa é privada",
        knock: "Bater",
        waiting: "Você bateu. Aguardando resposta…",
        received: "{name} está batendo",
        letIn: "Deixar entrar",
        notNow: "Agora não",
        letYouIn: "{name} deixou você entrar",
        declined: "{name} respondeu: agora não",
        rateLimited: "Você acabou de bater. Poderá bater de novo em {seconds} segundo{{s}}.",
        failed: "Não foi possível bater. Tente novamente.",
    },
    someone: "Alguém",
};

export default social;
