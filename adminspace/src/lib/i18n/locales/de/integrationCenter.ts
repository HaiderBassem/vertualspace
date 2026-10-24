import type { PluralMessage } from "../../index";
import type { Messages } from "../en";

const p = (forms: PluralMessage): PluralMessage => forms;

/** Integrationszentrum (Organisation), Meine Integrationen (persönlich) und Nachrichten der Integrationen. */
export const integrationCenter: Messages["integrationCenter"] = {
    nav: "Integrationen",
    navPersonal: "Meine Integrationen",
    title: "Integrationszentrum",
    intro: "Verbinden Sie die Werkzeuge Ihres Teams mit dem virtuellen Büro: Kalender, Chat, Entwicklerwerkzeuge, Boards und Automatisierungen. Zugangsdaten bleiben versiegelt auf diesem Server, und nichts gilt als verbunden, bevor der Anbieter geantwortet hat.",
    tabs: {
        label: "Bereiche des Integrationszentrums",
        catalog: "Katalog",
        notifications: "Benachrichtigungen",
        deliveries: "Zustellprotokoll",
        automation: "Automatisierungs-API",
    },
    categories: {
        calendars: { name: "Kalender", description: "Besprechungen und belegte Zeiten, sichtbar im Büro." },
        chat: { name: "Chat und Benachrichtigungen", description: "Ereignisse des Büros in den Kanälen Ihres Teams." },
        developer: {
            name: "Entwicklerwerkzeuge",
            description: "Wer woran programmiert – für alle, die das teilen möchten.",
        },
        productivity: { name: "Produktivität", description: "Boards und Seiten, die Sie in Räumen platzieren können." },
        music: { name: "Musik", description: "Was jemand hört, wenn er das teilen möchte." },
        automation: {
            name: "Automatisierung",
            description: "Ereignisse an Ihre Workflows und Aktionen, die diese ausführen können.",
        },
    },
    scope: {
        organization: "Organisation",
        personal: "Persönlich",
        both: "Organisation und persönlich",
    },
    status: {
        notConfigured: "Nicht konfiguriert",
        available: "Verfügbar",
        pending: "Wartet auf den ersten Aufruf",
        connected: "Verbunden",
        error: "Fehler",
        revoked: "Widerrufen",
        expired: "Abgelaufen",
    },
    open: "Öffnen",
    providers: {
        google: {
            name: "Google Kalender",
            description: "Jede Person verbindet ihren eigenen Google-Kalender.",
            usedFor:
                "Zeigt Besprechungen oder belegte Zeiten der Personen in WorkAdventure und kann während Besprechungen ihren Slack-Status setzen.",
            permissions:
                "Belegte Zeiten und, wenn die Person es wählt, Titel, Orte und Besprechungslinks ihres Hauptkalenders. Nur Lesen: AdminSpace ändert nie einen Kalender.",
        },
        microsoft: {
            name: "Microsoft-365-Kalender",
            description: "Jede Person verbindet ihren eigenen Outlook-Kalender (Geschäfts- oder Schulkonto).",
            usedFor:
                "Zeigt Besprechungen oder belegte Zeiten der Personen in WorkAdventure und kann während Besprechungen ihren Slack-Status setzen.",
            permissions:
                "Grundlegende Kalenderdaten (Calendars.ReadBasic: kein Nachrichtentext, keine Teilnehmenden) und das für die Anmeldung nötige Profil. Nur Lesen.",
        },
        slack: {
            name: "Slack",
            description:
                "Installieren Sie die AdminSpace-App in Ihrem Slack-Workspace; jede Person kann außerdem ihr eigenes Slack-Konto verbinden.",
            usedFor:
                "Postet Ereignisse des Büros (Einladungen, erste Besuche, Arbeitsplätze, Ankündigungen) in einen Kanal. Personen können ihren Status während Besprechungen auf „In einer Besprechung“ setzen lassen.",
            permissions:
                "Workspace: Nachrichten posten (chat:write, chat:write.public) und der bei der Installation gewählte Kanal-Webhook (incoming-webhook). Persönlich: Ihren Status ändern (users.profile:write).",
        },
        discord: {
            name: "Discord",
            description:
                "Ein Webhook eines Discord-Kanals, von einer Administratorin oder einem Administrator eingefügt.",
            usedFor:
                "Postet Ereignisse des Büros in einen Discord-Kanal. Discord hat keine API, um den Status einer Person zu ändern, mehr ist also nicht möglich.",
            permissions:
                "Keine OAuth-Berechtigung: Die Webhook-URL ist der einzige Zugang und wird versiegelt gespeichert.",
        },
        teams: {
            name: "Microsoft Teams",
            description:
                "Ein Workflows-Webhook („Webhook-Benachrichtigungen an einen Kanal senden“) eines Teams-Kanals.",
            usedFor: "Postet Ereignisse des Büros als Adaptive Cards in einen Teams-Kanal.",
            permissions:
                "Keine OAuth-Berechtigung: Die Webhook-URL ist der einzige Zugang und wird versiegelt gespeichert.",
        },
        github: {
            name: "GitHub",
            description:
                "Personen verbinden ihr eigenes GitHub-Konto; Administratoren können einen Webhook für die Repositories der Organisation hinzufügen.",
            usedFor:
                "Für alle, die es teilen möchten: woran sie gerade programmieren (Repository und Zeitpunkt ihres letzten Pushs oder Pull Requests) im Büro.",
            permissions:
                "Persönlich: Ihr öffentliches Profil und Ihre öffentliche Aktivität lesen (read:user). Webhook der Organisation: die von GitHub gesendeten, mit einem Geheimnis signierten Zustellungen.",
        },
        gitlab: {
            name: "GitLab",
            description:
                "Personen verbinden ihr eigenes GitLab-Konto; Administratoren können einen Webhook für die Projekte der Organisation hinzufügen.",
            usedFor:
                "Für alle, die es teilen möchten: wann sie zuletzt gepusht oder einen Merge Request geöffnet haben und in welchem Projekt (mit dem Webhook).",
            permissions:
                "Persönlich: Ihr Profil und Ihre Ereignisse lesen (read_user). Webhook der Organisation: die von GitLab gesendeten Zustellungen mit einem geheimen Token.",
        },
        notion: {
            name: "Notion",
            description:
                "Verbinden Sie den Notion-Workspace der Organisation (nur die Seiten, die Sie mit AdminSpace teilen).",
            usedFor:
                "Listet diese Seiten auf, damit Sie sie in Räumen platzieren können (ein WorkAdventure-Objekt „Website öffnen“).",
            permissions:
                "Die bei der Verbindung ausgewählten Seiten lesen. Notion fragt, welche Seiten geteilt werden.",
        },
        trello: {
            name: "Trello",
            description: "Verbinden Sie das Trello-Konto der Organisation (nur Lesen, 30 Tage, danach neu verbinden).",
            usedFor: "Listet offene Boards auf, damit Sie sie in Räumen platzieren können.",
            permissions: "Ihre Boards lesen (Bereich read). Das Token läuft nach 30 Tagen ab.",
        },
        miro: {
            name: "Miro",
            description: "Verbinden Sie das Miro-Team der Organisation.",
            usedFor: "Listet Boards mit ihrem Live-Embed-Link auf, um ein Board in einem Raum zu platzieren.",
            permissions: "Boards lesen (boards:read).",
        },
        spotify: {
            name: "Spotify",
            description: "Jede Person verbindet ihr eigenes Spotify-Konto, wenn sie möchte.",
            usedFor: "Zeigt im Büro, was jemand hört – nur solange die Person das Teilen aktiviert.",
            permissions: "Lesen, was gerade läuft (user-read-currently-playing). Sonst nichts.",
        },
        zapier: {
            name: "Zapier",
            description:
                "Ein Catch Hook von „Webhooks by Zapier“ und Automatisierungs-Tokens für Zaps, die im Büro handeln.",
            usedFor:
                "Startet Zaps bei Ereignissen des Büros; Zaps können über die Automatisierungs-API Personen einladen und Ankündigungen senden.",
            permissions:
                "Keine OAuth-Berechtigung: Die Hook-URL ist versiegelt, Anfragen sind signiert und Tokens auf ihre Bereiche beschränkt.",
        },
        n8n: {
            name: "n8n",
            description: "Ein n8n-Webhook-Knoten und Automatisierungs-Tokens für Workflows, die im Büro handeln.",
            usedFor:
                "Startet Workflows bei Ereignissen des Büros; Workflows können über die Automatisierungs-API Personen einladen und Ankündigungen senden.",
            permissions:
                "Keine OAuth-Berechtigung: Die Webhook-URL ist versiegelt, Anfragen sind signiert und Tokens auf ihre Bereiche beschränkt.",
        },
        webhook: {
            name: "Webhooks",
            description: "Jeder HTTPS-Endpunkt, der Standard-Webhooks-Anfragen annimmt.",
            usedFor: "Sendet Ereignisse des Büros signiert (webhook-signature) an Ihre eigenen Systeme.",
            permissions:
                "Keine OAuth-Berechtigung: Anfragen werden mit einem Geheimnis signiert, das nur einmal angezeigt wird.",
        },
    },
    notes: {
        google: "Personen brauchen ein Google-Konto mit Google Kalender. Eine App im Testmodus akzeptiert nur ihre Testnutzer, und ihre Aktualisierungstokens laufen nach 7 Tagen ab.",
        microsoft:
            "Ihr Microsoft-Entra-Mandant kann verlangen, dass eine Administratorin oder ein Administrator der App zustimmt, bevor sich Mitarbeitende verbinden können.",
        slack: "Token-Rotation wird unterstützt, wenn Sie sie in der Slack-App aktivieren. Anfragen der Events API werden mit SLACK_SIGNING_SECRET geprüft.",
        discord:
            "Discord sperrt Adressen, die viele ungültige Anfragen senden: Ein Ziel, dessen Webhook ständig fehlschlägt, wird automatisch pausiert.",
        teams: "Office-365-Connectors (eingehende Webhooks) wurden eingestellt: Erstellen Sie stattdessen einen Workflows-Webhook in Teams.",
        github: "Mit read:user sieht die Abfrage nur öffentliche Aktivität; der Webhook der Organisation deckt auch private Repositories ab.",
        gitlab: "Zugriffstokens gelten zwei Stunden und werden automatisch erneuert.",
        notion: "Notion hat keine API zum Widerrufen einer Verbindung: Entfernen Sie AdminSpace nach dem Trennen in Notion (Einstellungen, Verbindungen).",
        trello: "Trello gibt sein Token in der Adresse der Seite zurück: AdminSpace liest es einmal, sendet es an diesen Server und entfernt es aus der Adressleiste.",
        miro: "Miro bietet keine Webhooks mehr an: Boards werden beim Öffnen dieser Seite gelesen.",
        spotify:
            "Im Entwicklungsmodus bedient eine Spotify-App höchstens 5 Personen, die auf ihrer Zulassungsliste stehen müssen, und ihr Eigentümer braucht Spotify Premium. Weiterleitungs-URIs müssen HTTPS verwenden (oder http://127.0.0.1).",
        zapier: "Keine Zapier-App nötig: Verwenden Sie „Webhooks by Zapier“.",
        n8n: "Ein selbst gehostetes n8n im internen Netz muss mit INTEGRATION_ALLOWED_PRIVATE_HOSTS erlaubt werden.",
        webhook: "Prüfen Sie den Header webhook-signature und lehnen Sie Anfragen ab, die älter als fünf Minuten sind.",
    },
    setup: {
        title: "Auf diesem Server einrichten",
        notConfigured: "Dieser Server ist noch nicht für {provider} konfiguriert. Wer den Server betreibt, muss:",
        createApp: "In der Entwicklerkonsole des Anbieters eine Anwendung erstellen (siehe Anleitung).",
        redirect: "Diese Weiterleitungs-URI registrieren:",
        env: "Diese Umgebungsvariablen setzen und AdminSpace dann neu starten:",
        origin: "ORIGIN muss die öffentliche Adresse dieses Servers sein.",
        guide: "Anleitung des Anbieters",
        docs: "Alle Schritte stehen in docs/INTEGRATIONS.md.",
        noSetup: "Auf dem Server ist nichts einzurichten: Fügen Sie die URL jedes Ziels ein.",
    },
    provider: {
        back: "Alle Integrationen",
        whatItDoes: "Was sie im Büro bewirkt",
        permissions: "Berechtigungen",
        notes: "Gut zu wissen",
        connection: "Verbindung",
        account: "Konto",
        lastTested: "Letzte Prüfung",
        lastSync: "Letzte Synchronisierung",
        lastError: "Letzter Fehler",
        expires: "Zugang läuft ab",
        never: "Nie",
        notConnected: "Nicht verbunden.",
        connect: "Verbinden",
        reconnect: "Neu verbinden",
        test: "Verbindung testen",
        disconnect: "Trennen",
        disconnectTitle: "{provider} trennen?",
        disconnectDescription:
            "AdminSpace bittet {provider}, den Zugang zu widerrufen, und löscht dann die gespeicherten Zugangsdaten.",
        disconnected: "{provider} ist getrennt und der Zugang wurde widerrufen.",
        disconnectedManual:
            "{provider} ist hier getrennt. {provider} hat keine API zum Widerrufen eines Zugangs: Entfernen Sie AdminSpace auch in Ihrem {provider}-Konto.",
        revokeFailed:
            "Hier getrennt, aber {provider} war zum Widerrufen des Zugangs nicht erreichbar: Entfernen Sie AdminSpace in Ihrem {provider}-Konto.",
        manageAccess: "Zugänge bei {provider} verwalten",
        connected: "{provider} ist verbunden.",
        testOk: "Die Verbindung funktioniert ({account}).",
        testFailed: "Die Prüfung ist fehlgeschlagen. {problem}",
        personalOnly: "Jede Person verbindet ihr eigenes Konto unter Meine Integrationen.",
        personalCount: p({
            one: "{count} Person hat es verbunden.",
            other: "{count} Personen haben es verbunden.",
        }),
        openMine: "Meine Integrationen öffnen",
        destinations: "Ziele",
        destinationsIntro:
            "Jedes Ziel erhält die Ereignisse, die Sie wählen. Fügen Sie sie auf der Seite Benachrichtigungen hinzu oder ändern Sie sie dort.",
        destinationsCount: p({
            one: "{count} Ziel dieser Art.",
            other: "{count} Ziele dieser Art.",
        }),
        manageDestinations: "Ziele verwalten",
        slackDestinations:
            "Der bei der Installation gewählte Kanal wird zu einem Ziel. Weitere Kanäle können Sie auf der Seite Benachrichtigungen hinzufügen.",
    },
    resources: {
        title: "Boards und Seiten",
        intro: "Platzieren Sie eines davon mit einem WorkAdventure-Objekt „Website öffnen“ in einem Raum: Kopieren Sie seinen Link (oder Einbettungslink) in die URL des Objekts.",
        empty: "Nichts anzuzeigen. Teilen Sie beim Anbieter Seiten oder Boards mit AdminSpace.",
        failed: "Die Liste konnte nicht gelesen werden. {problem}",
        untitled: "Ohne Titel",
        copyLink: "Link kopieren",
        copyEmbed: "Einbettungslink kopieren",
        copied: "Kopiert",
        open: "Öffnen",
        updated: "Aktualisiert",
    },
    receiver: {
        title: "Webhook der Organisation",
        intro: "Fügen Sie Ihren Repositories oder Ihrer Organisation einen Webhook hinzu, damit Pushes und Pull/Merge Requests erscheinen – für Personen, die ihr eigenes Konto verbunden haben und ihre Aktivität teilen.",
        setUp: "Webhook-Empfänger erstellen",
        rotate: "Neues Geheimnis",
        rotateTitle: "Webhook-Geheimnis ersetzen?",
        rotateDescription:
            "Mit dem aktuellen Geheimnis signierte Zustellungen werden ab sofort abgelehnt: Fügen Sie das neue in den Webhook-Einstellungen des Anbieters ein.",
        url: "Payload-URL",
        secret: "Geheimnis",
        secretOnce: "Kopieren Sie das Geheimnis jetzt: Es wird nicht noch einmal angezeigt.",
        contentType: "Inhaltstyp: application/json.",
        githubEvents: "Ereignisse: „Just the push event“ oder Pushes und Pull Requests.",
        gitlabEvents: "Auslöser: Push-Ereignisse und Merge-Request-Ereignisse. Das Geheimnis gehört in „Secret token“.",
        waiting:
            "Warten auf die erste geprüfte Zustellung. GitHub sendet einen „ping“, sobald der Webhook gespeichert ist; in GitLab verwenden Sie „Test“.",
        working: "Zustellungen kommen an und werden geprüft.",
        remove: "Empfänger entfernen",
        removeTitle: "Webhook-Empfänger entfernen?",
        removeDescription: "Zustellungen werden ab sofort abgelehnt. Entfernen Sie den Webhook auch beim Anbieter.",
        removed: "Webhook-Empfänger entfernt.",
    },
    problems: {
        notConfigured: "Dieser Server ist für diese Integration nicht konfiguriert.",
        notAllowed: "Sie dürfen diese Integration nicht verbinden.",
        unsupported: "Diese Integration wird nicht auf diese Weise verbunden.",
        calendarTaken:
            "Sie teilen bereits einen anderen Kalender. Trennen Sie ihn zuerst: WorkAdventure zeigt einen Kalender pro Person.",
        invalidState: "Dieser Verbindungsversuch ist abgelaufen oder wurde bereits verwendet. Beginnen Sie erneut.",
        denied: "Die Verbindung wurde beim Anbieter abgelehnt.",
        scopeMissing:
            "Eine benötigte Berechtigung wurde nicht erteilt. Verbinden Sie sich erneut und akzeptieren Sie alle Berechtigungen.",
        rejected:
            "Der Anbieter hat die Verbindung abgelehnt. Prüfen Sie die Einstellungen der Anwendung (Client-ID, Geheimnis und Weiterleitungs-URI).",
        unavailable: "Der Anbieter ist nicht erreichbar. Versuchen Sie es gleich noch einmal.",
        unauthorized: "Der Anbieter hat die gespeicherten Zugangsdaten abgelehnt. Verbinden Sie sich neu.",
        invalidGrant: "Der Zugang ist abgelaufen oder wurde widerrufen. Verbinden Sie sich neu.",
        expired: "Der Zugang ist abgelaufen. Verbinden Sie sich neu.",
        forbidden:
            "Der Anbieter hat abgelehnt: Möglicherweise fehlt eine Berechtigung oder die Zustimmung einer Administratorin oder eines Administrators.",
        notFound: "Der Anbieter hat das Angeforderte nicht gefunden.",
        rateLimited: "Der Anbieter bittet um weniger Anfragen. Versuchen Sie es später erneut.",
        timeout: "Der Anbieter hat nicht rechtzeitig geantwortet.",
        invalidResponse: "Der Anbieter hat eine unerwartete Antwort gegeben.",
        membershipEnded: "Die Person hat die Organisation verlassen.",
        revokedAtProvider: "Der Zugang wurde beim Anbieter widerrufen.",
        unreadable:
            "Die gespeicherten Zugangsdaten sind nicht lesbar (wurde APP_SECRET geändert?). Verbinden Sie sich neu.",
        unexpected: "Etwas Unerwartetes ist passiert. Versuchen Sie es erneut.",
        code: "Fehlercode: {code}",
    },
    targetProblems: {
        invalidUrl: "Geben Sie eine gültige URL ein.",
        insecureScheme: "Verwenden Sie eine https://-URL.",
        credentialsInUrl: "Die URL darf weder Benutzername noch Passwort enthalten.",
        privateAddress:
            "Diese Adresse liegt in einem privaten Netz und wird abgelehnt. Wer den Server betreibt, kann ihren Host mit INTEGRATION_ALLOWED_PRIVATE_HOSTS erlauben.",
        unresolvable: "Dieser Hostname lässt sich nicht auflösen.",
        retiredConnector:
            "Office-365-Connectors wurden eingestellt. Erstellen Sie stattdessen einen Workflows-Webhook in Teams.",
        notTeamsUrl: "Das ist keine Workflows-Webhook-URL von Teams.",
        notDiscordUrl: "Das ist keine Discord-Webhook-URL (https://discord.com/api/webhooks/…).",
        notSlackUrl: "Das ist keine URL eines eingehenden Slack-Webhooks (https://hooks.slack.com/…).",
        notZapierUrl: "Das ist keine Catch-Hook-URL von Zapier (https://hooks.zapier.com/hooks/catch/…).",
        urlRequired: "Geben Sie die Webhook-URL ein.",
        invalidChannel: "Geben Sie einen Kanal wie #general oder eine Kanal-ID ein.",
        slackNotConnected:
            "Verbinden Sie zuerst den Slack-Workspace oder fügen Sie die URL eines eingehenden Webhooks ein.",
    },
    notifications: {
        title: "Benachrichtigungen",
        intro: "Senden Sie Ereignisse des Büros an Chat-Kanäle und Workflows. Jedes Ziel erhält die Ereignisse, die Sie wählen.",
        add: "Ziel hinzufügen",
        kind: "Art des Ziels",
        kinds: {
            slack: "Slack",
            discord: "Discord",
            teams: "Microsoft Teams",
            webhook: "Webhook",
            zapier: "Zapier",
            n8n: "n8n",
        },
        name: "Name",
        nameHelp: "Um es in Listen wiederzuerkennen, zum Beispiel „#büro in Slack“.",
        url: "Webhook-URL",
        urlHelp: {
            slack: "Die URL eines eingehenden Webhooks (https://hooks.slack.com/…) oder leer lassen und einen Kanal des verbundenen Workspace angeben.",
            discord: "Kanaleinstellungen › Integrationen › Webhooks › Webhook-URL kopieren.",
            teams: "In Teams: Workflows › „Webhook-Benachrichtigungen an einen Kanal senden“, dann die URL des Workflows kopieren.",
            webhook: "Ihr HTTPS-Endpunkt. Anfragen werden nach Standard Webhooks signiert.",
            zapier: "Die URL eines Catch-Hook-Auslösers von „Webhooks by Zapier“.",
            n8n: "Die Produktions-URL eines Webhook-Knotens (POST).",
        },
        channel: "Slack-Kanal",
        channelHelp: "Mit dem verbundenen Slack-Workspace: #kanal oder eine Kanal-ID (dann die URL leer lassen).",
        events: "Ereignisse",
        eventsHelp: "Das Ziel erhält nur diese Ereignisse.",
        create: "Ziel hinzufügen",
        created: "Ziel hinzugefügt.",
        secretTitle: "Signaturgeheimnis",
        secretOnce:
            "Kopieren Sie dieses Geheimnis jetzt: Es wird nicht noch einmal angezeigt. Empfänger prüfen damit den Header webhook-signature (Standard Webhooks).",
        empty: "Noch kein Ziel.",
        emptyHelp:
            "Fügen Sie einen Slack-Kanal, einen Discord- oder Teams-Webhook oder einen Zapier- oder n8n-Workflow hinzu.",
        list: "Ziele",
        active: "Aktiv",
        paused: "Pausiert",
        disabledReasons: {
            gone: "Pausiert: Der Empfänger hat 410 Gone geantwortet.",
            unauthorized: "Pausiert: Der Webhook wurde gelöscht oder seine Zugangsdaten werden abgelehnt.",
            failing: "Pausiert nach 10 fehlgeschlagenen Zustellungen in Folge.",
            blocked: "Pausiert: Die URL zeigt jetzt auf eine private Adresse.",
            manual: "Von einer Administratorin oder einem Administrator pausiert.",
        },
        signed: "Signiert (Standard Webhooks)",
        lastSuccess: "Letzte Zustellung",
        lastFailure: "Letzter Fehlschlag",
        failures: p({
            one: "{count} Fehlschlag in Folge",
            other: "{count} Fehlschläge in Folge",
        }),
        edit: "Name und Ereignisse",
        save: "Speichern",
        saved: "Ziel aktualisiert.",
        test: "Testereignis senden",
        testSent: "Das Testereignis wurde zugestellt (HTTP {status}).",
        testFailed: "Das Testereignis wurde nicht zugestellt. {problem}",
        testMessage: "Dies ist eine Testnachricht von AdminSpace.",
        pause: "Pausieren",
        resume: "Fortsetzen",
        pausedDone: "Ziel pausiert.",
        resumed: "Ziel fortgesetzt.",
        rotate: "Neues Signaturgeheimnis",
        rotateTitle: "Signaturgeheimnis ersetzen?",
        rotateDescription:
            "Das aktuelle Geheimnis funktioniert sofort nicht mehr: Geben Sie das neue an Ihren Empfänger weiter.",
        remove: "Entfernen",
        removeTitle: "Dieses Ziel entfernen?",
        removeDescription: "Es erhält keine Ereignisse mehr, und sein Zustellprotokoll wird gelöscht.",
        removed: "Ziel entfernt.",
        eventLabels: {
            member_invited: "Eine Einladung wird gesendet",
            member_joined: "Jemand betritt das Büro zum ersten Mal",
            member_suspended: "Ein Mitglied wird gesperrt",
            member_removed: "Ein Mitglied wird entfernt oder geht",
            desk_assigned: "Ein Arbeitsplatz wird zugewiesen",
            desk_released: "Ein Arbeitsplatz wird frei",
            office_announcement: "Im Büro wird eine Ankündigung gemacht",
            integration_test: "Testereignis",
        },
        noEvent: "Wählen Sie mindestens ein Ereignis.",
    },
    deliveries: {
        title: "Zustellprotokoll",
        intro: "Jedes an ein Ziel gesendete Ereignis, seine Versuche und die erhaltene Antwort. 30 Tage aufbewahrt.",
        filters: "Filter",
        status: "Status",
        endpoint: "Ziel",
        event: "Ereignis",
        all: "Alle",
        apply: "Filtern",
        statuses: { pending: "Ausstehend", succeeded: "Zugestellt", failed: "Fehlgeschlagen" },
        columns: {
            time: "Erstellt",
            event: "Ereignis",
            endpoint: "Ziel",
            status: "Status",
            attempts: "Versuche",
            answer: "Antwort",
            error: "Fehler",
        },
        httpStatus: "HTTP {status}",
        noAnswer: "Keine Antwort",
        retry: "Erneut versuchen",
        retried: "Die Zustellung wird erneut versucht.",
        retryProblems: {
            notFound: "Diese Zustellung existiert nicht.",
            notFailed: "Nur fehlgeschlagene Zustellungen können erneut versucht werden.",
            endpointDisabled: "Setzen Sie zuerst das Ziel fort.",
        },
        empty: "Noch keine Zustellung.",
        emptyFiltered: "Keine Zustellung entspricht diesen Filtern.",
    },
    automation: {
        title: "Automatisierungs-API",
        intro: "Lassen Sie Zapier, n8n oder Ihre eigenen Skripte in der Organisation handeln: Personen einladen und Ankündigungen senden. Ein Token handelt mit den aktuellen Rechten der Person, die es erstellt hat, beschränkt auf seine Bereiche.",
        newToken: "Neues Token",
        name: "Name",
        nameHelp: "Was es verwendet, zum Beispiel „Zapier-Onboarding-Zap“.",
        scopes: "Bereiche",
        scopeLabels: {
            invitations: "Personen einladen (invitations:write)",
            announcements: "Ankündigungen in Welten senden (announcements:write)",
        },
        noScope: "Wählen Sie mindestens einen Bereich.",
        expires: "Ablaufdatum",
        expiresHelp: "Leer lassen für ein Token, das nicht abläuft. Es funktioniert bis zum Ende dieses Tages (UTC).",
        create: "Token erstellen",
        created: "Kopieren Sie dieses Token jetzt: Es wird nie wieder angezeigt.",
        tokens: "Tokens",
        empty: "Noch kein Token.",
        columns: {
            name: "Name",
            token: "Token",
            scopes: "Bereiche",
            createdBy: "Erstellt von",
            status: "Status",
            lastUsed: "Zuletzt verwendet",
            expires: "Läuft ab",
        },
        statuses: { active: "Aktiv", revoked: "Widerrufen", expired: "Abgelaufen" },
        revokeTitle: "Dieses Token widerrufen?",
        revokeDescription: "Software, die es verwendet, verliert sofort den Zugang.",
        revoked: "Token widerrufen.",
        reference: {
            title: "Referenz",
            base: "Basis-URL",
            auth: "Senden Sie das Token im Header Authorization: Bearer, ein Leerzeichen, dann das Token. Anfragekörper sind JSON.",
            ping: "Prüft das Token und nennt die Organisation, zu der es gehört.",
            invitations:
                "Lädt eine Person per E-Mail ein (Rolle standardmäßig Mitarbeitende; optionaler Workspace-Bezeichner). AdminSpace sendet die Einladungs-E-Mail; ohne E-Mail-Versand enthält die Antwort den Einladungslink.",
            announcements:
                "Zeigt allen in einer Welt (oder einem Raum) eine Nachricht und postet sie an die Ziele, die Ankündigungen abonniert haben.",
            limits: "{count} Aufrufe pro Minute und Token. Fehler sind Problem-Dokumente (RFC 9457) mit einem Feld code.",
            originMissing: "ORIGIN ist nicht konfiguriert: Die Basis-URL unten ist ein Platzhalter.",
            zapierTitle: "Mit Zapier",
            zapierSteps:
                "Auslöser: „Webhooks by Zapier“ › Catch Hook, und fügen Sie seine URL als Zapier-Ziel hinzu. Aktion: „Webhooks by Zapier“ › POST an einen Endpunkt unten, Payload-Typ JSON, Header Authorization.",
            n8nTitle: "Mit n8n",
            n8nSteps:
                "Auslöser: ein Webhook-Knoten, dessen Produktions-URL ein n8n-Ziel ist. Aktion: ein HTTP-Request-Knoten mit der generischen Anmeldung „Bearer Auth“ und dem Token.",
        },
    },
    personal: {
        title: "Meine Integrationen",
        intro: "Verbinden Sie Ihre eigenen Konten, um Ihren Kalender, Ihre Aktivität und Ihre Musik ins Büro zu bringen. Sie bestimmen, was geteilt wird, und können sich jederzeit trennen.",
        privacy:
            "Ihre Zugangsdaten werden auf diesem Server verschlüsselt und niemandem gezeigt, auch Administratoren nicht. Administratoren sehen nur, wie viele Personen jeden Dienst verbunden haben.",
        notAvailable: "Auf diesem Server nicht verfügbar",
        notAvailableHelp: "Eine Administratorin oder ein Administrator dieses Servers muss es zuerst einrichten.",
        connectedAs: "Verbunden als {account}",
        consentTitle: "Was beim Verbinden passiert",
        consent: {
            google: "AdminSpace liest Ihren Google-Hauptkalender, um Ihre Besprechungen im Büro zu zeigen: nur belegte Zeiten, außer Sie teilen Titel, Orte und Besprechungslinks. In Ihren Kalender wird nie geschrieben.",
            microsoft:
                "AdminSpace liest Ihren Outlook-Kalender, um Ihre Besprechungen im Büro zu zeigen: nur belegte Zeiten, außer Sie teilen Titel, Orte und Besprechungslinks. In Ihren Kalender wird nie geschrieben.",
            github: "AdminSpace liest Ihr öffentliches GitHub-Profil und Ihre öffentliche Aktivität. Im Büro erscheint nichts, bis Sie das Teilen unten aktivieren.",
            gitlab: "AdminSpace liest Ihr GitLab-Profil und Ihre Ereignisse. Im Büro erscheint nichts, bis Sie das Teilen unten aktivieren.",
            spotify:
                "AdminSpace liest, was Sie gerade hören. Im Büro erscheint nichts, bis Sie das Teilen unten aktivieren.",
            slack: "AdminSpace kann nur Ihren Slack-Status ändern, und nur wenn Sie es unten aktivieren, während belegter Besprechungen Ihres Kalenders.",
        },
        settingsTitle: "Was Sie teilen",
        calendarSharing: {
            label: "Ihr Kalender im Büro",
            busy: "Nur belegte Zeiten",
            busyHelp: "Das Büro sieht, wann Sie belegt sind, nie Titel, Ort oder Link einer Besprechung.",
            details: "Titel, Orte und Besprechungslinks",
            detailsHelp:
                "Personen im Büro sehen, was Ihre Besprechungen sind, und können Online-Besprechungen beitreten.",
        },
        shareActivity:
            "Meine Programmieraktivität im Büro zeigen (Repository und Zeitpunkt meines letzten Pushs oder Pull Requests)",
        shareMusic: "Im Büro zeigen, was ich höre",
        statusSync: "Meinen Slack-Status während belegter Kalenderbesprechungen auf „In einer Besprechung“ setzen",
        statusSyncNeedsCalendar: "Dafür ist auch ein verbundener Kalender nötig.",
        saveSettings: "Meine Auswahl speichern",
        settingsSaved: "Ihre Auswahl ist gespeichert.",
        disconnectDescription:
            "Ihre gespeicherten Zugangsdaten werden gelöscht, und AdminSpace bittet {provider}, den Zugang zu widerrufen.",
    },
    callback: {
        title: "Verbindung wird hergestellt",
        working: "Die Verbindung mit {provider} wird abgeschlossen…",
        noScript: "JavaScript wird benötigt, um die Verbindung mit {provider} abzuschließen.",
        missingToken: "{provider} hat keinen Zugang zurückgegeben. Beginnen Sie erneut.",
        back: "Zurück zu den Integrationen",
    },
    statusText: "In einer Besprechung",
    notify: {
        someone: "Jemand",
        context: "{organization} · {time} (UTC)",
        facts: {
            email: "E-Mail",
            role: "Rolle",
            expires: "Einladung läuft ab",
            world: "Büro",
            link: "Link",
            room: "Raum",
            person: "Person",
            by: "Von",
        },
        events: {
            member_invited: {
                title: "{email} wurde eingeladen",
                text: "{inviter} hat {email} als {role} zu {organization} eingeladen.",
            },
            member_joined: {
                title: "{name} hat das Büro betreten",
                text: "{name} hat {world} zum ersten Mal betreten.",
            },
            member_suspended: {
                title: "{name} wurde gesperrt",
                text: "{by} hat den Zugang von {name} zu {organization} gesperrt.",
            },
            member_removed: {
                title: "{name} hat {organization} verlassen",
                text: "{by} hat {name} aus {organization} entfernt.",
                textLeft: "{name} hat {organization} verlassen.",
            },
            desk_assigned: {
                title: "{desk} an {name} vergeben",
                text: "{by} hat {desk} in {room} an {name} vergeben.",
            },
            desk_released: { title: "{desk} ist frei", text: "{desk} in {room} ist nicht mehr {name} zugewiesen." },
            office_announcement: { title: "Ankündigung in {world}", text: "{message}" },
            integration_test: {
                title: "AdminSpace-Test",
                text: "Dieser Test bestätigt, dass {organization} an dieses Ziel posten kann.",
            },
        },
    },
};
