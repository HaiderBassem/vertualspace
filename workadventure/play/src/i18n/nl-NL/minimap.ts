import type { DeepPartial } from "../DeepPartial";
import type { Translation } from "../i18n-types";

const minimap: DeepPartial<Translation["minimap"]> = {
    title: "Minikaart",
    show: "Minikaart tonen",
    hide: "Minikaart verbergen",
    surfaceLabel: "Kaartoverzicht. Klik op een plek om erheen te lopen.",
    keyboardHint: "Pijltjestoetsen kiezen een plek, Enter loopt erheen.",
    peopleCount: "{count} {{andere persoon|andere personen}} op deze kaart",
    you: "Jij",
};

export default minimap;
