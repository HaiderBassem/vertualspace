import type { DeepPartial } from "../DeepPartial";
import type { Translation } from "../i18n-types";

const minimap: DeepPartial<Translation["minimap"]> = {
    title: "小地图",
    show: "显示小地图",
    hide: "隐藏小地图",
    surfaceLabel: "地图概览。点击某个位置即可走过去。",
    keyboardHint: "用方向键选择位置，按 Enter 键走过去。",
    peopleCount: "此地图上还有 {count} 人",
    you: "您",
};

export default minimap;
