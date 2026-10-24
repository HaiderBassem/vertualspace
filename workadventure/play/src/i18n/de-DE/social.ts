import type { DeepPartial } from "../DeepPartial";
import type { Translation } from "../i18n-types";

const social: DeepPartial<Translation["social"]> = {
    localTime: "🕐 {time} Ortszeit",
    activity: {
        listening: "🎵 {title} — {artist}",
        listeningTitle: "🎵 {title}",
        coding: "💻 Arbeitet an {repo}",
    },
    notifyWhenFree: {
        action: "Benachrichtigen, wenn frei",
        stop: "Nicht mehr warten",
        watching: "Wir benachrichtigen Sie, sobald {name} frei ist.",
        alreadyFree: "{name} ist jetzt frei.",
        nowFree: "{name} ist jetzt frei",
    },
    wave: {
        action: "Winken",
        received: "{name} winkt Ihnen zu",
        receivedBack: "{name} winkt zurück",
        waveBack: "Zurückwinken",
        goTo: "Hingehen",
        message: "Nachricht",
        sent: "Sie haben {name} zugewinkt 👋",
        rateLimited: "Immer mit der Ruhe! Sie können {name} in {seconds} {{Sekunde|Sekunden}} wieder zuwinken.",
        receiverGone: "{name} ist nicht mehr online.",
        failed: "Ihr Winken an {name} konnte nicht gesendet werden. Bitte versuchen Sie es erneut.",
    },
    goTo: {
        action: "Hingehen",
        notFound: "{name} ist nicht mehr auf dieser Karte.",
        noFreeSpot: "Neben {name} ist kein Platz frei.",
        failed: "Sie konnten nicht zu {name} gehen. Bitte versuchen Sie es erneut.",
    },
    knock: {
        prompt: "Dieses Gespräch ist privat",
        knock: "Anklopfen",
        waiting: "Sie haben angeklopft. Warten auf Antwort…",
        received: "{name} klopft an",
        letIn: "Hereinlassen",
        notNow: "Jetzt nicht",
        letYouIn: "{name} hat Sie hereingelassen",
        declined: "{name} hat geantwortet: Jetzt nicht",
        rateLimited: "Sie haben gerade angeklopft. Sie können in {seconds} {{Sekunde|Sekunden}} wieder anklopfen.",
        failed: "Ihr Anklopfen konnte nicht gesendet werden. Bitte versuchen Sie es erneut.",
    },
    someone: "Jemand",
};

export default social;
