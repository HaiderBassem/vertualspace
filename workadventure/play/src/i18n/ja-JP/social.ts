import type { DeepPartial } from "../DeepPartial";
import type { Translation } from "../i18n-types";

const social: DeepPartial<Translation["social"]> = {
    localTime: "🕐 現地時間 {time}",
    activity: {
        listening: "🎵 {title} — {artist}",
        listeningTitle: "🎵 {title}",
        coding: "💻 {repo}で作業中",
    },
    notifyWhenFree: {
        action: "対応可能になったら通知",
        stop: "待つのをやめる",
        watching: "{name}が対応可能になったらお知らせします。",
        alreadyFree: "{name}は現在対応可能です。",
        nowFree: "{name}が対応可能になりました",
    },
    wave: {
        action: "手を振る",
        received: "{name}があなたに手を振りました",
        receivedBack: "{name}が手を振り返しました",
        waveBack: "手を振り返す",
        goTo: "会いに行く",
        message: "メッセージ",
        sent: "{name}に手を振りました 👋",
        rateLimited: "少し待ってください！{seconds}秒後にもう一度{name}に手を振れます。",
        receiverGone: "{name}はもうオンラインではありません。",
        failed: "{name}に手を振れませんでした。もう一度お試しください。",
    },
    goTo: {
        action: "会いに行く",
        notFound: "{name}はもうこのマップにいません。",
        noFreeSpot: "{name}の隣に空いている場所がありません。",
        failed: "{name}のところへ移動できませんでした。もう一度お試しください。",
    },
    knock: {
        prompt: "この会話はプライベートです",
        knock: "ノックする",
        waiting: "ノックしました。返事を待っています…",
        received: "{name}がノックしています",
        letIn: "入れる",
        notNow: "あとで",
        letYouIn: "{name}が入れてくれました",
        declined: "{name}の返事: あとで",
        rateLimited: "ノックしたばかりです。{seconds}秒後にもう一度ノックできます。",
        failed: "ノックを送信できませんでした。もう一度お試しください。",
    },
    someone: "誰か",
};

export default social;
