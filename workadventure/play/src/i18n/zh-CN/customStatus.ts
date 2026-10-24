import type { DeepPartial } from "../DeepPartial";
import type { Translation } from "../i18n-types";

const customStatus: DeepPartial<Translation["customStatus"]> = {
    title: "自定义状态",
    set: "设置状态…",
    clear: "清除状态",
    edit: "编辑状态",
    emojiLabel: "表情符号",
    textLabel: "您的状态是什么？",
    textPlaceholder: "例如：休假至周一",
    durationLabel: "清除时间",
    durations: {
        never: "不清除",
        "30m": "30 分钟",
        "1h": "1 小时",
        "4h": "4 小时",
        today: "今天",
        week: "本周",
    },
    presets: {
        meeting: "会议中",
        commuting: "通勤中",
        sick: "病假",
        vacation: "休假中",
        remote: "远程办公",
        focus: "专注中",
    },
    save: "保存",
    cancel: "取消",
    focusSession: {
        title: "专注",
        hint: "一段时间内请勿打扰，即使您四处走动",
        minutes: "{count} 分钟",
        until: "🎧 专注至 {time}",
        end: "结束",
        status: "专注中",
    },
};

export default customStatus;
