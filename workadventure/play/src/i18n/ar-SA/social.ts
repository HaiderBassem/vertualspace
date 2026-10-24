import type { DeepPartial } from "../DeepPartial";
import type { Translation } from "../i18n-types";

const social: DeepPartial<Translation["social"]> = {
    localTime: "🕐 {time} بالتوقيت المحلي",
    activity: {
        listening: "🎵 {title} — {artist}",
        listeningTitle: "🎵 {title}",
        coding: "💻 يعمل على {repo}",
    },
    notifyWhenFree: {
        action: "أعلمني عندما يصبح متاحًا",
        stop: "إيقاف الانتظار",
        watching: "سنُعلمك عندما يصبح {name} متاحًا.",
        alreadyFree: "{name} متاح الآن.",
        nowFree: "{name} متاح الآن",
    },
    wave: {
        action: "تلويح",
        received: "{name} لوّح لك",
        receivedBack: "{name} ردّ التلويح",
        waveBack: "ردّ التلويح",
        goTo: "انتقال",
        message: "رسالة",
        sent: "لوّحت لـ {name} 👋",
        rateLimited: "مهلًا! يمكنك التلويح لـ {name} مرة أخرى بعد {seconds} {{ثوانٍ|ثانية|ثانيتين|ثوانٍ|ثانية|ثانية}}.",
        receiverGone: "{name} لم يعد متصلًا.",
        failed: "تعذر إرسال تلويحك إلى {name}. يرجى المحاولة مرة أخرى.",
    },
    goTo: {
        action: "انتقال",
        notFound: "{name} لم يعد على هذه الخريطة.",
        noFreeSpot: "لا يوجد مكان فارغ بجانب {name}.",
        failed: "تعذر الانتقال إلى {name}. يرجى المحاولة مرة أخرى.",
    },
    knock: {
        prompt: "هذه المحادثة خاصة",
        knock: "طرق الباب",
        waiting: "طرقت الباب. في انتظار الرد…",
        received: "{name} يطرق الباب",
        letIn: "السماح بالدخول",
        notNow: "ليس الآن",
        letYouIn: "سمح لك {name} بالدخول",
        declined: "ردّ {name}: ليس الآن",
        rateLimited:
            "لقد طرقت الباب للتو. يمكنك الطرق مرة أخرى بعد {seconds} {{ثوانٍ|ثانية|ثانيتين|ثوانٍ|ثانية|ثانية}}.",
        failed: "تعذر إرسال طرقك على الباب. يرجى المحاولة مرة أخرى.",
    },
    someone: "شخص ما",
};

export default social;
