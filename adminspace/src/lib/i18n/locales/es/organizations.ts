import type { PluralMessage } from "../../index";
import type { Messages } from "../en";

const p = (forms: PluralMessage): PluralMessage => forms;

/** Organizaciones: lista, creación, ajustes y equipo (administradores del panel). */
export const organizations: Messages["organizations"] = {
    title: "Organizaciones",
    intro: "Una organización agrupa mundos y a las personas que los administran.",
    create: "Nueva organización",
    createTitle: "Crear una organización",
    createIntro: "Usted será su propietario. Después podrá añadir a otros administradores.",
    createNotAllowed: "En esta instancia solo los administradores de la plataforma pueden crear organizaciones.",
    created: "Se ha creado la organización.",
    empty: "Todavía no forma parte de ninguna organización.",
    worldCount: p({ zero: "Ningún mundo", one: "{count} mundo", other: "{count} mundos" }),
    fields: {
        name: "Nombre",
        slug: "Identificador de URL",
        country: "País",
        defaultLocale: "Idioma predeterminado",
        contactEmail: "Correo electrónico de contacto",
    },
    hints: {
        slug: "Aparece en la dirección de cada mundo: /@/{slug}/…",
        country: "País en el que está establecida la organización (ISO 3166-1).",
        defaultLocale: "Idioma propuesto para el contenido creado para esta organización.",
        contactEmail: "A quién dirigirse en relación con esta organización.",
    },
    noCountry: "Sin especificar",
    worlds: {
        title: "Mundos",
        newWorld: "Nuevo mundo",
        empty: "Esta organización todavía no tiene ningún mundo.",
        showArchived: "Mostrar los mundos archivados",
        columns: {
            world: "Mundo",
            access: "Acceso",
            state: "Estado",
            created: "Creado",
        },
    },
    settings: {
        title: "Ajustes de la organización",
        intro: "Identidad y datos de contacto de la organización.",
        slugReadOnly: "El identificador de URL no se puede cambiar: rompería la dirección de todos los mundos.",
        dangerZone: "Zona de peligro",
        deleteTitle: "Eliminar esta organización",
        deleteDescription:
            "Elimina todos sus mundos, salas, miembros, bloqueos, reportes y claves de API. WorkAdventure rechazará todas las direcciones de estos mundos. Esta acción no se puede deshacer.",
    },
    team: {
        addRequested:
            "Si una cuenta usa esta dirección de correo, ahora forma parte del equipo con este rol. Las invitaciones por correo no están disponibles: si es necesario, pida antes a un superadministrador que cree la cuenta.",
        title: "Equipo",
        intro: "Personas que pueden administrar esta organización en Adminspace y lo que tienen permitido hacer.",
        add: "Añadir un administrador",
        addIntro:
            "La persona necesita una cuenta de Adminspace. Si es necesario, pida a un administrador de la plataforma que la cree.",
        accountNotFound: "Ninguna cuenta utiliza esta dirección de correo electrónico.",
        alreadyMember: "Esta persona ya forma parte del equipo.",
        lastOwner: "Una organización necesita al menos un propietario.",
        added: "Se ha añadido al administrador.",
        roleChanged: "Se ha cambiado el rol.",
        removed: "Se ha quitado al administrador.",
        remove: "Quitar",
        removeTitle: "¿Quitar a {name} del equipo?",
        removeDescription: "Perderá el acceso a esta organización en Adminspace.",
        you: "usted",
        rolesTitle: "Roles",
        columns: {
            person: "Persona",
            role: "Rol",
            since: "Miembro desde",
            lastLogin: "Último inicio de sesión",
        },
    },
    audit: {
        title: "Registro de auditoría",
        intro: "Todos los cambios realizados en esta organización, por sus administradores o por WorkAdventure (bloqueos, reportes). Las horas se muestran en su zona horaria.",
        filterAction: "La acción empieza por",
        empty: "Ninguna entrada.",
        columns: {
            time: "Hora",
            actor: "Por",
            action: "Acción",
            target: "Objetivo",
            ip: "Dirección IP",
            details: "Detalles",
        },
    },
};
