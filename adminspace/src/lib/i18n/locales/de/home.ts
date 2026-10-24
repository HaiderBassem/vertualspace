/** Startseite der Organisation: Übersicht für Administratoren, Bereich für Mitarbeiter und Verzeichnis. */
import type { PluralMessage } from "../../index";
import type { Messages } from "../en";

const p = (forms: PluralMessage): PluralMessage => forms;

export const home: Messages["home"] = {
    joined: "Willkommen! Sie sind jetzt Mitglied von {organization}.",
    overview: {
        title: "Übersicht",
        intro: "Der Zustand Ihrer Organisation auf einen Blick.",
        stats: {
            workspaces: "Arbeitsbereiche",
            worlds: "Welten",
            rooms: "Räume",
            people: "Personen",
            pendingInvitations: "Ausstehende Einladungen",
        },
        setup: "Einrichtung abschließen",
        setupProgress: "{done} von {total} erledigt",
        worldsTitle: "Welten",
        worldsIntro: "Virtuelle Büros in WorkAdventure. Jedes gehört zu einem Arbeitsbereich.",
        workspaceColumn: "Arbeitsbereich",
        activity: "Letzte Aktivität",
        activityEmpty: "Bisher ist nichts passiert.",
        allActivity: "Audit-Protokoll ansehen",
        newWorld: "Neue Welt",
        invite: "Personen einladen",
    },
    employee: {
        greeting: "Willkommen, {name}",
        intro: "Ihre Büros in {organization}, Ihre Kollegen und die gemeinsamen Komponenten.",
        offices: "Ihre Büros",
        officesIntro:
            "Öffnen Sie ein Büro in WorkAdventure. Melden Sie sich dort mit {email} an, um als Mitglied erkannt zu werden.",
        noOffices: "Sie haben noch keinen Zugriff auf ein Büro.",
        noOfficesHint: "Ein Administrator Ihrer Organisation kann Ihnen Zugriff auf einen Arbeitsbereich gewähren.",
        enter: "Betreten",
        rooms: p({ zero: "Noch kein Raum", one: "{count} Raum", other: "{count} Räume" }),
        unavailable: "Die Adresse von WorkAdventure ist auf dieser Plattform nicht konfiguriert.",
        teammates: "Kollegen",
        allTeammates: "Alle anzeigen",
        components: "Bürokomponenten",
        componentsIntro: "Möbel und Dekoration, die für Ihre Büros verfügbar sind.",
        browseComponents: "Komponenten durchsuchen",
    },
    directory: {
        title: "Verzeichnis",
        intro: "Die Personen von {organization}.",
        search: "Nach Name oder E-Mail suchen",
        empty: "Niemand entspricht Ihrer Suche.",
        count: p({ zero: "Niemand", one: "{count} Person", other: "{count} Personen" }),
    },
};
