import type { DeepPartial } from "../DeepPartial";
import type { Translation } from "../i18n-types";

const customStatus: DeepPartial<Translation["customStatus"]> = {
    title: "カスタムステータス",
    set: "ステータスを設定…",
    clear: "ステータスをクリア",
    edit: "ステータスを編集",
    emojiLabel: "絵文字",
    textLabel: "今のステータスは？",
    textPlaceholder: "例: 月曜日まで休暇中",
    durationLabel: "クリアまでの時間",
    durations: {
        never: "クリアしない",
        "30m": "30分",
        "1h": "1時間",
        "4h": "4時間",
        today: "今日",
        week: "今週",
    },
    presets: {
        meeting: "会議中",
        commuting: "移動中",
        sick: "病欠",
        vacation: "休暇中",
        remote: "リモートワーク中",
        focus: "集中モード",
    },
    save: "保存",
    cancel: "キャンセル",
    focusSession: {
        title: "集中",
        hint: "移動中も含めて、しばらく応答不可にします",
        minutes: "{count}分",
        until: "🎧 {time}まで集中モード",
        end: "終了",
        status: "集中モード",
    },
};

export default customStatus;
