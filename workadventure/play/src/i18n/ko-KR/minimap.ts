import type { DeepPartial } from "../DeepPartial";
import type { Translation } from "../i18n-types";

const minimap: DeepPartial<Translation["minimap"]> = {
    title: "미니맵",
    show: "미니맵 표시",
    hide: "미니맵 숨기기",
    surfaceLabel: "지도 개요. 원하는 곳을 클릭하면 그곳으로 걸어갑니다.",
    keyboardHint: "화살표 키로 위치를 고르고 Enter 키로 이동합니다.",
    peopleCount: "이 지도에 다른 사람 {count}명",
    you: "나",
};

export default minimap;
