import type { DeepPartial } from "../DeepPartial";
import type { Translation } from "../i18n-types";

const customStatus: DeepPartial<Translation["customStatus"]> = {
    title: "自訂狀態",
    set: "設定狀態…",
    clear: "清除狀態",
    edit: "編輯狀態",
    emojiLabel: "表情符號",
    textLabel: "您的狀態是什麼？",
    textPlaceholder: "例如：休假到週一",
    durationLabel: "清除時間",
    durations: {
        never: "不清除",
        "30m": "30 分鐘",
        "1h": "1 小時",
        "4h": "4 小時",
        today: "今天",
        week: "本週",
    },
    presets: {
        meeting: "會議中",
        commuting: "通勤中",
        sick: "病假",
        vacation: "休假中",
        remote: "遠端工作",
        focus: "專注中",
    },
    save: "儲存",
    cancel: "取消",
    focusSession: {
        title: "專注",
        hint: "一段時間內請勿打擾，即使您四處走動",
        minutes: "{count} 分鐘",
        until: "🎧 專注至 {time}",
        end: "結束",
        status: "專注中",
    },
};

export default customStatus;
