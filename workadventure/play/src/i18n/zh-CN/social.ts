import type { DeepPartial } from "../DeepPartial";
import type { Translation } from "../i18n-types";

const social: DeepPartial<Translation["social"]> = {
    localTime: "🕐 当地时间 {time}",
    activity: {
        listening: "🎵 {title} — {artist}",
        listeningTitle: "🎵 {title}",
        coding: "💻 正在处理 {repo}",
    },
    notifyWhenFree: {
        action: "空闲时通知我",
        stop: "停止等待",
        watching: "{name} 空闲时我们会通知您。",
        alreadyFree: "{name} 现在有空。",
        nowFree: "{name} 现在有空了",
    },
    wave: {
        action: "挥手",
        received: "{name} 向您挥手",
        receivedBack: "{name} 也向您挥手",
        waveBack: "挥手回应",
        goTo: "前往",
        message: "消息",
        sent: "您向 {name} 挥了挥手 👋",
        rateLimited: "别急！您可以在 {seconds} 秒后再次向 {name} 挥手。",
        receiverGone: "{name} 已不在线。",
        failed: "无法向 {name} 挥手。请重试。",
    },
    goTo: {
        action: "前往",
        notFound: "{name} 已不在此地图上。",
        noFreeSpot: "{name} 旁边没有空位。",
        failed: "无法前往 {name} 身边。请重试。",
    },
    knock: {
        prompt: "此对话是私密的",
        knock: "敲门",
        waiting: "您已敲门，正在等待回应…",
        received: "{name} 正在敲门",
        letIn: "让对方进入",
        notNow: "稍后",
        letYouIn: "{name} 让您进入了",
        declined: "{name} 回复：稍后",
        rateLimited: "您刚刚敲过门。{seconds} 秒后可再次敲门。",
        failed: "敲门失败。请重试。",
    },
    someone: "某人",
};

export default social;
