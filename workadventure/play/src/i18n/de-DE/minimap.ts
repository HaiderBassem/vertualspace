import type { DeepPartial } from "../DeepPartial";
import type { Translation } from "../i18n-types";

const minimap: DeepPartial<Translation["minimap"]> = {
    title: "Minikarte",
    show: "Minikarte anzeigen",
    hide: "Minikarte ausblenden",
    surfaceLabel: "Kartenübersicht. Klicken Sie auf eine Stelle, um dorthin zu gehen.",
    keyboardHint: "Pfeiltasten wählen eine Stelle, Enter geht dorthin.",
    peopleCount: "{count} {{weitere Person|weitere Personen}} auf dieser Karte",
    you: "Sie",
};

export default minimap;
