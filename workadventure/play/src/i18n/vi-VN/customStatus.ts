import type { DeepPartial } from "../DeepPartial";
import type { Translation } from "../i18n-types";

const customStatus: DeepPartial<Translation["customStatus"]> = {
    title: "Trạng thái tùy chỉnh",
    set: "Đặt trạng thái…",
    clear: "Xóa trạng thái",
    edit: "Sửa trạng thái",
    emojiLabel: "Biểu tượng cảm xúc",
    textLabel: "Trạng thái của bạn là gì?",
    textPlaceholder: "ví dụ: Nghỉ phép đến thứ Hai",
    durationLabel: "Xóa sau",
    durations: {
        never: "Không xóa",
        "30m": "30 phút",
        "1h": "1 giờ",
        "4h": "4 giờ",
        today: "Hôm nay",
        week: "Tuần này",
    },
    presets: {
        meeting: "Đang họp",
        commuting: "Đang di chuyển",
        sick: "Nghỉ ốm",
        vacation: "Đang nghỉ phép",
        remote: "Làm việc từ xa",
        focus: "Đang tập trung",
    },
    save: "Lưu",
    cancel: "Hủy",
    focusSession: {
        title: "Tập trung",
        hint: "Không làm phiền trong một lúc, kể cả khi bạn đi lại",
        minutes: "{count} phút",
        until: "🎧 Đang tập trung đến {time}",
        end: "Kết thúc",
        status: "Đang tập trung",
    },
};

export default customStatus;
