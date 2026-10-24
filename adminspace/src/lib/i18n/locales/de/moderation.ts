import type { PluralMessage } from "../../index";
import type { Messages } from "../en";

const p = (forms: PluralMessage): PluralMessage => forms;

/** Sperren und Meldungen. */
export const moderation: Messages["moderation"] = {
    title: "Moderation",
    tabs: {
        bans: "Sperren",
        reports: "Meldungen",
    },
    bans: {
        description:
            "Gesperrte Personen können keinen Raum dieser Welt betreten. Sperren stammen von Administratoren in WorkAdventure (Personen mit dem Tag „admin“) oder aus dieser Verwaltung.",
        filterActive: "Aktiv",
        filterAll: "Alle, einschließlich aufgehobener und abgelaufener",
        empty: "Keine Sperre.",
        columns: {
            person: "Person",
            ipAddress: "IP-Adresse",
            reason: "Grund",
            by: "Gesperrt von",
            since: "Seit",
            until: "Bis",
            status: "Status",
        },
        bannedByLine: "Gesperrt von: {name}",
        status: {
            active: "Aktiv",
            revoked: "Aufgehoben",
            expired: "Abgelaufen",
        },
        permanent: "Dauerhaft",
        fromBackOffice: "Verwaltung",
        create: "Jemanden sperren",
        target: "Person",
        targetHelp: "WorkAdventure-Kennung oder E-Mail-Adresse der Person.",
        ipAddress: "IP-Adresse",
        ipAddressHelp:
            "Optional. Sperrt auch diese Adresse (IPv4 oder IPv6), damit keine andere Identität verwendet werden kann.",
        invalidIp: "Geben Sie eine gültige IPv4- oder IPv6-Adresse ein.",
        targetRequired: "Geben Sie eine Kennung oder eine IP-Adresse an.",
        reason: "Grund",
        reasonHelp: "Wird der gesperrten Person angezeigt.",
        duration: "Dauer",
        durations: {
            permanent: "Dauerhaft",
            hour: "1 Stunde",
            day: "24 Stunden",
            week: "7 Tage",
            month: "30 Tage",
        },
        created: "Sperre erfasst.",
        createdAndKicked: "Sperre erfasst, und die Person wurde von WorkAdventure getrennt.",
        revoke: "Aufheben",
        revokeTitle: "Diese Sperre aufheben?",
        revokeDescription: "Die Person kann die Welt wieder betreten.",
        revoked: "Sperre aufgehoben.",
    },
    reports: {
        description:
            "Meldungen, die Personen aus WorkAdventure heraus gesendet haben („Diese Person melden“). Prüfen Sie sie und erledigen oder verwerfen Sie sie dann.",
        empty: "Keine Meldung.",
        filters: {
            open: "Offen",
            resolved: "Erledigt",
            dismissed: "Verworfen",
            all: "Alle",
        },
        status: {
            open: "Offen",
            resolved: "Erledigt",
            dismissed: "Verworfen",
        },
        count: p({ zero: "Keine Meldung", one: "{count} Meldung", other: "{count} Meldungen" }),
        reported: "Gemeldete Person",
        reporter: "Gemeldet von",
        room: "Raum",
        comment: "Kommentar",
        note: "Notiz zur Bearbeitung",
        noteHelp: "Optional, nur für die Administratoren der Welt sichtbar.",
        noteLabel: "Notiz zur Bearbeitung:",
        resolve: "Erledigen",
        dismiss: "Verwerfen",
        reopen: "Wieder öffnen",
        handledBy: "Bearbeitet {date}",
        updated: "Meldung aktualisiert.",
        banReported: "Gemeldete Person sperren",
        banReportedTitle: "Die gemeldete Person sperren?",
        banReportedDescription: "Sie kann diese Welt nicht mehr betreten, und die Meldung wird als erledigt markiert.",
        banReason: "Von einer anderen Person gemeldet: {comment}",
    },
    liveDisconnect: {
        banSaved: "Sperre gespeichert. Sofortige Trennung: {outcome}",
        banSavedOnly: "Sperre gespeichert.",
        outcomes: {
            sent: "bei WorkAdventure angefordert.",
            notConfigured:
                "nicht verfügbar, weil die Live-Verbindung zu WorkAdventure nicht eingerichtet ist. Die Person wird bei ihrer nächsten Verbindung abgewiesen.",
            unreachable:
                "fehlgeschlagen, weil WorkAdventure nicht erreichbar ist. Die Person wird bei ihrer nächsten Verbindung abgewiesen.",
            rejected:
                "von WorkAdventure abgelehnt (prüfen Sie ADMIN_SOCKETS_TOKEN). Die Person wird bei ihrer nächsten Verbindung abgewiesen.",
            notApplicable:
                "bei einer Sperre nur einer IP-Adresse nicht möglich. Die Adresse wird bei ihrer nächsten Verbindung abgewiesen.",
        },
    },
};
