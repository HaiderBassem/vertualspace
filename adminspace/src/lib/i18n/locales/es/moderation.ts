import type { PluralMessage } from "../../index";
import type { Messages } from "../en";

const p = (forms: PluralMessage): PluralMessage => forms;

/** Bloqueos y reportes de usuarios. */
export const moderation: Messages["moderation"] = {
    title: "Moderación",
    tabs: {
        bans: "Bloqueos",
        reports: "Reportes",
    },
    bans: {
        description:
            "Las personas bloqueadas no pueden entrar en ninguna sala de este mundo. Los bloqueos los aplican los administradores desde WorkAdventure (personas con la etiqueta admin) o desde este panel.",
        filterActive: "Activos",
        filterAll: "Todos, incluidos los levantados y caducados",
        empty: "Ningún bloqueo.",
        columns: {
            person: "Persona",
            ipAddress: "Dirección IP",
            reason: "Motivo",
            by: "Bloqueado por",
            since: "Desde",
            until: "Hasta",
            status: "Estado",
        },
        bannedByLine: "Bloqueado por: {name}",
        status: {
            active: "Activo",
            revoked: "Levantado",
            expired: "Caducado",
        },
        permanent: "Permanente",
        fromBackOffice: "Panel de administración",
        create: "Bloquear a alguien",
        target: "Persona",
        targetHelp: "Identificador de WorkAdventure o dirección de correo electrónico de la persona.",
        ipAddress: "Dirección IP",
        ipAddressHelp:
            "Opcional. Bloquea también esta dirección (IPv4 o IPv6), para que no se pueda usar otra identidad.",
        invalidIp: "Introduzca una dirección IPv4 o IPv6 válida.",
        targetRequired: "Indique un identificador o una dirección IP.",
        reason: "Motivo",
        reasonHelp: "Se muestra a la persona bloqueada.",
        duration: "Duración",
        durations: {
            permanent: "Permanente",
            hour: "1 hora",
            day: "24 horas",
            week: "7 días",
            month: "30 días",
        },
        created: "Bloqueo registrado.",
        createdAndKicked: "Bloqueo registrado y la persona ha sido desconectada de WorkAdventure.",
        revoke: "Levantar",
        revokeTitle: "¿Levantar este bloqueo?",
        revokeDescription: "La persona podrá volver a entrar en el mundo.",
        revoked: "Bloqueo levantado.",
    },
    reports: {
        description:
            "Reportes enviados por personas desde WorkAdventure («Reportar a este usuario»). Revíselos y, después, resuélvalos o descártelos.",
        empty: "Ningún reporte.",
        filters: {
            open: "Abiertos",
            resolved: "Resueltos",
            dismissed: "Descartados",
            all: "Todos",
        },
        status: {
            open: "Abierto",
            resolved: "Resuelto",
            dismissed: "Descartado",
        },
        count: p({ zero: "Ningún reporte", one: "{count} reporte", other: "{count} reportes" }),
        reported: "Persona reportada",
        reporter: "Reportado por",
        room: "Sala",
        comment: "Comentario",
        note: "Nota de resolución",
        noteHelp: "Opcional, visible solo para los administradores del mundo.",
        noteLabel: "Nota de resolución:",
        resolve: "Resolver",
        dismiss: "Descartar",
        reopen: "Volver a abrir",
        handledBy: "Gestionado {date}",
        updated: "Reporte actualizado.",
        banReported: "Bloquear a la persona reportada",
        banReportedTitle: "¿Bloquear a la persona reportada?",
        banReportedDescription: "Ya no podrá entrar en este mundo y el reporte se marcará como resuelto.",
        banReason: "Reportado por otra persona: {comment}",
    },
    liveDisconnect: {
        banSaved: "Bloqueo guardado. Desconexión inmediata: {outcome}",
        banSavedOnly: "Bloqueo guardado.",
        outcomes: {
            sent: "solicitada a WorkAdventure.",
            notConfigured:
                "no disponible, porque la conexión en directo con WorkAdventure no está configurada. La persona será rechazada en su próxima conexión.",
            unreachable:
                "fallida, porque no se pudo contactar con WorkAdventure. La persona será rechazada en su próxima conexión.",
            rejected:
                "rechazada por WorkAdventure (compruebe ADMIN_SOCKETS_TOKEN). La persona será rechazada en su próxima conexión.",
            notApplicable:
                "imposible para un bloqueo que solo afecta a una dirección IP. La dirección será rechazada en su próxima conexión.",
        },
    },
};
