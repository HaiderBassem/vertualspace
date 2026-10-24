import type { DeepPartial } from "../DeepPartial";
import type { Translation } from "../i18n-types";

const social: DeepPartial<Translation["social"]> = {
    localTime: "🕐 {time} lokalny cas",
    activity: {
        listening: "🎵 {title} — {artist}",
        listeningTitle: "🎵 {title}",
        coding: "💻 Źěła na {repo}",
    },
    notifyWhenFree: {
        action: "Daś wěźeś, gaž jo wólny",
        stop: "Wěcej njecakaś",
        watching: "Dajomy wam wěźeś, gaž jo {name} wólny.",
        alreadyFree: "{name} jo něnto wólny.",
        nowFree: "{name} jo něnto wólny",
    },
    wave: {
        action: "Kiwnuś",
        received: "{name} wam kiwa",
        receivedBack: "{name} slědk kiwa",
        waveBack: "Slědk kiwnuś",
        goTo: "Tam hyś",
        message: "Powěsć",
        sent: "Kiwnjenje za {name} jo se pósłało 👋",
        rateLimited: "Pomałem! {name} móžośo zasej za {seconds} {{|sekundu|sekunźe|sekundy|sekundow|sekundow}} kiwnuś.",
        receiverGone: "{name} wěcej online njejo.",
        failed: "Kiwnjenje za {name} njedajo se pósłaś. Pšosym wopytajśo hyšći raz.",
    },
    goTo: {
        action: "Tam hyś",
        notFound: "{name} wěcej na toś tej kórśe njejo.",
        noFreeSpot: "Pódla {name} njejo žedne liche městno.",
        failed: "K {name} njejo móžno hyś. Pšosym wopytajśo hyšći raz.",
    },
    knock: {
        prompt: "Toś to rozgrono jo priwatne",
        knock: "Klapnuś",
        waiting: "Sćo klapnuli. Cakajo se na wótegrono…",
        received: "{name} klapa",
        letIn: "Nutś pušćiś",
        notNow: "Něnto nic",
        letYouIn: "{name} was nutś pušćijo",
        declined: "Wótegrono wót {name}: něnto nic",
        rateLimited:
            "Sćo rowno klapnuli. Zasej klapnuś móžośo za {seconds} {{|sekundu|sekunźe|sekundy|sekundow|sekundow}}.",
        failed: "Klapnjenje njedajo se pósłaś. Pšosym wopytajśo hyšći raz.",
    },
    someone: "Něchten",
};

export default social;
