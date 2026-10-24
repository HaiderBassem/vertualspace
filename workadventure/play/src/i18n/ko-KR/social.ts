import type { DeepPartial } from "../DeepPartial";
import type { Translation } from "../i18n-types";

const social: DeepPartial<Translation["social"]> = {
    localTime: "🕐 현지 시간 {time}",
    activity: {
        listening: "🎵 {title} — {artist}",
        listeningTitle: "🎵 {title}",
        coding: "💻 {repo} 작업 중",
    },
    notifyWhenFree: {
        action: "대화 가능해지면 알림",
        stop: "기다리기 중단",
        watching: "{name}님이 대화 가능해지면 알려 드리겠습니다.",
        alreadyFree: "{name}님은 지금 대화 가능합니다.",
        nowFree: "{name}님이 이제 대화 가능합니다",
    },
    wave: {
        action: "손 흔들기",
        received: "{name}님이 손을 흔들었습니다",
        receivedBack: "{name}님도 손을 흔들었습니다",
        waveBack: "손 흔들어 답하기",
        goTo: "찾아가기",
        message: "메시지",
        sent: "{name}님에게 손을 흔들었습니다 👋",
        rateLimited: "잠시만요! {seconds}초 후에 {name}님에게 다시 손을 흔들 수 있습니다.",
        receiverGone: "{name}님은 더 이상 온라인 상태가 아닙니다.",
        failed: "{name}님에게 손 흔들기를 보내지 못했습니다. 다시 시도하세요.",
    },
    goTo: {
        action: "찾아가기",
        notFound: "{name}님은 더 이상 이 지도에 없습니다.",
        noFreeSpot: "{name}님 옆에 빈자리가 없습니다.",
        failed: "{name}님에게 갈 수 없습니다. 다시 시도하세요.",
    },
    knock: {
        prompt: "비공개 대화입니다",
        knock: "노크하기",
        waiting: "노크했습니다. 응답을 기다리는 중…",
        received: "{name}님이 노크하고 있습니다",
        letIn: "들여보내기",
        notNow: "나중에",
        letYouIn: "{name}님이 들여보내 주었습니다",
        declined: "{name}님의 응답: 나중에",
        rateLimited: "방금 노크했습니다. {seconds}초 후에 다시 노크할 수 있습니다.",
        failed: "노크를 보내지 못했습니다. 다시 시도하세요.",
    },
    someone: "누군가",
};

export default social;
