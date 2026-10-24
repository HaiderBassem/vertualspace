/** Arbeitsbereiche: Gruppierungen von Welten in AdminSpace (Abteilungen, Standorte), ihre Verantwortlichen und Mitglieder. */
import type { PluralMessage } from "../../index";
import type { Messages } from "../en";

const p = (forms: PluralMessage): PluralMessage => forms;

export const workspaces: Messages["workspaces"] = {
    defaultName: "Hauptarbeitsbereich",
    title: "Arbeitsbereiche",
    intro: "Ein Arbeitsbereich fasst Welten für eine Abteilung oder einen Standort zusammen. Seine Verantwortlichen verwalten seine Welten; seine Mitglieder können sie betreten. Die WorkAdventure-Adressen ändern sich nicht.",
    create: "Neuer Arbeitsbereich",
    createTitle: "Arbeitsbereich erstellen",
    created: "Der Arbeitsbereich wurde erstellt.",
    updated: "Der Arbeitsbereich wurde aktualisiert.",
    empty: "Noch kein Arbeitsbereich.",
    showArchived: "Archivierte Arbeitsbereiche anzeigen",
    archived: "Archiviert",
    worldCount: p({ zero: "Keine Welten", one: "{count} Welt", other: "{count} Welten" }),
    peopleCount: p({ zero: "Niemand zugewiesen", one: "{count} Person", other: "{count} Personen" }),
    fields: {
        name: "Name",
        slug: "URL-Kennung",
        description: "Beschreibung",
    },
    hints: {
        slug: "Wird nur in Adressen der Verwaltungsoberfläche verwendet, nicht in WorkAdventure.",
        description: "Wofür dieser Arbeitsbereich gedacht ist, z. B. das Pariser Büro oder das Vertriebsteam.",
    },
    detail: {
        worlds: "Welten",
        worldsIntro:
            "Welten dieses Arbeitsbereichs. Wird eine Welt in einen anderen Arbeitsbereich verschoben, behält sie ihre WorkAdventure-Adresse.",
        noWorlds: "Dieser Arbeitsbereich hat noch keine Welt.",
        newWorld: "Neue Welt in diesem Arbeitsbereich",
        people: "Verantwortliche und Mitglieder",
        peopleIntro:
            "Verantwortliche verwalten die Welten dieses Arbeitsbereichs. Mitglieder können sie betreten, wenn die Welt Mitgliedern vorbehalten ist. Administratoren der Organisation haben bereits Zugriff auf alle Arbeitsbereiche.",
        noPeople: "Diesem Arbeitsbereich ist niemand zugewiesen.",
        assign: "Person zuweisen",
        assignPerson: "Person",
        assignRole: "Zugriff",
        assignSubmit: "Zuweisen",
        assigned: "Zugriff aktualisiert.",
        unassign: "Zugriff entfernen",
        unassignTitle: "{name} aus diesem Arbeitsbereich entfernen?",
        unassigned: "Zugriff entfernt.",
        notMember: "Diese Person ist kein Mitglied der Organisation. Laden Sie sie zuerst ein.",
        settings: "Einstellungen des Arbeitsbereichs",
    },
    archive: {
        action: "Arbeitsbereich archivieren",
        title: "{name} archivieren?",
        description:
            "Seine aktiven Welten werden ebenfalls archiviert: WorkAdventure weist ihre Adressen ab, bis der Arbeitsbereich wiederhergestellt ist. Beim Wiederherstellen werden genau diese Welten zurückgeholt.",
        done: p({
            zero: "Der Arbeitsbereich wurde archiviert.",
            one: "Der Arbeitsbereich und {count} Welt wurden archiviert.",
            other: "Der Arbeitsbereich und {count} Welten wurden archiviert.",
        }),
        lastActive: "Eine Organisation braucht mindestens einen aktiven Arbeitsbereich.",
        restore: "Arbeitsbereich wiederherstellen",
        restored: p({
            zero: "Der Arbeitsbereich wurde wiederhergestellt.",
            one: "Der Arbeitsbereich und {count} Welt wurden wiederhergestellt.",
            other: "Der Arbeitsbereich und {count} Welten wurden wiederhergestellt.",
        }),
    },
    remove: {
        action: "Arbeitsbereich löschen",
        title: "{name} löschen?",
        description:
            "Nur ein leerer Arbeitsbereich kann gelöscht werden. Seine Zugriffszuweisungen werden mit ihm gelöscht.",
        notEmpty: "Verschieben oder löschen Sie zuerst die Welten dieses Arbeitsbereichs.",
        lastWorkspace: "Eine Organisation braucht mindestens einen Arbeitsbereich.",
        done: "Der Arbeitsbereich wurde gelöscht.",
    },
    move: {
        title: "Arbeitsbereich",
        intro: "Der Arbeitsbereich, zu dem diese Welt gehört. Seine Verantwortlichen verwalten die Welt.",
        submit: "Welt verschieben",
        done: "Die Welt wurde verschoben.",
    },
    pick: "Arbeitsbereich",
    pickHint:
        "Wer diese Welt verwaltet: die Administratoren der Organisation und die Verantwortlichen dieses Arbeitsbereichs.",
};
