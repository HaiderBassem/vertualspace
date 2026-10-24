import type { Messages } from "../en";

/** Textos mostrados a los jugadores en las pantallas de error de WorkAdventure, devueltos por la Admin API. */
export const workadventure: Messages["workadventure"] = {
    errorTitle: "Acceso denegado",
    roomNotFound: {
        subtitle: "Esta sala no existe.",
        details: "Compruebe el enlace que ha seguido o pida uno nuevo a las personas que le invitaron.",
    },
    worldNotFound: {
        subtitle: "Este mundo no existe.",
        details: "Compruebe el enlace que ha seguido o pida uno nuevo a las personas que le invitaron.",
    },
    worldArchived: {
        subtitle: "Este mundo está cerrado.",
        details:
            "Sus administradores lo han archivado. Póngase en contacto con ellos si cree que se trata de un error.",
    },
    worldExpired: {
        subtitle: "Este mundo ha caducado.",
        details: "Póngase en contacto con sus administradores para que lo vuelvan a abrir.",
    },
    organizationSuspended: {
        subtitle: "Este mundo no está disponible.",
        details: "Su organización ha sido suspendida por los administradores de la plataforma.",
    },
    roomPreparing: {
        subtitle: "Esta sala se está preparando.",
        details: "Su mapa se está publicando. Vuelva a intentarlo en un minuto.",
    },
    invalidUrl: {
        subtitle: "Esta dirección no corresponde a una sala válida de WorkAdventure.",
        details: "Compruebe el enlace que ha seguido.",
    },
    banned: {
        subtitle: "Se le ha bloqueado el acceso a este mundo.",
        details: "Motivo: {reason}",
    },
    membersOnly: {
        subtitle: "Este mundo está reservado a sus miembros.",
        details:
            "Inicie sesión con la cuenta que recibió la invitación o pida una invitación a los administradores del mundo.",
        button: "Cerrar sesión",
    },
    loginRequired: {
        subtitle: "Debe iniciar sesión para entrar en este mundo.",
        details: "Inicie sesión para continuar.",
        button: "Iniciar sesión",
    },
    tagRequired: {
        subtitle: "No puede entrar en esta sala.",
        details: "El acceso a esta sala está restringido. Pida acceso a los administradores del mundo si lo necesita.",
        button: "Cerrar sesión",
    },
    worldFull: {
        title: "Mundo completo",
        subtitle: "Este mundo ha alcanzado su número máximo de personas.",
        details: "Se volverá a intentar automáticamente dentro de unos instantes.",
        button: "Reintentar",
    },
    banNotAllowed: {
        subtitle: "No tiene permiso para bloquear a personas en este mundo.",
        details: "Solo los administradores del mundo pueden bloquear a personas.",
    },
    defaultBanReason: "No se ha indicado ningún motivo.",
};
