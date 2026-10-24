import type { DeepPartial } from "../DeepPartial";
import type { Translation } from "../i18n-types";

const minimap: DeepPartial<Translation["minimap"]> = {
    title: "Mini-carte",
    show: "Afficher la mini-carte",
    hide: "Masquer la mini-carte",
    surfaceLabel: "Vue d'ensemble de la carte. Cliquez sur un endroit pour vous y rendre.",
    keyboardHint: "Les flèches choisissent un endroit, Entrée vous y emmène.",
    peopleCount: "{count} {{autre personne|autres personnes}} sur cette carte",
    you: "Vous",
};

export default minimap;
