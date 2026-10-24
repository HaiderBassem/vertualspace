import type { DeepPartial } from "../DeepPartial";
import type { Translation } from "../i18n-types";

const login: DeepPartial<Translation["login"]> = {
    genericError: "Ocurrió un error",
    input: {
        name: {
            placeholder: "Introduzca su nombre",
            empty: "El nombre está vacío",
            tooLongError: "El nombre es muy largo",
            notValidError: "El nombre no es válido",
        },
    },
    terms: "Si continúa, está de acuerdo con nuestros {links}.",
    termsOfUse: "términos de uso",
    privacyPolicy: "política de privacidad",
    cookiePolicy: "política de cookie",
    continue: "Continuar",
    signIn: {
        titleFirstVisit: "Inicia sesión para entrar",
        titleSessionExpired: "Se ha cerrado tu sesión",
        leadFirstVisit: "Usa la cuenta de trabajo que tu administrador creó para ti.",
        leadSessionExpired: "Inicia sesión de nuevo para volver donde estabas.",
        button: "Iniciar sesión con tu cuenta de trabajo",
        redirecting: "Abriendo la página de inicio de sesión…",
        helpTitle: "¿Aún no tienes cuenta?",
        help: "Pide a tu administrador que te invite. Recibirás un correo electrónico con los pasos a seguir.",
    },
};

export default login;
