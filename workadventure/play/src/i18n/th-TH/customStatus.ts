import type { DeepPartial } from "../DeepPartial";
import type { Translation } from "../i18n-types";

const customStatus: DeepPartial<Translation["customStatus"]> = {
    title: "สถานะที่กำหนดเอง",
    set: "ตั้งสถานะ…",
    clear: "ล้างสถานะ",
    edit: "แก้ไขสถานะ",
    emojiLabel: "อีโมจิ",
    textLabel: "สถานะของคุณคืออะไร?",
    textPlaceholder: "เช่น ลาพักร้อนถึงวันจันทร์",
    durationLabel: "ล้างหลังจาก",
    durations: {
        never: "ไม่ต้องล้าง",
        "30m": "30 นาที",
        "1h": "1 ชั่วโมง",
        "4h": "4 ชั่วโมง",
        today: "วันนี้",
        week: "สัปดาห์นี้",
    },
    presets: {
        meeting: "อยู่ในการประชุม",
        commuting: "กำลังเดินทาง",
        sick: "ลาป่วย",
        vacation: "ลาพักร้อน",
        remote: "ทำงานทางไกล",
        focus: "กำลังโฟกัส",
    },
    save: "บันทึก",
    cancel: "ยกเลิก",
    focusSession: {
        title: "โฟกัส",
        hint: "ห้ามรบกวนสักพัก แม้ในขณะที่คุณเดินไปมา",
        minutes: "{count} นาที",
        until: "🎧 กำลังโฟกัสจนถึง {time}",
        end: "สิ้นสุด",
        status: "กำลังโฟกัส",
    },
};

export default customStatus;
