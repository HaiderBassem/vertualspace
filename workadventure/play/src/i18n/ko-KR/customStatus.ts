import type { DeepPartial } from "../DeepPartial";
import type { Translation } from "../i18n-types";

const customStatus: DeepPartial<Translation["customStatus"]> = {
    title: "사용자 지정 상태",
    set: "상태 설정…",
    clear: "상태 지우기",
    edit: "상태 편집",
    emojiLabel: "이모지",
    textLabel: "지금 상태는 어떤가요?",
    textPlaceholder: "예: 월요일까지 휴가",
    durationLabel: "자동으로 지우기",
    durations: {
        never: "지우지 않음",
        "30m": "30분",
        "1h": "1시간",
        "4h": "4시간",
        today: "오늘",
        week: "이번 주",
    },
    presets: {
        meeting: "회의 중",
        commuting: "이동 중",
        sick: "병가",
        vacation: "휴가 중",
        remote: "원격 근무 중",
        focus: "집중 중",
    },
    save: "저장",
    cancel: "취소",
    focusSession: {
        title: "집중",
        hint: "돌아다니는 동안에도 잠시 방해 금지 상태를 유지합니다",
        minutes: "{count}분",
        until: "🎧 {time}까지 집중 중",
        end: "종료",
        status: "집중 중",
    },
};

export default customStatus;
