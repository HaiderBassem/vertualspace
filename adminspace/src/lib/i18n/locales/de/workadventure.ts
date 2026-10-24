import type { Messages } from "../en";

/** Texte für Spieler auf den Fehlerbildschirmen von WorkAdventure, über die Admin API zurückgegeben. */
export const workadventure: Messages["workadventure"] = {
    errorTitle: "Zugang verweigert",
    roomNotFound: {
        subtitle: "Diesen Raum gibt es nicht.",
        details:
            "Prüfen Sie den Link, dem Sie gefolgt sind, oder bitten Sie die Person, die Sie eingeladen hat, um einen neuen.",
    },
    worldNotFound: {
        subtitle: "Diese Welt gibt es nicht.",
        details:
            "Prüfen Sie den Link, dem Sie gefolgt sind, oder bitten Sie die Person, die Sie eingeladen hat, um einen neuen.",
    },
    worldArchived: {
        subtitle: "Diese Welt ist geschlossen.",
        details:
            "Die Verantwortlichen haben sie archiviert. Wenden Sie sich an sie, wenn Sie glauben, dass es sich um einen Irrtum handelt.",
    },
    worldExpired: {
        subtitle: "Diese Welt ist abgelaufen.",
        details: "Bitten Sie die Verantwortlichen der Welt, sie wieder zu öffnen.",
    },
    organizationSuspended: {
        subtitle: "Diese Welt ist nicht verfügbar.",
        details: "Ihre Organisation wurde von den Plattformadministratoren gesperrt.",
    },
    roomPreparing: {
        subtitle: "Dieser Raum wird vorbereitet.",
        details: "Seine Karte wird gerade veröffentlicht. Versuchen Sie es in einer Minute erneut.",
    },
    invalidUrl: {
        subtitle: "Diese Adresse ist kein gültiger WorkAdventure-Raum.",
        details: "Prüfen Sie den Link, dem Sie gefolgt sind.",
    },
    banned: {
        subtitle: "Sie wurden aus dieser Welt gesperrt.",
        details: "Grund: {reason}",
    },
    membersOnly: {
        subtitle: "Diese Welt ist ihren Mitgliedern vorbehalten.",
        details:
            "Melden Sie sich mit dem eingeladenen Konto an oder bitten Sie die Verantwortlichen der Welt um eine Einladung.",
        button: "Abmelden",
    },
    loginRequired: {
        subtitle: "Sie müssen sich anmelden, um diese Welt zu betreten.",
        details: "Melden Sie sich an, um fortzufahren.",
        button: "Anmelden",
    },
    tagRequired: {
        subtitle: "Sie können diesen Raum nicht betreten.",
        details:
            "Der Zugang zu diesem Raum ist eingeschränkt. Fragen Sie die Verantwortlichen der Welt, wenn Sie Zugang benötigen.",
        button: "Abmelden",
    },
    worldFull: {
        title: "Welt voll",
        subtitle: "Diese Welt hat die maximale Anzahl an Personen erreicht.",
        details: "In wenigen Augenblicken wird automatisch ein neuer Versuch unternommen.",
        button: "Erneut versuchen",
    },
    banNotAllowed: {
        subtitle: "Sie dürfen in dieser Welt niemanden sperren.",
        details: "Nur die Verantwortlichen der Welt können Personen sperren.",
    },
    defaultBanReason: "Kein Grund angegeben.",
};
