import type { PluralMessage } from "../../index";
import type { Messages } from "../en";

const p = (forms: PluralMessage): PluralMessage => forms;

/** Organisationen: Liste, Erstellung, Einstellungen, Team (Administratoren der Verwaltungsoberfläche). */
export const organizations: Messages["organizations"] = {
    title: "Organisationen",
    intro: "Eine Organisation fasst Welten und die Personen zusammen, die sie verwalten.",
    create: "Neue Organisation",
    createTitle: "Organisation erstellen",
    createIntro: "Sie werden ihr Eigentümer. Weitere Administratoren können Sie anschließend hinzufügen.",
    createNotAllowed: "Auf dieser Instanz können nur Plattform-Administratoren Organisationen erstellen.",
    created: "Die Organisation wurde erstellt.",
    empty: "Sie sind noch kein Mitglied einer Organisation.",
    worldCount: p({ zero: "Keine Welten", one: "{count} Welt", other: "{count} Welten" }),
    fields: {
        name: "Name",
        slug: "URL-Kennung",
        country: "Land",
        defaultLocale: "Standardsprache",
        contactEmail: "Kontakt-E-Mail",
    },
    hints: {
        slug: "Erscheint in jeder Weltadresse: /@/{slug}/…",
        country: "Land, in dem die Organisation ansässig ist (ISO 3166-1).",
        defaultLocale: "Vorgeschlagene Sprache für Inhalte dieser Organisation.",
        contactEmail: "Ansprechperson für diese Organisation.",
    },
    noCountry: "Nicht angegeben",
    worlds: {
        title: "Welten",
        newWorld: "Neue Welt",
        empty: "Diese Organisation hat noch keine Welt.",
        showArchived: "Archivierte Welten anzeigen",
        columns: {
            world: "Welt",
            access: "Zugang",
            state: "Zustand",
            created: "Erstellt",
        },
    },
    settings: {
        title: "Einstellungen der Organisation",
        intro: "Identität und Kontaktdaten der Organisation.",
        slugReadOnly: "Die URL-Kennung kann nicht geändert werden: Sonst würden alle Weltadressen ungültig.",
        dangerZone: "Gefahrenbereich",
        deleteTitle: "Diese Organisation löschen",
        deleteDescription:
            "Löscht alle ihre Welten, Räume, Mitglieder, Sperren, Meldungen und API-Schlüssel. WorkAdventure weist danach jede Adresse dieser Welten ab. Dies kann nicht rückgängig gemacht werden.",
    },
    team: {
        addRequested:
            "Falls ein Konto diese E-Mail-Adresse verwendet, gehört es jetzt mit dieser Rolle zum Team. Einladungen per E-Mail sind nicht verfügbar: Bitten Sie bei Bedarf zuerst einen Superadmin, das Konto anzulegen.",
        title: "Team",
        intro: "Personen, die diese Organisation in Adminspace verwalten können, und was sie tun dürfen.",
        add: "Administrator hinzufügen",
        addIntro:
            "Die Person benötigt ein Adminspace-Konto. Bitten Sie bei Bedarf einen Plattform-Administrator, eines anzulegen.",
        accountNotFound: "Kein Konto verwendet diese E-Mail-Adresse.",
        alreadyMember: "Diese Person ist bereits im Team.",
        lastOwner: "Eine Organisation braucht mindestens einen Eigentümer.",
        added: "Der Administrator wurde hinzugefügt.",
        roleChanged: "Die Rolle wurde geändert.",
        removed: "Der Administrator wurde entfernt.",
        remove: "Entfernen",
        removeTitle: "{name} aus dem Team entfernen?",
        removeDescription: "Die Person verliert den Zugang zu dieser Organisation in Adminspace.",
        you: "Sie",
        rolesTitle: "Rollen",
        columns: {
            person: "Person",
            role: "Rolle",
            since: "Mitglied seit",
            lastLogin: "Letzte Anmeldung",
        },
    },
    audit: {
        title: "Audit-Protokoll",
        intro: "Jede Änderung in dieser Organisation, durch ihre Administratoren oder durch WorkAdventure (Sperren, Meldungen). Zeiten werden in Ihrer Zeitzone angezeigt.",
        filterAction: "Aktion beginnt mit",
        empty: "Kein Eintrag.",
        columns: {
            time: "Zeitpunkt",
            actor: "Durch",
            action: "Aktion",
            target: "Ziel",
            ip: "IP-Adresse",
            details: "Details",
        },
    },
};
