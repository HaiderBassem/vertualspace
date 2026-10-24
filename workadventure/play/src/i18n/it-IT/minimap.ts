import type { DeepPartial } from "../DeepPartial";
import type { Translation } from "../i18n-types";

const minimap: DeepPartial<Translation["minimap"]> = {
    title: "Minimappa",
    show: "Mostra la minimappa",
    hide: "Nascondi la minimappa",
    surfaceLabel: "Panoramica della mappa. Clicca su un punto per raggiungerlo.",
    keyboardHint: "Le frecce scelgono un punto, Invio ti ci porta.",
    peopleCount: "{count} {{altra persona|altre persone}} su questa mappa",
    you: "Tu",
};

export default minimap;
