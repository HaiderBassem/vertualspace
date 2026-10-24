import type { DeepPartial } from "../DeepPartial";
import type { Translation } from "../i18n-types";

const login: DeepPartial<Translation["login"]> = {
    genericError: "S'ha produït un error",
    input: {
        name: {
            placeholder: "Introduïu el vostre nombre",
            empty: "El nom està buit",
            tooLongError: "El nom és molt llarg",
            notValidError: "El nom no és vàlid",
        },
    },
    terms: `Si continueu, esteu d'acord amb els nostres {links}.`,
    termsOfUse: "termes d'ús",
    privacyPolicy: "política de privacitat",
    cookiePolicy: "política de cookie",
    continue: "Continuar",
    signIn: {
        titleFirstVisit: "Inicia la sessió per entrar",
        titleSessionExpired: "S'ha tancat la teva sessió",
        leadFirstVisit: "Fes servir el compte de feina que t'ha creat l'administrador.",
        leadSessionExpired: "Torna a iniciar la sessió per tornar on eres.",
        button: "Inicia la sessió amb el teu compte de feina",
        redirecting: "S'està obrint la pàgina d'inici de sessió…",
        helpTitle: "Encara no tens compte?",
        help: "Demana a l'administrador que et convidi. Rebràs un correu electrònic amb els passos a seguir.",
    },
};

export default login;
