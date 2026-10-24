import type { DeepPartial } from "../DeepPartial";
import type { Translation } from "../i18n-types";

const minimap: DeepPartial<Translation["minimap"]> = {
    title: "小地圖",
    show: "顯示小地圖",
    hide: "隱藏小地圖",
    surfaceLabel: "地圖概覽。點選某個位置即可走過去。",
    keyboardHint: "用方向鍵選擇位置，按 Enter 鍵走過去。",
    peopleCount: "此地圖上還有 {count} 人",
    you: "您",
};

export default minimap;
