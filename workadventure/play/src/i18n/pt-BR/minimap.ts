import type { DeepPartial } from "../DeepPartial";
import type { Translation } from "../i18n-types";

const minimap: DeepPartial<Translation["minimap"]> = {
    title: "Minimapa",
    show: "Mostrar o minimapa",
    hide: "Ocultar o minimapa",
    surfaceLabel: "Visão geral do mapa. Clique em um ponto para ir até lá.",
    keyboardHint: "As setas escolhem um ponto, Enter leva você até lá.",
    peopleCount: "{count} {{outra pessoa|outras pessoas}} neste mapa",
    you: "Você",
};

export default minimap;
