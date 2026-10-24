import type { DeepPartial } from "../DeepPartial";
import type { Translation } from "../i18n-types";

const minimap: DeepPartial<Translation["minimap"]> = {
    title: "Minimapa",
    show: "Mostrar el minimapa",
    hide: "Amagar el minimapa",
    surfaceLabel: "Vista general del mapa. Feu clic en un lloc per anar-hi.",
    keyboardHint: "Les fletxes trien un lloc i Retorn us hi porta.",
    peopleCount: "{count} {{altra persona|altres persones}} en aquest mapa",
    you: "Tu",
};

export default minimap;
