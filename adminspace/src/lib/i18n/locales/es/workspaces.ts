import type { PluralMessage } from "../../index";
import type { Messages } from "../en";

const p = (forms: PluralMessage): PluralMessage => forms;

/** Espacios de trabajo: agrupaciones de mundos de AdminSpace (departamentos, sedes), sus responsables y sus miembros. */
export const workspaces: Messages["workspaces"] = {
    defaultName: "Espacio de trabajo principal",
    title: "Espacios de trabajo",
    intro: "Un espacio de trabajo agrupa mundos, para un departamento o una sede. Sus responsables administran sus mundos; sus miembros pueden entrar en ellos. Las direcciones de WorkAdventure no cambian.",
    create: "Nuevo espacio de trabajo",
    createTitle: "Crear un espacio de trabajo",
    created: "Se ha creado el espacio de trabajo.",
    updated: "Se ha actualizado el espacio de trabajo.",
    empty: "Todavía no hay ningún espacio de trabajo.",
    showArchived: "Mostrar los espacios de trabajo archivados",
    archived: "Archivado",
    worldCount: p({ zero: "Ningún mundo", one: "{count} mundo", other: "{count} mundos" }),
    peopleCount: p({ zero: "Nadie asignado", one: "{count} persona", other: "{count} personas" }),
    fields: {
        name: "Nombre",
        slug: "Identificador de URL",
        description: "Descripción",
    },
    hints: {
        slug: "Solo se utiliza en las direcciones del panel de administración, no en WorkAdventure.",
        description: "Para qué sirve este espacio de trabajo, por ejemplo la oficina de París o el equipo comercial.",
    },
    detail: {
        worlds: "Mundos",
        worldsIntro:
            "Mundos de este espacio de trabajo. Un mundo que se mueve a otro espacio de trabajo conserva su dirección de WorkAdventure.",
        noWorlds: "Este espacio de trabajo todavía no tiene ningún mundo.",
        newWorld: "Nuevo mundo en este espacio de trabajo",
        people: "Responsables y miembros",
        peopleIntro:
            "Los responsables administran los mundos de este espacio de trabajo. Los miembros pueden entrar en ellos cuando el mundo está reservado a los miembros. Los administradores de la organización ya tienen acceso a todos los espacios de trabajo.",
        noPeople: "No hay nadie asignado a este espacio de trabajo.",
        assign: "Asignar a alguien",
        assignPerson: "Persona",
        assignRole: "Acceso",
        assignSubmit: "Asignar",
        assigned: "Acceso actualizado.",
        unassign: "Quitar el acceso",
        unassignTitle: "¿Quitar a {name} de este espacio de trabajo?",
        unassigned: "Se ha quitado el acceso.",
        notMember: "Esta persona no es miembro de la organización. Invítela primero.",
        settings: "Ajustes del espacio de trabajo",
    },
    archive: {
        action: "Archivar el espacio de trabajo",
        title: "¿Archivar {name}?",
        description:
            "Sus mundos activos también se archivan: WorkAdventure rechaza sus direcciones hasta que se restaure el espacio de trabajo. Al restaurarlo, vuelven exactamente estos mundos.",
        done: p({
            zero: "Se ha archivado el espacio de trabajo.",
            one: "Se han archivado el espacio de trabajo y {count} mundo.",
            other: "Se han archivado el espacio de trabajo y {count} mundos.",
        }),
        lastActive: "Una organización necesita al menos un espacio de trabajo activo.",
        restore: "Restaurar el espacio de trabajo",
        restored: p({
            zero: "Se ha restaurado el espacio de trabajo.",
            one: "Se han restaurado el espacio de trabajo y {count} mundo.",
            other: "Se han restaurado el espacio de trabajo y {count} mundos.",
        }),
    },
    remove: {
        action: "Eliminar el espacio de trabajo",
        title: "¿Eliminar {name}?",
        description:
            "Solo se puede eliminar un espacio de trabajo vacío. Sus asignaciones de acceso se eliminan con él.",
        notEmpty: "Primero mueva o elimine los mundos de este espacio de trabajo.",
        lastWorkspace: "Una organización necesita al menos un espacio de trabajo.",
        done: "Se ha eliminado el espacio de trabajo.",
    },
    move: {
        title: "Espacio de trabajo",
        intro: "El espacio de trabajo al que pertenece este mundo. Sus responsables administran el mundo.",
        submit: "Mover el mundo",
        done: "Se ha movido el mundo.",
    },
    pick: "Espacio de trabajo",
    pickHint:
        "Quién administra este mundo: los administradores de la organización y los responsables de este espacio de trabajo.",
};
