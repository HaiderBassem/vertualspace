/** Anwendungsrahmen: Navigation, Organisationswechsel, Kontomenü, Banner für den Support-Zugriff. */
import type { Messages } from "../en";

export const app: Messages["app"] = {
    sections: {
        organization: "Organisation",
        administration: "Verwaltung",
        platform: "Plattform",
    },
    nav: {
        overview: "Übersicht",
        home: "Startseite",
        workspaces: "Arbeitsbereiche",
        people: "Personen",
        directory: "Verzeichnis",
        components: "Komponenten",
        apiKeys: "Room-API-Schlüssel",
        domains: "Domains",
        audit: "Audit-Protokoll",
        settings: "Einstellungen",
    },
    platformNav: {
        overview: "Kontrollzentrum",
        organizations: "Organisationen",
        accounts: "Konten",
        components: "Komponentenkatalog",
        avatars: "Avatar-Katalog",
        jobs: "Hintergrundaufgaben",
        email: "E-Mail-Versand",
        settings: "Instanzeinstellungen",
        audit: "Audit-Protokoll",
    },
    switcher: {
        label: "Organisation wechseln",
        yourOrganizations: "Ihre Organisationen",
        support: "Support-Zugriff",
        create: "Organisation erstellen",
        none: "Sie gehören noch keiner Organisation an.",
        choose: "Organisation auswählen",
        suspended: "Gesperrt",
    },
    account: {
        menu: "Kontomenü",
        settings: "Kontoeinstellungen",
        signOut: "Abmelden",
    },
    support: {
        banner: "Support-Zugriff auf {organization} bis {time}. Grund: {reason}",
        end: "Support-Zugriff beenden",
    },
    errorPage: {
        notFoundTitle: "Seite nicht gefunden",
        forbiddenTitle: "Zugriff verweigert",
        suspendedTitle: "Organisation gesperrt",
        suspended:
            "Diese Organisation wurde von den Plattform-Administratoren gesperrt. Ihre Welten sind geschlossen, bis sie reaktiviert wird.",
        rateLimitedTitle: "Zu viele Anfragen",
        errorTitle: "Etwas ist schiefgelaufen",
        requestId: "Referenz: {id}",
        home: "Zur Startseite",
    },
    breadcrumbs: "Brotkrümelnavigation",
    openMenu: "Navigation öffnen",
    closeMenu: "Navigation schließen",
};
