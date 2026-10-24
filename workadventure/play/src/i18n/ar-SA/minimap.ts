import type { DeepPartial } from "../DeepPartial";
import type { Translation } from "../i18n-types";

const minimap: DeepPartial<Translation["minimap"]> = {
    title: "الخريطة المصغرة",
    show: "إظهار الخريطة المصغرة",
    hide: "إخفاء الخريطة المصغرة",
    surfaceLabel: "نظرة عامة على الخريطة. انقر على مكان للمشي إليه.",
    keyboardHint: "اختر مكانًا بمفاتيح الأسهم، واضغط Enter للمشي إليه.",
    peopleCount: "{count} {{أشخاص آخرين|شخص آخر|شخصان آخران|أشخاص آخرين|شخصًا آخر|شخص آخر}} على هذه الخريطة",
    you: "أنت",
};

export default minimap;
