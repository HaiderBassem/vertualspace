import type { DeepPartial } from "../DeepPartial";
import type { Translation } from "../i18n-types";

const social: DeepPartial<Translation["social"]> = {
    localTime: "🕐 {time} lokalny čas",
    activity: {
        listening: "🎵 {title} — {artist}",
        listeningTitle: "🎵 {title}",
        coding: "💻 Dźěła na {repo}",
    },
    notifyWhenFree: {
        action: "Zdźělić, hdyž je swobodny",
        stop: "Hižo nječakać",
        watching: "Zdźělimy wam, hdyž je {name} swobodny.",
        alreadyFree: "{name} je nětko swobodny.",
        nowFree: "{name} je nětko swobodny",
    },
    wave: {
        action: "Kiwnyć",
        received: "{name} wam kiwa",
        receivedBack: "{name} wróćo kiwa",
        waveBack: "Wróćo kiwnyć",
        goTo: "Tam hić",
        message: "Powěsć",
        sent: "Kiwnjenje za {name} je so pósłało 👋",
        rateLimited: "Pomałku! {name} móžeće zaso za {seconds} {{|sekundu|sekundźe|sekundy|sekundow|sekundow}} kiwnyć.",
        receiverGone: "{name} hižo online njeje.",
        failed: "Kiwnjenje za {name} njeda so pósłać. Prošu spytajće hišće raz.",
    },
    goTo: {
        action: "Tam hić",
        notFound: "{name} hižo na tutej karće njeje.",
        noFreeSpot: "Pódla {name} žane swobodne městno njeje.",
        failed: "K {name} njeje móžno hić. Prošu spytajće hišće raz.",
    },
    knock: {
        prompt: "Tuta rozmołwa je priwatna",
        knock: "Klepnyć",
        waiting: "Sće klepnyli. Čaka so na wotmołwu…",
        received: "{name} klepa",
        letIn: "Nutř pušćić",
        notNow: "Nětko nic",
        letYouIn: "{name} was nutř pušća",
        declined: "Wotmołwa wot {name}: nětko nic",
        rateLimited:
            "Sće runje klepnyli. Zaso klepnyć móžeće za {seconds} {{|sekundu|sekundźe|sekundy|sekundow|sekundow}}.",
        failed: "Klepnjenje njeda so pósłać. Prošu spytajće hišće raz.",
    },
    someone: "Něchtó",
};

export default social;
