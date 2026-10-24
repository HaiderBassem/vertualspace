import type { BaseTranslation } from "../i18n-types";

const login: BaseTranslation = {
    input: {
        name: {
            placeholder: "Digite seu nome",
            empty: "O nome está vazio",
            tooLongError: "O nome é muito longo",
            notValidError: "O nome não é válido",
        },
    },
    genericError: "Ocorreu um erro",
    terms: "Ao continuar, você concorda com nossos {links}.",
    termsOfUse: "termos de uso",
    privacyPolicy: "política de privacidade",
    cookiePolicy: "política de cookies",
    continue: "Continuar",
    signIn: {
        titleFirstVisit: "Entre para continuar",
        titleSessionExpired: "Você foi desconectado",
        leadFirstVisit: "Use a conta de trabalho que seu administrador criou para você.",
        leadSessionExpired: "Entre novamente para voltar de onde parou.",
        button: "Entrar com sua conta de trabalho",
        redirecting: "Abrindo a página de login…",
        helpTitle: "Ainda não tem uma conta?",
        help: "Peça ao seu administrador para convidar você. Você receberá um e-mail com os passos a seguir.",
    },
};

export default login;
