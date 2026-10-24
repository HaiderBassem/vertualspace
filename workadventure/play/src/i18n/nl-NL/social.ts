import type { DeepPartial } from "../DeepPartial";
import type { Translation } from "../i18n-types";

const social: DeepPartial<Translation["social"]> = {
    localTime: "🕐 {time} lokale tijd",
    activity: {
        listening: "🎵 {title} — {artist}",
        listeningTitle: "🎵 {title}",
        coding: "💻 Werkt aan {repo}",
    },
    notifyWhenFree: {
        action: "Laat me weten wanneer vrij",
        stop: "Stop met wachten",
        watching: "We laten je weten wanneer {name} vrij is.",
        alreadyFree: "{name} is nu vrij.",
        nowFree: "{name} is nu vrij",
    },
    wave: {
        action: "Zwaaien",
        received: "{name} zwaait naar je",
        receivedBack: "{name} zwaait terug",
        waveBack: "Terugzwaaien",
        goTo: "Ga naar",
        message: "Bericht",
        sent: "Je zwaaide naar {name} 👋",
        rateLimited: "Rustig aan! Je kunt over {seconds} {{seconde|seconden}} weer naar {name} zwaaien.",
        receiverGone: "{name} is niet meer online.",
        failed: "Je zwaai naar {name} kon niet worden verzonden. Probeer het opnieuw.",
    },
    goTo: {
        action: "Ga naar",
        notFound: "{name} is niet meer op deze kaart.",
        noFreeSpot: "Er is geen vrije plek naast {name}.",
        failed: "Kon niet naar {name} gaan. Probeer het opnieuw.",
    },
    knock: {
        prompt: "Dit gesprek is privé",
        knock: "Aankloppen",
        waiting: "Je hebt aangeklopt. Wachten op antwoord…",
        received: "{name} klopt aan",
        letIn: "Binnenlaten",
        notNow: "Niet nu",
        letYouIn: "{name} heeft je binnengelaten",
        declined: "{name} antwoordde: niet nu",
        rateLimited: "Je hebt net aangeklopt. Je kunt over {seconds} {{seconde|seconden}} opnieuw aankloppen.",
        failed: "Aankloppen is mislukt. Probeer het opnieuw.",
    },
    someone: "Iemand",
};

export default social;
