import type { DeepPartial } from "../DeepPartial";
import type { Translation } from "../i18n-types";

const social: DeepPartial<Translation["social"]> = {
    localTime: "🕐 當地時間 {time}",
    activity: {
        listening: "🎵 {title} — {artist}",
        listeningTitle: "🎵 {title}",
        coding: "💻 正在處理 {repo}",
    },
    notifyWhenFree: {
        action: "空閒時通知我",
        stop: "停止等待",
        watching: "{name} 空閒時我們會通知您。",
        alreadyFree: "{name} 現在有空。",
        nowFree: "{name} 現在有空了",
    },
    wave: {
        action: "揮手",
        received: "{name} 向您揮手",
        receivedBack: "{name} 也向您揮手",
        waveBack: "揮手回應",
        goTo: "前往",
        message: "訊息",
        sent: "您向 {name} 揮了揮手 👋",
        rateLimited: "別急！您可以在 {seconds} 秒後再次向 {name} 揮手。",
        receiverGone: "{name} 已不在線上。",
        failed: "無法向 {name} 揮手。請再試一次。",
    },
    goTo: {
        action: "前往",
        notFound: "{name} 已不在此地圖上。",
        noFreeSpot: "{name} 旁邊沒有空位。",
        failed: "無法前往 {name} 身邊。請再試一次。",
    },
    knock: {
        prompt: "這是私人對話",
        knock: "敲門",
        waiting: "您已敲門，正在等待回應…",
        received: "{name} 正在敲門",
        letIn: "讓對方進來",
        notNow: "稍後",
        letYouIn: "{name} 讓您進來了",
        declined: "{name} 回覆：稍後",
        rateLimited: "您剛剛敲過門。{seconds} 秒後可再次敲門。",
        failed: "敲門失敗。請再試一次。",
    },
    someone: "某人",
};

export default social;
