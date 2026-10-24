import type { DeepPartial } from "../DeepPartial";
import type { Translation } from "../i18n-types";

const social: DeepPartial<Translation["social"]> = {
    localTime: "🕐 {time} heure locale",
    activity: {
        listening: "🎵 {title} — {artist}",
        listeningTitle: "🎵 {title}",
        coding: "💻 Travaille sur {repo}",
    },
    notifyWhenFree: {
        action: "M'avertir quand disponible",
        stop: "Ne plus attendre",
        watching: "Nous vous avertirons quand {name} sera disponible.",
        alreadyFree: "{name} est disponible maintenant.",
        nowFree: "{name} est maintenant disponible",
    },
    wave: {
        action: "Faire coucou",
        received: "{name} vous fait coucou",
        receivedBack: "{name} vous répond d'un coucou",
        waveBack: "Répondre",
        goTo: "Rejoindre",
        message: "Message",
        sent: "Vous avez fait coucou à {name} 👋",
        rateLimited: "Doucement ! Vous pourrez refaire coucou à {name} dans {seconds} seconde{{s}}.",
        receiverGone: "{name} n'est plus en ligne.",
        failed: "Votre coucou à {name} n'a pas pu être envoyé. Veuillez réessayer.",
    },
    goTo: {
        action: "Rejoindre",
        notFound: "{name} n'est plus sur cette carte.",
        noFreeSpot: "Il n'y a pas de place libre à côté de {name}.",
        failed: "Impossible de rejoindre {name}. Veuillez réessayer.",
    },
    knock: {
        prompt: "Cette conversation est privée",
        knock: "Frapper",
        waiting: "Vous avez frappé. En attente d'une réponse…",
        received: "{name} frappe à la porte",
        letIn: "Faire entrer",
        notNow: "Pas maintenant",
        letYouIn: "{name} vous fait entrer",
        declined: "{name} a répondu : pas maintenant",
        rateLimited: "Vous venez de frapper. Vous pourrez frapper à nouveau dans {seconds} seconde{{s}}.",
        failed: "Impossible de frapper. Veuillez réessayer.",
    },
    someone: "Quelqu'un",
};

export default social;
