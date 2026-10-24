import type { DeepPartial } from "../DeepPartial";
import type { Translation } from "../i18n-types";

const minimap: DeepPartial<Translation["minimap"]> = {
    title: "Minimapa",
    show: "Mostrar el minimapa",
    hide: "Ocultar el minimapa",
    surfaceLabel: "Vista general del mapa. Haga clic en un lugar para ir allí.",
    keyboardHint: "Las flechas eligen un lugar; Intro le lleva allí.",
    peopleCount: "{count} {{otra persona|otras personas}} en este mapa",
    you: "Tú",
};

export default minimap;
