import type { Messages } from "../en";
import type { PluralMessage } from "../../index";

const p = (forms: PluralMessage): PluralMessage => forms;

/** Navigation, Rollen, Anmeldung und persönliche Kontoeinstellungen. */
export const shell: Messages["shell"] = {
    nav: {
        main: "Hauptnavigation",
        myWorlds: "Meine Welten",
        organizations: "Organisationen",
        platform: "Plattform",
        account: "Mein Konto",
        world: {
            overview: "Übersicht",
            live: "Live",
            rooms: "Räume",
            members: "Mitglieder",
            tags: "Tags",
            moderation: "Moderation",
            settings: "Einstellungen",
            activity: "Aktivität",
        },
        organization: {
            worlds: "Welten",
            team: "Team",
            apiKeys: "Room-API-Schlüssel",
            domains: "Domains",
            audit: "Audit-Protokoll",
            settings: "Einstellungen",
        },
        platformItems: {
            overview: "Systemstatus",
            organizations: "Alle Organisationen",
            accounts: "Konten",
            catalog: "Avatar-Katalog",
            settings: "Instanzeinstellungen",
            audit: "Audit-Protokoll",
        },
    },
    roles: {
        superadmin: "Superadmin",
        owner: "Eigentümer",
        admin: "Administrator",
        moderator: "Moderator",
        viewer: "Betrachter",
        employee: "Mitarbeiter",
        support: "Plattform-Support",
        descriptions: {
            owner: "Volle Kontrolle, einschließlich des Teams und der Löschung der Organisation.",
            admin: "Verwaltet Arbeitsbereiche, Welten, Räume, Einstellungen, Komponenten und Integrationen sowie die Personen unterhalb der Administratorrolle.",
            moderator: "Verwaltet Mitglieder und Tags, Sperren und Meldungen und sendet Live-Nachrichten.",
            viewer: "Nur Lesezugriff.",
            employee: "Nutzt die Büros seiner Arbeitsbereiche und sieht Kollegen und Komponenten. Keine Verwaltung.",
        },
    },
    workspaceRoles: {
        manager: "Bereichsverantwortlicher",
        member: "Bereichsmitglied",
        descriptions: {
            manager: "Verwaltet die Welten dieses Arbeitsbereichs: Räume, Mitglieder, Moderation, Komponenten.",
            member: "Kann die Welten dieses Arbeitsbereichs in WorkAdventure betreten.",
        },
    },
    auth: {
        loginTitle: "Anmelden",
        loginIntro: "Melden Sie sich an, um Ihre WorkAdventure-Welten zu verwalten.",
        password: "Passwort",
        submit: "Anmelden",
        invalidCredentials:
            "E-Mail-Adresse oder Passwort ist falsch. Nach mehreren Fehlversuchen wird die Anmeldung beim Konto für 15 Minuten gesperrt.",
        locked: "Zu viele fehlgeschlagene Versuche. Versuchen Sie es in 15 Minuten erneut.",
        disabled: "Dieses Konto ist deaktiviert.",
        mfaTitle: "Zwei-Faktor-Authentifizierung",
        mfaIntro:
            "Geben Sie den 6-stelligen Code aus Ihrer Authenticator-App oder einen Ihrer Wiederherstellungscodes ein.",
        mfaCode: "Authentifizierungs- oder Wiederherstellungscode",
        mfaInvalid: "Dieser Code ist ungültig. Prüfen Sie die Uhrzeit Ihres Geräts und versuchen Sie es erneut.",
        mfaRequired:
            "Ihre Organisation verlangt die Zwei-Faktor-Authentifizierung. Richten Sie sie ein, um fortzufahren.",
        setupTitle: "Willkommen bei Adminspace",
        setupIntro: "Erstellen Sie das erste Superadmin-Konto. Es kann die gesamte Plattform verwalten.",
        setupDone: "Die Plattform ist eingerichtet. Sie können sich jetzt anmelden.",
        passwordTooShort: "Verwenden Sie mindestens {min} Zeichen.",
        passwordTooLong: "Verwenden Sie höchstens {max} Zeichen.",
        passwordConfirm: "Passwort bestätigen",
        passwordMismatch: "Die Passwörter stimmen nicht überein.",
        loggedOut: "Sie wurden abgemeldet.",
        rateLimited: "Zu viele Versuche. Bitte warten Sie einige Minuten und versuchen Sie es erneut.",
        mfaCodeHint: "Ein Wiederherstellungscode sieht so aus: abcde-12345. Jeder funktioniert nur einmal.",
        mfaLocked:
            "Zu viele ungültige Codes: Die Zwei-Faktor-Authentifizierung ist für 15 Minuten gesperrt. Melden Sie sich später erneut an.",
        mustChangePassword: "Sie verwenden ein temporäres Passwort. Wählen Sie ein neues Passwort, um fortzufahren.",
        setupToken: "Einrichtungstoken",
        setupTokenHelp: "Der Wert der Umgebungsvariable SETUP_TOKEN dieses Servers.",
        setupTokenInvalid: "Dieses Einrichtungstoken ist ungültig.",
        setupDisabled:
            "Die Einrichtung über das Web ist auf diesem Produktionsserver deaktiviert. Legen Sie den ersten Superadmin über die Kommandozeile auf dem Server an:",
    },
    account: {
        title: "Mein Konto",
        profile: "Profil",
        preferences: "Einstellungen",
        localeHelp: "Sprache der Verwaltungsoberfläche. Datums- und Zahlenformate folgen ihren Konventionen.",
        timeZoneHelp: "Datum und Uhrzeit werden in dieser Zeitzone angezeigt (IANA-Zeitzonendatenbank).",
        automatic: "Automatisch (Browser)",
        security: "Sicherheit",
        changePassword: "Passwort ändern",
        currentPassword: "Aktuelles Passwort",
        newPassword: "Neues Passwort",
        passwordChanged: "Passwort geändert. Ihre anderen Sitzungen wurden beendet.",
        wrongPassword: "Das aktuelle Passwort ist falsch.",
        mfa: "Zwei-Faktor-Authentifizierung",
        mfaEnabled: "Die Zwei-Faktor-Authentifizierung ist aktiviert.",
        mfaDisabled: "Die Zwei-Faktor-Authentifizierung ist nicht aktiviert.",
        mfaSetupIntro:
            "Scannen Sie diesen Schlüssel mit einer Authenticator-App (RFC 6238 TOTP) und geben Sie dann den angezeigten Code ein.",
        mfaSecret: "Einrichtungsschlüssel",
        mfaEnable: "Zwei-Faktor-Authentifizierung aktivieren",
        mfaDisable: "Zwei-Faktor-Authentifizierung deaktivieren",
        sessions: "Aktive Sitzungen",
        currentSession: "Diese Sitzung",
        endOtherSessions: "Von anderen Sitzungen abmelden",
        sessionsEnded: "Die anderen Sitzungen wurden beendet.",
        ipAddress: "IP-Adresse",
        device: "Gerät",
        emailTaken: "Ein anderes Konto verwendet diese E-Mail-Adresse bereits.",
        mfaStart: "Zwei-Faktor-Authentifizierung einrichten",
        mfaUri: "Einrichtungslink (otpauth-URI)",
        mfaConfirmIntro: "Geben Sie zum Abschluss den Code ein, den Ihre App anzeigt.",
        mfaEnabledNow: "Die Zwei-Faktor-Authentifizierung ist jetzt aktiviert.",
        mfaDisabledNow: "Die Zwei-Faktor-Authentifizierung ist jetzt deaktiviert.",
        mfaMandatory:
            "Die Zwei-Faktor-Authentifizierung ist auf dieser Plattform verpflichtend und kann nicht deaktiviert werden.",
        mfaDisableIntro:
            "Geben Sie Ihr Passwort und einen aktuellen Authentifizierungs- oder Wiederherstellungscode ein, um die Zwei-Faktor-Authentifizierung zu deaktivieren.",
        noOtherSessions: "Keine weitere aktive Sitzung.",
        emailChangePassword: "Nur erforderlich, um die E-Mail-Adresse zu ändern.",
        mfaStartIntro: "Bestätigen Sie Ihr Passwort, um die Zwei-Faktor-Authentifizierung einzurichten.",
        mfaReplace: "Authenticator-App ersetzen",
        mfaReplaceIntro:
            "Geben Sie Ihr Passwort und einen aktuellen Code ein, um eine neue Authenticator-App zu registrieren. Die bisherige funktioniert dann nicht mehr.",
        mfaCurrentCode: "Aktueller Authentifizierungs- oder Wiederherstellungscode",
        mfaEnrolmentExpired: "Diese Einrichtung ist abgelaufen. Beginnen Sie erneut.",
        recoveryCodes: "Wiederherstellungscodes",
        recoveryCodesIntro:
            "Jeder Code kann einmal anstelle eines Authentifizierungscodes verwendet werden, zum Beispiel wenn Sie Ihr Telefon verlieren. Bewahren Sie sie sicher auf: Sie werden nur jetzt angezeigt.",
        recoveryCodesRegenerate: "Neue Wiederherstellungscodes erzeugen",
        recoveryCodesRegenerateIntro:
            "Geben Sie Ihr Passwort ein. Die bisherigen Wiederherstellungscodes funktionieren dann nicht mehr.",
        recoveryCodesRemaining: p({
            zero: "Kein Wiederherstellungscode mehr übrig.",
            one: "{count} Wiederherstellungscode übrig.",
            other: "{count} Wiederherstellungscodes übrig.",
        }),
    },
    accountAdmin: {
        temporaryPassword: "Temporäres Passwort",
        resetMfa: "Zwei-Faktor-Authentifizierung zurücksetzen",
        resetMfaDescription:
            "Entfernt die Authenticator-App und die Wiederherstellungscodes dieses Kontos und beendet seine Sitzungen. Die Person richtet die Zwei-Faktor-Authentifizierung bei der nächsten Anmeldung neu ein.",
    },
};
