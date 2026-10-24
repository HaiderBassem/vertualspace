import type { DeepPartial } from "../DeepPartial";
import type { Translation } from "../i18n-types";

const minimap: DeepPartial<Translation["minimap"]> = {
    title: "ミニマップ",
    show: "ミニマップを表示",
    hide: "ミニマップを非表示",
    surfaceLabel: "マップの概要。場所をクリックするとそこへ移動します。",
    keyboardHint: "矢印キーで場所を選び、Enterで移動します。",
    peopleCount: "このマップには他に{count}人います",
    you: "あなた",
};

export default minimap;
