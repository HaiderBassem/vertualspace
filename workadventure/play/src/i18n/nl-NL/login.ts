import type { Translation } from "../i18n-types";
import type { DeepPartial } from "../DeepPartial";

const login: DeepPartial<Translation["login"]> = {
    input: {
        name: {
            placeholder: "Voer je naam in",
            empty: "De naam is leeg",
            tooLongError: "Naam is te lang",
            notValidError: "Onjuist naamformaat",
        },
    },
    genericError: "Er is een fout opgetreden",
    terms: "Door door te gaan, ga je akkoord met onze {links}.",
    termsOfUse: "gebruikersvoorwaarden",
    privacyPolicy: "privacybeleid",
    cookiePolicy: "cookiebeleid",
    continue: "Doorgaan",
    signIn: {
        titleFirstVisit: "Log in om binnen te gaan",
        titleSessionExpired: "Je bent uitgelogd",
        leadFirstVisit: "Gebruik het werkaccount dat je beheerder voor je heeft gemaakt.",
        leadSessionExpired: "Log opnieuw in om terug te gaan naar waar je was.",
        button: "Inloggen met je werkaccount",
        redirecting: "De inlogpagina wordt geopend…",
        helpTitle: "Nog geen account?",
        help: "Vraag je beheerder om je uit te nodigen. Je ontvangt een e-mail met de stappen die je moet volgen.",
    },
};

export default login;
