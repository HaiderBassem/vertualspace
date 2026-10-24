import type { Messages } from "../en";

/** Estructura de la aplicación: navegación, selector de organización, menú de la cuenta, aviso de acceso de soporte. */
export const app: Messages["app"] = {
    sections: {
        organization: "Organización",
        administration: "Administración",
        platform: "Plataforma",
    },
    nav: {
        overview: "Resumen",
        home: "Inicio",
        workspaces: "Espacios de trabajo",
        people: "Personas",
        directory: "Directorio",
        components: "Componentes",
        apiKeys: "Claves de la Room API",
        domains: "Dominios",
        audit: "Registro de auditoría",
        settings: "Ajustes",
    },
    platformNav: {
        overview: "Centro de control",
        organizations: "Organizaciones",
        accounts: "Cuentas",
        components: "Catálogo de componentes",
        avatars: "Catálogo de avatares",
        jobs: "Tareas en segundo plano",
        email: "Envío de correos electrónicos",
        settings: "Ajustes de la instancia",
        audit: "Registro de auditoría",
    },
    switcher: {
        label: "Cambiar de organización",
        yourOrganizations: "Sus organizaciones",
        support: "Acceso de soporte",
        create: "Crear una organización",
        none: "Todavía no forma parte de ninguna organización.",
        choose: "Elija una organización",
        suspended: "Suspendida",
    },
    account: {
        menu: "Menú de la cuenta",
        settings: "Ajustes de la cuenta",
        signOut: "Cerrar sesión",
    },
    support: {
        banner: "Acceso de soporte a {organization} hasta el {time}. Motivo: {reason}",
        end: "Finalizar el acceso de soporte",
    },
    errorPage: {
        notFoundTitle: "Página no encontrada",
        forbiddenTitle: "Acceso denegado",
        suspendedTitle: "Organización suspendida",
        suspended:
            "Los administradores de la plataforma han suspendido esta organización. Sus mundos permanecen cerrados hasta que se reactive.",
        rateLimitedTitle: "Demasiadas solicitudes",
        errorTitle: "Se ha producido un error",
        requestId: "Referencia: {id}",
        home: "Ir a la página de inicio",
    },
    breadcrumbs: "Ruta de navegación",
    openMenu: "Abrir la navegación",
    closeMenu: "Cerrar la navegación",
};
