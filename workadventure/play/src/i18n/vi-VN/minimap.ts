import type { DeepPartial } from "../DeepPartial";
import type { Translation } from "../i18n-types";

const minimap: DeepPartial<Translation["minimap"]> = {
    title: "Bản đồ nhỏ",
    show: "Hiện bản đồ nhỏ",
    hide: "Ẩn bản đồ nhỏ",
    surfaceLabel: "Tổng quan bản đồ. Bấm vào một vị trí để đi đến đó.",
    keyboardHint: "Dùng phím mũi tên để chọn vị trí, Enter để đi đến đó.",
    peopleCount: "{count} người khác trên bản đồ này",
    you: "Bạn",
};

export default minimap;
