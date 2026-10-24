import type { DeepPartial } from "../DeepPartial";
import type { Translation } from "../i18n-types";

const login: DeepPartial<Translation["login"]> = {
    input: {
        name: {
            placeholder: "Trage deinen Namen ein",
            empty: "Kein Name angegeben",
            tooLongError: "Der Name ist zu lang",
            notValidError: "Der Name ist ungültig",
        },
    },
    genericError: "Ein Fehler ist aufgetreten",
    terms: "Wenn du fortfährst, akzeptierst du die {links}.",
    termsOfUse: "Nutzungsbedingungen",
    privacyPolicy: "Datenschutzerklärung",
    cookiePolicy: "Cookierichtlinien",
    continue: "Fortfahren",
    signIn: {
        titleFirstVisit: "Melde dich an, um einzutreten",
        titleSessionExpired: "Du wurdest abgemeldet",
        leadFirstVisit: "Verwende das Arbeitskonto, das dein Administrator für dich erstellt hat.",
        leadSessionExpired: "Melde dich erneut an, um dort weiterzumachen, wo du warst.",
        button: "Mit deinem Arbeitskonto anmelden",
        redirecting: "Die Anmeldeseite wird geöffnet…",
        helpTitle: "Noch kein Konto?",
        help: "Bitte deinen Administrator, dich einzuladen. Du erhältst eine E-Mail mit den nächsten Schritten.",
    },
};

export default login;
