import type { DeepPartial } from "../DeepPartial";
import type { Translation } from "../i18n-types";

const social: DeepPartial<Translation["social"]> = {
    localTime: "🕐 {time} hora local",
    activity: {
        listening: "🎵 {title} — {artist}",
        listeningTitle: "🎵 {title}",
        coding: "💻 Treballant en {repo}",
    },
    notifyWhenFree: {
        action: "Avisa'm quan estigui lliure",
        stop: "Deixar d'esperar",
        watching: "Us avisarem quan {name} estigui lliure.",
        alreadyFree: "{name} ja està lliure.",
        nowFree: "{name} ja està lliure",
    },
    wave: {
        action: "Saludar",
        received: "{name} us saluda",
        receivedBack: "{name} us torna la salutació",
        waveBack: "Tornar la salutació",
        goTo: "Anar-hi",
        message: "Missatge",
        sent: "Heu saludat {name} 👋",
        rateLimited: "Amb calma! Podreu tornar a saludar {name} d'aquí a {seconds} {{segon|segons}}.",
        receiverGone: "{name} ja no està en línia.",
        failed: "No s'ha pogut enviar la vostra salutació a {name}. Torneu-ho a provar.",
    },
    goTo: {
        action: "Anar-hi",
        notFound: "{name} ja no és en aquest mapa.",
        noFreeSpot: "No hi ha cap lloc lliure al costat de {name}.",
        failed: "No s'ha pogut anar fins a {name}. Torneu-ho a provar.",
    },
    knock: {
        prompt: "Aquesta conversa és privada",
        knock: "Trucar",
        waiting: "Heu trucat. Esperant una resposta…",
        received: "{name} està trucant",
        letIn: "Deixar entrar",
        notNow: "Ara no",
        letYouIn: "{name} us ha deixat entrar",
        declined: "{name} ha respost: ara no",
        rateLimited: "Acabeu de trucar. Podreu tornar a trucar d'aquí a {seconds} {{segon|segons}}.",
        failed: "No s'ha pogut trucar. Torneu-ho a provar.",
    },
    someone: "Algú",
};

export default social;
