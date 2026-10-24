import type { PluralMessage } from "../../index";
import type { Messages } from "../en";

const p = (forms: PluralMessage): PluralMessage => forms;

/** Inicio de la organización: el resumen para los administradores, el espacio de los empleados y el directorio. */
export const home: Messages["home"] = {
    joined: "¡Bienvenido! Ahora es miembro de {organization}.",
    overview: {
        title: "Resumen",
        intro: "El estado de su organización de un vistazo.",
        stats: {
            workspaces: "Espacios de trabajo",
            worlds: "Mundos",
            rooms: "Salas",
            people: "Personas",
            pendingInvitations: "Invitaciones pendientes",
        },
        setup: "Termine la configuración",
        setupProgress: "{done} de {total} completados",
        worldsTitle: "Mundos",
        worldsIntro: "Oficinas virtuales en WorkAdventure. Cada una pertenece a un espacio de trabajo.",
        workspaceColumn: "Espacio de trabajo",
        activity: "Actividad reciente",
        activityEmpty: "Todavía no ha ocurrido nada.",
        allActivity: "Ver el registro de auditoría",
        newWorld: "Nuevo mundo",
        invite: "Invitar a personas",
    },
    employee: {
        greeting: "Bienvenido, {name}",
        intro: "Sus oficinas en {organization}, sus compañeros y los componentes compartidos.",
        offices: "Sus oficinas",
        officesIntro:
            "Abra una oficina en WorkAdventure. Inicie sesión allí con {email} para que se le reconozca como miembro.",
        noOffices: "Todavía no tiene acceso a ninguna oficina.",
        noOfficesHint: "Un administrador de su organización puede darle acceso a un espacio de trabajo.",
        enter: "Entrar",
        rooms: p({ zero: "Todavía no hay ninguna sala", one: "{count} sala", other: "{count} salas" }),
        unavailable: "La dirección de WorkAdventure no está configurada en esta plataforma.",
        teammates: "Compañeros",
        allTeammates: "Ver a todos",
        components: "Componentes de oficina",
        componentsIntro: "Mobiliario y elementos decorativos disponibles para sus oficinas.",
        browseComponents: "Explorar los componentes",
    },
    directory: {
        title: "Directorio",
        intro: "Las personas de {organization}.",
        search: "Buscar por nombre o correo electrónico",
        empty: "Nadie coincide con su búsqueda.",
        count: p({ zero: "Nadie", one: "{count} persona", other: "{count} personas" }),
    },
};
