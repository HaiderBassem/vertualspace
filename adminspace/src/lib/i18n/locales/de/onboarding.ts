/** Onboarding: Registrierung, E-Mail-Bestätigung, Einladungen, Zurücksetzen des Passworts und die zugehörigen E-Mails. */
import type { Messages } from "../en";

export const onboarding: Messages["onboarding"] = {
    register: {
        title: "Erstellen Sie Ihre Organisation",
        intro: "Richten Sie in wenigen Minuten einen Arbeitsbereich für Ihr Team ein. Sie werden Eigentümer der Organisation.",
        accountSection: "Ihr Konto",
        organizationSection: "Ihre Organisation",
        name: "Ihr Name",
        email: "Geschäftliche E-Mail-Adresse",
        password: "Passwort",
        passwordConfirm: "Passwort bestätigen",
        organizationName: "Name der Organisation",
        organizationSlug: "URL-Kennung",
        organizationSlugHint:
            "Kleinbuchstaben, Ziffern und Bindestriche. Ihre Welten sind unter /@/{slug}/… erreichbar.",
        submit: "Meine Organisation erstellen",
        haveAccount: "Sie haben bereits ein Konto?",
        login: "Anmelden",
        closed: "Die Registrierung ist auf dieser Plattform geschlossen. Bitten Sie einen Administrator, Sie einzuladen.",
        needsMail:
            "Die Registrierung erfordert den E-Mail-Versand, der auf dieser Plattform noch nicht konfiguriert ist. Wenden Sie sich an einen Plattform-Administrator.",
        pendingTitle: "Prüfen Sie Ihren Posteingang",
        pending:
            "Sofern die Adresse verwendet werden kann, haben wir einen Link an {email} gesendet, um sie zu bestätigen. Öffnen Sie ihn innerhalb von 24 Stunden, um die Erstellung Ihrer Organisation abzuschließen.",
        pendingHint:
            "Nach einigen Minuten ist nichts angekommen? Prüfen Sie Ihren Spam-Ordner oder registrieren Sie sich erneut.",
        accountExists:
            "Diese E-Mail-Adresse wird bereits von einem Konto verwendet. Melden Sie sich an und erstellen Sie die Organisation dann über Ihr Konto.",
        terms: "Mit der Erstellung einer Organisation bestätigen Sie, dass Sie berechtigt sind, in ihrem Namen zu handeln.",
    },
    verify: {
        title: "Bestätigen Sie Ihre Organisation",
        intro: "Ein letzter Schritt: Bestätigen Sie, um Ihr Konto und Ihre Organisation zu erstellen.",
        summaryAccount: "Konto",
        summaryOrganization: "Organisation",
        confirm: "Meine Organisation erstellen",
        slugTaken: "Diese URL-Kennung wurde inzwischen vergeben. Wählen Sie eine andere, um fortzufahren.",
        invalidTitle: "Dieser Link kann nicht verwendet werden",
        invalid:
            "Der Link ist abgelaufen oder wurde bereits verwendet. Falls Sie bereits bestätigt haben, melden Sie sich an. Andernfalls registrieren Sie sich erneut.",
        accountExists:
            "Diese E-Mail-Adresse wird bereits von einem Konto verwendet. Melden Sie sich an, um fortzufahren.",
    },
    welcome: {
        title: "Willkommen bei {organization}",
        intro: "Ihre Organisation ist bereit. So geht es weiter.",
        steps: {
            profile: "Profil der Organisation vervollständigen",
            profileHint: "Logo, Farbe, Land und Kontakt-E-Mail.",
            workspace: "Arbeitsbereiche organisieren",
            workspaceHint:
                "Gruppieren Sie Ihre Büros nach Abteilung oder Standort. Ein Arbeitsbereich ist bereits vorhanden.",
            world: "Erste Welt erstellen",
            worldHint: "Eine Welt ist ein virtuelles Büro in WorkAdventure, bestehend aus Räumen.",
            invite: "Team einladen",
            inviteHint: "Versenden Sie Einladungen per E-Mail, mit der passenden Rolle für jede Person.",
            components: "Büro einrichten",
            componentsHint: "Wählen Sie Schreibtische, Besprechungsräume und Dekoration aus der Komponentenbibliothek.",
        },
        done: "Erledigt",
        todo: "Offen",
        skip: "Zum Dashboard",
    },
    invite: {
        title: "{organization} beitreten",
        intro: "{inviter} hat Sie eingeladen, {organization} als {role} beizutreten.",
        introNoInviter: "Sie sind eingeladen, {organization} als {role} beizutreten.",
        workspaces: "Sie erhalten Zugriff auf: {workspaces}.",
        accept: "{organization} beitreten",
        loginToAccept: "Für diese Adresse besteht bereits ein Konto. Melden Sie sich an, um die Einladung anzunehmen.",
        loginAction: "Anmelden und annehmen",
        createAccount: "Erstellen Sie Ihr Konto, um beizutreten",
        name: "Ihr Name",
        password: "Passwort",
        passwordConfirm: "Passwort bestätigen",
        createAndJoin: "Konto erstellen und beitreten",
        invitedEmail: "Einladung für {email}",
        wrongAccount:
            "Sie sind als {current} angemeldet, diese Einladung gilt jedoch für {invited}. Melden Sie sich ab und öffnen Sie den Link dann erneut.",
        logoutAndContinue: "Abmelden",
        invalidTitle: "Diese Einladung kann nicht verwendet werden",
        invalid: "Der Link ist ungültig. Bitten Sie die Person, die Sie eingeladen hat, um eine neue Einladung.",
        expired: "Diese Einladung ist abgelaufen. Bitten Sie die Person, die Sie eingeladen hat, sie erneut zu senden.",
        revoked: "Diese Einladung wurde zurückgezogen.",
        accepted: "Diese Einladung wurde bereits angenommen. Melden Sie sich an, um fortzufahren.",
        organizationInactive: "Diese Organisation ist derzeit nicht verfügbar.",
        noLongerValid:
            "Diese Einladung ist nicht mehr gültig. Bitten Sie einen Administrator der Organisation um eine neue.",
        joined: "Sie sind {organization} beigetreten.",
    },
    forgot: {
        title: "Passwort zurücksetzen",
        intro: "Geben Sie die E-Mail-Adresse Ihres Kontos ein. Wir senden Ihnen einen Link, mit dem Sie ein neues Passwort wählen können.",
        email: "E-Mail",
        submit: "Link senden",
        sent: "Falls ein Konto diese Adresse verwendet, wurde ein Link an sie gesendet. Er ist 30 Minuten gültig.",
        unavailable:
            "Das Zurücksetzen des Passworts per E-Mail ist auf dieser Plattform nicht verfügbar. Bitten Sie einen Plattform-Administrator, Ihr Passwort zurückzusetzen.",
        backToLogin: "Zurück zur Anmeldung",
        link: "Passwort vergessen?",
    },
    reset: {
        title: "Neues Passwort wählen",
        intro: "Ihre anderen Sitzungen werden beendet. Die Zwei-Faktor-Authentifizierung gilt weiterhin, sofern sie aktiviert ist.",
        password: "Neues Passwort",
        passwordConfirm: "Neues Passwort bestätigen",
        submit: "Passwort ändern",
        done: "Ihr Passwort wurde geändert. Sie können sich jetzt anmelden.",
        invalid: "Dieser Link ist abgelaufen oder wurde bereits verwendet. Fordern Sie einen neuen an.",
        askAgain: "Neuen Link anfordern",
    },
    emails: {
        invitation: {
            subject: "Sie sind eingeladen, {organization} beizutreten",
            body: "{inviter} hat Sie eingeladen, {organization} in AdminSpace als {role} beizutreten.",
            action: "Einladung annehmen",
            footnote:
                "Diese Einladung läuft am {expiresAt} (UTC) ab. Falls Sie sie nicht erwartet haben, können Sie diese E-Mail ignorieren.",
        },
        signupVerification: {
            subject: "Bestätigen Sie die Erstellung von {organization}",
            body: "Guten Tag {name}, bestätigen Sie Ihre E-Mail-Adresse, um die Erstellung von {organization} in AdminSpace abzuschließen.",
            action: "Bestätigen und Organisation erstellen",
            footnote:
                "Dieser Link ist {hours} Stunden gültig. Falls Sie ihn nicht angefordert haben, ignorieren Sie diese E-Mail: Es wird nichts erstellt.",
        },
        signupExisting: {
            subject: "Sie haben bereits ein AdminSpace-Konto",
            body: "Jemand hat versucht, sich mit dieser E-Mail-Adresse zu registrieren, für die bereits ein Konto besteht. Falls Sie das waren, melden Sie sich an: Über Ihr Konto können Sie eine Organisation erstellen.",
            action: "Anmelden",
            footnote: "Falls Sie das nicht waren, können Sie diese E-Mail ignorieren. Ihr Konto wurde nicht verändert.",
        },
        passwordReset: {
            subject: "Setzen Sie Ihr AdminSpace-Passwort zurück",
            body: "Guten Tag {name}, wir haben eine Anfrage erhalten, das Passwort Ihres Kontos zurückzusetzen.",
            action: "Neues Passwort wählen",
            footnote:
                "Dieser Link ist {minutes} Minuten gültig und funktioniert nur einmal. Falls Sie ihn nicht angefordert haben, ignorieren Sie diese E-Mail: Ihr Passwort bleibt unverändert.",
        },
        passwordChanged: {
            subject: "Ihr AdminSpace-Passwort wurde geändert",
            body: "Guten Tag {name}, das Passwort Ihres Kontos wurde soeben geändert, und Ihre Sitzungen wurden beendet.",
            footnote:
                "Falls Sie das nicht waren, setzen Sie Ihr Passwort sofort zurück und wenden Sie sich an Ihren Administrator.",
        },
    },
};
