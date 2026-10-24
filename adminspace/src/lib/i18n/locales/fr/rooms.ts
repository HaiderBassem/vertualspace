import type { PluralMessage } from "../../index";
import type { Messages } from "../en";

const p = (forms: PluralMessage): PluralMessage => forms;

/** Salles d'un monde et cartes qu'elles chargent. */
export const rooms: Messages["rooms"] = {
    title: "Salles",
    description:
        "Chaque salle charge une carte. Son URL est celle du monde suivie de l'identifiant de la salle ; les personnes passent d'une salle à l'autre par cette URL ou par les sorties dessinées dans les cartes.",
    newRoom: "Nouvelle salle",
    editRoom: "Modifier la salle",
    empty: "Ce monde n'a pas encore de salle. Créez-en une pour que les personnes puissent y entrer.",
    columns: {
        name: "Salle",
        map: "Carte",
        access: "Accès",
        online: "En ligne",
    },
    defaultBadge: "Par défaut",
    defaultHelp: "Les personnes qui ouvrent l'URL du monde sans nom de salle arrivent dans la salle par défaut.",
    setDefault: "Définir par défaut",
    moveUp: "Monter",
    moveDown: "Descendre",
    everyone: "Tout le monde",
    restrictedTo: "Étiquettes : {tags}",
    online: p({ zero: "Personne", one: "{count} personne", other: "{count} personnes" }),
    occupancyUnavailable: "Fréquentation indisponible : impossible de joindre WorkAdventure.",
    reload: "Recharger pour tout le monde",
    reloadTitle: "Recharger cette salle pour tout le monde ?",
    reloadDescription:
        "Toutes les personnes présentes dans la salle sont invitées à la recharger, par exemple après une modification de sa carte.",
    reloaded: "Toutes les personnes de la salle ont été invitées à la recharger.",
    deleteTitle: "Supprimer cette salle ?",
    deleteDescription:
        "Les liens vers cette salle afficheront une erreur. Le fichier de carte n'est pas supprimé de son hébergement.",
    created: "Salle créée.",
    fields: {
        name: "Nom",
        slug: "Identifiant de la salle",
        slugHelp: "Lettres minuscules, chiffres, tirets, tirets bas et barres obliques (par exemple etage-1/reunion).",
        description: "Description",
        mapKind: "Type de carte",
        mapKindWam: "Carte map-storage (.wam), modifiable avec l'éditeur de cartes de WorkAdventure",
        mapKindTmj: "Carte Tiled (.tmj ou .json) hébergée sur n'importe quel serveur web",
        wamUrl: "URL du fichier WAM",
        wamUrlHelp: "URL du fichier .wam dans le map-storage de WorkAdventure.",
        mapUrl: "URL de la carte Tiled",
        mapUrlHelp: "URL publique du fichier de carte Tiled. Ses tilesets doivent être accessibles au même endroit.",
        requiredTags: "Étiquettes requises pour entrer",
        requiredTagsHelp:
            "Séparées par des virgules. Si renseignées, seuls les membres ayant au moins l'une de ces étiquettes (ou l'étiquette admin) peuvent entrer.",
        thumbnailUrl: "URL de la miniature",
        isDefault: "Salle par défaut du monde",
    },
    mapStorage: {
        title: "Cartes trouvées dans map-storage",
        use: "Utiliser cette carte",
        notConfigured:
            "Renseignez les URL de map-storage dans les paramètres de l'instance pour parcourir ses cartes ici.",
        unreachable: "Impossible de joindre map-storage. Vous pouvez tout de même saisir l'URL de la carte.",
        none: "Map-storage ne contient encore aucune carte.",
    },
    mapWarning:
        "La carte de la salle {slug} n’a pas répondu. WorkAdventure ne pourra pas charger la salle tant que sa carte sera injoignable.",
    checkMap: "Vérifier la carte",
    mapCheck: {
        ok: "La carte répond (HTTP {status}).",
        unreachable: "La carte est injoignable.",
        httpError: "La carte a répondu par une erreur (HTTP {status}).",
        notChecked: "Non vérifiée : la carte se trouve à une adresse de réseau privé.",
    },
    mapProblems: {
        extensionWam: "Une carte du map-storage doit être un fichier .wam.",
        extensionTmj: "Une carte Tiled doit être un fichier .tmj ou .json.",
        otherOrganization: "Cette carte appartient à une autre organisation et ne peut pas être utilisée ici.",
    },
};
