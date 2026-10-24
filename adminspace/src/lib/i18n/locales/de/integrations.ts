import type { Messages } from "../en";

/** Room-API-Schlüssel und eigene Domains einer Organisation. */
export const integrations: Messages["integrations"] = {
    apiKeysTitle: "Room-API-Schlüssel",
    apiKeysIntro:
        "Mit Schlüsseln kann Ihre eigene Software die Room API von WorkAdventure (Variablen und Ereignisse von Räumen) in den Welten dieser Organisation nutzen.",
    apiKeysUsage:
        "Senden Sie den Schlüssel im Header X-API-Key der Room-API-Aufrufe. WorkAdventure prüft ihn bei jedem Aufruf bei dieser Verwaltung.",
    apiKeysEmpty: "Noch kein Schlüssel.",
    newKey: "Neuer Schlüssel",
    keyName: "Name",
    keyNameHelp: "Wofür der Schlüssel dient, z. B. der Name der Software, die ihn verwendet.",
    scope: "Geltungsbereich",
    scopeAll: "Alle Welten der Organisation",
    expiresAt: "Ablaufdatum",
    expiresHelp:
        "Leer lassen für einen Schlüssel ohne Ablaufdatum. Der Schlüssel funktioniert bis zum Ende dieses Tages (UTC).",
    createKey: "Schlüssel erstellen",
    keyCreated: "Kopieren Sie diesen Schlüssel jetzt: Er wird nie wieder angezeigt.",
    key: "Schlüssel",
    lastUsed: "Zuletzt verwendet",
    keyStatus: {
        active: "Aktiv",
        revoked: "Widerrufen",
        expired: "Abgelaufen",
    },
    revokeTitle: "Diesen Schlüssel widerrufen?",
    revokeDescription: "Software, die ihn verwendet, verliert sofort den Zugriff auf die Room API.",
    keyRevoked: "Schlüssel widerrufen.",

    domainsTitle: "Domains",
    domainsIntro: "Eigene Domains, unter denen WorkAdventure für diese Organisation bereitgestellt wird.",
    domainsHowItWorks:
        "WorkAdventure fragt diese Verwaltung, ob eine Domain legitim ist, bevor Personen nach einer Anmeldung über OpenID Connect weitergeleitet werden (GET /api/domain/verify), und ruft das Challenge-Token einer Domain ab, wenn ein Zertifikat dafür ausgestellt wird (GET /white-label/cf-challenge).",
    domainsEmpty: "Noch keine eigene Domain.",
    host: "Domainname",
    hostHelp: "Zum Beispiel play.example.com. Internationalisierte Domainnamen werden akzeptiert.",
    addDomain: "Domain hinzufügen",
    invalidHost: "Geben Sie einen gültigen Domainnamen ein, ohne https:// und ohne Pfad.",
    hostTaken: "Diese Domain ist bereits registriert.",
    challenge: "Challenge-Token",
    challengeUrl: "Challenge-URL",
    domainStatus: {
        verified: "Verifiziert",
        pending: "Verifizierung ausstehend",
    },
    verify: "DNS-Nachweis prüfen",
    verifyTitle: "Diese Domain als verifiziert markieren?",
    verifyDescription:
        "Um nachzuweisen, dass diese Organisation die Domain kontrolliert, veröffentlichen Sie den unten stehenden DNS-TXT-Eintrag und prüfen Sie ihn anschließend. WorkAdventure akzeptiert die Domain erst, wenn der Eintrag gefunden wurde.",
    verified: "Domain verifiziert.",
    removeTitle: "Diese Domain entfernen?",
    removeDescription: "WorkAdventure weist dann Anmeldungen ab, die auf diese Domain weitergeleitet werden.",
    removed: "Domain entfernt.",
    verifyNoProof:
        "Der TXT-Eintrag {record} wurde nicht gefunden oder enthält das Challenge-Token nicht. DNS-Änderungen können einige Zeit brauchen, bis sie überall sichtbar sind.",
    verifyDnsError: "Die DNS-Abfrage von {record} ist fehlgeschlagen. Versuchen Sie es später erneut.",
    recordName: "Name des TXT-Eintrags",
    recordValue: "Wert des TXT-Eintrags",
};
