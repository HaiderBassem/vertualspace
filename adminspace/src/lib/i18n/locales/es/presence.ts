import type { PluralMessage } from "../../index";
import type { Messages } from "../en";

const p = (forms: PluralMessage): PluralMessage => forms;

/** «Quién está»: las personas conectadas ahora mismo a los mundos de la organización (docs/PRESENCE.md). */
export const presence: Messages["presence"] = {
    nav: "Quién está",
    title: "Quién está",
    intro: "Las personas conectadas ahora mismo a los mundos de su organización, tal como las informa WorkAdventure. La lista se actualiza sola cada 15 segundos.",
    privacy:
        "Solo las personas autorizadas a ver a los miembros ven esta página. No se registra nada: una persona desaparece de la lista en cuanto se va.",
    online: p({ zero: "Nadie en línea", one: "{count} persona en línea", other: "{count} personas en línea" }),
    signedIn: p({
        zero: "nadie con sesión iniciada",
        one: "{count} con sesión iniciada",
        other: "{count} con sesión iniciada",
    }),
    guests: p({ zero: "ningún invitado", one: "{count} invitado", other: "{count} invitados" }),
    inWorld: p({ one: "{count} persona", other: "{count} personas" }),
    updated: "Actualizado",
    refreshing: "Actualizando…",
    refreshFailed: "No se pudo actualizar la lista. Se volverá a intentar en unos segundos.",
    emptyTitle: "No hay nadie en este momento",
    emptyText:
        "Las personas aparecen aquí unos segundos después de entrar en uno de sus mundos. WorkAdventure solo las informa si usa este servidor como API de administración.",
    columns: {
        person: "Persona",
        status: "Estado",
        since: "Desde",
        account: "Miembro",
    },
    signedInBadge: "Con sesión iniciada",
    guestBadge: "Invitado",
    memberPage: "Ficha del miembro",
    notAMember: "No es miembro de este mundo",
    roomLabel: "Sala {room}",
    statuses: {
        online: "En línea",
        away: "Ausente",
        backInAMoment: "Vuelvo enseguida",
        busy: "Ocupado",
        doNotDisturb: "No molestar",
        inMeeting: "En una reunión",
        speaking: "Hablando",
        silent: "En silencio",
        noProximity: "No acepta conversaciones",
    },
    onlineNow: "En línea ahora",
};
