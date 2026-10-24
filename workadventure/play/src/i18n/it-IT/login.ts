import type { DeepPartial } from "../DeepPartial";
import type { Translation } from "../i18n-types";

const login: DeepPartial<Translation["login"]> = {
    input: {
        name: {
            placeholder: "Inserisci il tuo nome",
            empty: "Il nome è vuoto",
            tooLongError: "Il nome è troppo lungo",
            notValidError: "Formato del nome non corretto",
        },
    },
    genericError: "Si è verificato un errore",
    terms: "Continuando, accetti i nostri {links}.",
    termsOfUse: "termini di utilizzo",
    privacyPolicy: "politica sulla privacy",
    cookiePolicy: "politica sui cookie",
    continue: "Continua",
    signIn: {
        titleFirstVisit: "Accedi per entrare",
        titleSessionExpired: "Sei stato disconnesso",
        leadFirstVisit: "Usa l'account di lavoro che il tuo amministratore ha creato per te.",
        leadSessionExpired: "Accedi di nuovo per tornare dove eri.",
        button: "Accedi con il tuo account di lavoro",
        redirecting: "Apertura della pagina di accesso…",
        helpTitle: "Non hai ancora un account?",
        help: "Chiedi al tuo amministratore di invitarti. Riceverai un'e-mail con i passaggi da seguire.",
    },
};

export default login;
