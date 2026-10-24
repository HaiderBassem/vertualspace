import type { PluralMessage } from "../../index";
import type { Messages } from "../en";

const p = (forms: PluralMessage): PluralMessage => forms;

/** Räume einer Welt und die Karten, die sie laden. */
export const rooms: Messages["rooms"] = {
    title: "Räume",
    description:
        "Jeder Raum lädt eine Karte. Seine URL ist die URL der Welt, gefolgt von der Kennung des Raums. Personen wechseln über diese URL oder über in den Karten eingezeichnete Ausgänge zwischen den Räumen.",
    newRoom: "Neuer Raum",
    editRoom: "Raum bearbeiten",
    empty: "Diese Welt hat noch keinen Raum. Erstellen Sie einen, damit Personen sie betreten können.",
    columns: {
        name: "Raum",
        map: "Karte",
        access: "Zugang",
        online: "Jetzt online",
    },
    defaultBadge: "Standard",
    defaultHelp: "Wer die URL der Welt ohne Raumnamen öffnet, landet im Standardraum.",
    setDefault: "Als Standard festlegen",
    moveUp: "Nach oben",
    moveDown: "Nach unten",
    everyone: "Alle",
    restrictedTo: "Tags: {tags}",
    online: p({ zero: "Niemand", one: "{count} Person", other: "{count} Personen" }),
    occupancyUnavailable: "Belegung nicht verfügbar: WorkAdventure ist nicht erreichbar.",
    reload: "Für alle neu laden",
    reloadTitle: "Diesen Raum für alle neu laden?",
    reloadDescription:
        "Alle Personen im Raum werden gebeten, ihn neu zu laden, zum Beispiel nachdem seine Karte geändert wurde.",
    reloaded: "Alle Personen im Raum wurden gebeten, ihn neu zu laden.",
    deleteTitle: "Diesen Raum löschen?",
    deleteDescription:
        "Links zu diesem Raum zeigen dann einen Fehler an. Die Kartendatei selbst wird an ihrem Speicherort nicht gelöscht.",
    created: "Raum erstellt.",
    fields: {
        name: "Name",
        slug: "Raumkennung",
        slugHelp:
            "Kleinbuchstaben, Ziffern, Bindestriche, Unterstriche und Schrägstriche (zum Beispiel etage-1/besprechung).",
        description: "Beschreibung",
        mapKind: "Kartentyp",
        mapKindWam: "Karte aus dem Map-Storage (.wam), mit dem Karteneditor von WorkAdventure bearbeitbar",
        mapKindTmj: "Tiled-Karte (.tmj oder .json) auf einem beliebigen Webserver",
        wamUrl: "URL der WAM-Datei",
        wamUrlHelp: "URL der .wam-Datei im Map-Storage von WorkAdventure.",
        mapUrl: "URL der Tiled-Karte",
        mapUrlHelp: "Öffentliche URL der Tiled-Kartendatei. Ihre Tilesets müssen am selben Ort erreichbar sein.",
        requiredTags: "Zum Eintreten erforderliche Tags",
        requiredTagsHelp:
            "Durch Kommas getrennt. Wenn gesetzt, dürfen nur Mitglieder mit mindestens einem dieser Tags (oder dem Tag „admin“) eintreten.",
        thumbnailUrl: "Vorschaubild-URL",
        isDefault: "Standardraum der Welt",
    },
    mapStorage: {
        title: "Im Map-Storage gefundene Karten",
        use: "Diese Karte verwenden",
        notConfigured:
            "Legen Sie die Map-Storage-URLs in den Instanzeinstellungen fest, um seine Karten hier anzuzeigen.",
        unreachable: "Der Map-Storage ist nicht erreichbar. Sie können die URL der Karte trotzdem eingeben.",
        none: "Der Map-Storage enthält noch keine Karte.",
    },
    mapWarning:
        "Die Karte des Raums {slug} hat nicht geantwortet. WorkAdventure kann den Raum erst laden, wenn seine Karte erreichbar ist.",
    checkMap: "Karte prüfen",
    mapCheck: {
        ok: "Die Karte antwortet (HTTP {status}).",
        unreachable: "Die Karte ist nicht erreichbar.",
        httpError: "Die Karte hat mit einem Fehler geantwortet (HTTP {status}).",
        notChecked: "Nicht geprüft: Die Karte liegt unter einer Adresse eines privaten Netzes.",
    },
    mapProblems: {
        extensionWam: "Eine Karte aus dem Map-Storage muss eine .wam-Datei sein.",
        extensionTmj: "Eine Tiled-Karte muss eine .tmj- oder .json-Datei sein.",
        otherOrganization: "Diese Karte gehört einer anderen Organisation und kann hier nicht verwendet werden.",
    },
};
