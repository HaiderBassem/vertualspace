import type { DeepPartial } from "../DeepPartial";
import type { Translation } from "../i18n-types";

const social: DeepPartial<Translation["social"]> = {
    localTime: "🕐 {time} ora locale",
    activity: {
        listening: "🎵 {title} — {artist}",
        listeningTitle: "🎵 {title}",
        coding: "💻 Sta lavorando a {repo}",
    },
    notifyWhenFree: {
        action: "Avvisami quando è disponibile",
        stop: "Smetti di aspettare",
        watching: "Ti avviseremo quando {name} sarà disponibile.",
        alreadyFree: "{name} è disponibile ora.",
        nowFree: "{name} è ora disponibile",
    },
    wave: {
        action: "Saluta",
        received: "{name} ti saluta",
        receivedBack: "{name} ricambia il saluto",
        waveBack: "Ricambia il saluto",
        goTo: "Raggiungi",
        message: "Messaggio",
        sent: "Hai salutato {name} 👋",
        rateLimited: "Con calma! Potrai salutare di nuovo {name} tra {seconds} {{secondo|secondi}}.",
        receiverGone: "{name} non è più online.",
        failed: "Impossibile inviare il saluto a {name}. Riprova.",
    },
    goTo: {
        action: "Raggiungi",
        notFound: "{name} non è più su questa mappa.",
        noFreeSpot: "Non c'è un posto libero accanto a {name}.",
        failed: "Impossibile raggiungere {name}. Riprova.",
    },
    knock: {
        prompt: "Questa conversazione è privata",
        knock: "Bussa",
        waiting: "Hai bussato. In attesa di risposta…",
        received: "{name} sta bussando",
        letIn: "Fai entrare",
        notNow: "Non ora",
        letYouIn: "{name} ti ha fatto entrare",
        declined: "{name} ha risposto: non ora",
        rateLimited: "Hai appena bussato. Potrai bussare di nuovo tra {seconds} {{secondo|secondi}}.",
        failed: "Impossibile bussare. Riprova.",
    },
    someone: "Qualcuno",
};

export default social;
