import type { DeepPartial } from "../DeepPartial";
import type { Translation } from "../i18n-types";

const login: DeepPartial<Translation["login"]> = {
    input: {
        name: {
            placeholder: "Entrez votre nom",
            empty: "Le nom est vide",
            tooLongError: "Le nom est trop long",
            notValidError: "Le nom n'est pas valide",
        },
    },
    genericError: "Une erreur est survenue",
    terms: "En continuant, vous acceptez {links}.",
    termsOfUse: "nos conditions d'utilisation",
    privacyPolicy: "notre politique de confidentialité",
    cookiePolicy: "notre politique relative aux cookies",
    continue: "Continuer",
    signIn: {
        titleFirstVisit: "Connectez-vous pour entrer",
        titleSessionExpired: "Vous avez été déconnecté",
        leadFirstVisit: "Utilisez le compte professionnel que votre administrateur a créé pour vous.",
        leadSessionExpired: "Reconnectez-vous pour retourner là où vous étiez.",
        button: "Se connecter avec votre compte professionnel",
        redirecting: "Ouverture de la page de connexion…",
        helpTitle: "Pas encore de compte ?",
        help: "Demandez à votre administrateur de vous inviter. Vous recevrez un e-mail avec les étapes à suivre.",
    },
};

export default login;
