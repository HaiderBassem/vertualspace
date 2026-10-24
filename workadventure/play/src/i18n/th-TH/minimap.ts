import type { DeepPartial } from "../DeepPartial";
import type { Translation } from "../i18n-types";

const minimap: DeepPartial<Translation["minimap"]> = {
    title: "แผนที่ย่อ",
    show: "แสดงแผนที่ย่อ",
    hide: "ซ่อนแผนที่ย่อ",
    surfaceLabel: "ภาพรวมแผนที่ คลิกจุดใดก็ได้เพื่อเดินไปที่นั่น",
    keyboardHint: "ใช้ปุ่มลูกศรเลือกจุด แล้วกด Enter เพื่อเดินไป",
    peopleCount: "มีคนอื่น {count} คนบนแผนที่นี้",
    you: "คุณ",
};

export default minimap;
