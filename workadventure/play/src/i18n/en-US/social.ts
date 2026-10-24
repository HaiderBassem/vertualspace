import type { BaseTranslation } from "../i18n-types";

const social: BaseTranslation = {
    localTime: "🕐 {time} local time",
    activity: {
        listening: "🎵 {title} — {artist}",
        listeningTitle: "🎵 {title}",
        coding: "💻 Working on {repo}",
    },
    notifyWhenFree: {
        action: "Tell me when free",
        stop: "Stop waiting",
        watching: "We will tell you when {name} is free.",
        alreadyFree: "{name} is free now.",
        nowFree: "{name} is free now",
    },
    wave: {
        action: "Wave",
        received: "{name} waved at you",
        receivedBack: "{name} waved back",
        waveBack: "Wave back",
        goTo: "Go to",
        message: "Message",
        sent: "You waved at {name} 👋",
        rateLimited: "Easy there! You can wave at {name} again in {seconds:number} second{{s}}.",
        receiverGone: "{name} is not online anymore.",
        failed: "Your wave to {name} could not be sent. Please try again.",
    },
    goTo: {
        action: "Go to",
        notFound: "{name} is not on this map anymore.",
        noFreeSpot: "There is no free spot next to {name}.",
        failed: "Could not go to {name}. Please try again.",
    },
    knock: {
        prompt: "This conversation is private",
        knock: "Knock",
        waiting: "You knocked. Waiting for an answer…",
        received: "{name} is knocking",
        letIn: "Let in",
        notNow: "Not now",
        letYouIn: "{name} let you in",
        declined: "{name} answered: not now",
        rateLimited: "You just knocked. You can knock again in {seconds:number} second{{s}}.",
        failed: "Your knock could not be sent. Please try again.",
    },
    someone: "Someone",
};

export default social;
