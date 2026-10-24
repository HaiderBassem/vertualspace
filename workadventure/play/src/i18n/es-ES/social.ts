import type { DeepPartial } from "../DeepPartial";
import type { Translation } from "../i18n-types";

const social: DeepPartial<Translation["social"]> = {
    localTime: "🕐 {time} hora local",
    activity: {
        listening: "🎵 {title} — {artist}",
        listeningTitle: "🎵 {title}",
        coding: "💻 Trabajando en {repo}",
    },
    notifyWhenFree: {
        action: "Avisarme cuando esté libre",
        stop: "Dejar de esperar",
        watching: "Le avisaremos cuando {name} esté libre.",
        alreadyFree: "{name} ya está libre.",
        nowFree: "{name} ya está libre",
    },
    wave: {
        action: "Saludar",
        received: "{name} le saluda",
        receivedBack: "{name} le devuelve el saludo",
        waveBack: "Devolver el saludo",
        goTo: "Ir",
        message: "Mensaje",
        sent: "Ha saludado a {name} 👋",
        rateLimited: "¡Con calma! Podrá volver a saludar a {name} dentro de {seconds} segundo{{s}}.",
        receiverGone: "{name} ya no está en línea.",
        failed: "No se ha podido enviar su saludo a {name}. Inténtelo de nuevo.",
    },
    goTo: {
        action: "Ir",
        notFound: "{name} ya no está en este mapa.",
        noFreeSpot: "No hay ningún sitio libre junto a {name}.",
        failed: "No se ha podido ir hasta {name}. Inténtelo de nuevo.",
    },
    knock: {
        prompt: "Esta conversación es privada",
        knock: "Llamar",
        waiting: "Ha llamado. Esperando respuesta…",
        received: "{name} está llamando",
        letIn: "Dejar entrar",
        notNow: "Ahora no",
        letYouIn: "{name} le ha dejado entrar",
        declined: "{name} ha respondido: ahora no",
        rateLimited: "Acaba de llamar. Podrá volver a llamar dentro de {seconds} segundo{{s}}.",
        failed: "No se ha podido llamar. Inténtelo de nuevo.",
    },
    someone: "Alguien",
};

export default social;
