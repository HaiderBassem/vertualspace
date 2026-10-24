import type { PluralMessage } from "../../index";
import type { Messages } from "../en";

const p = (forms: PluralMessage): PluralMessage => forms;

/** Ocupación en directo de un mundo y mensajes difundidos en sus salas. */
export const live: Messages["live"] = {
    title: "En directo",
    description: "Quién está en el mundo ahora mismo y mensajes mostrados a todas las personas de sus salas.",
    total: p({
        zero: "Nadie conectado",
        one: "{count} persona conectada",
        other: "{count} personas conectadas",
    }),
    perRoom: "Conectados por sala",
    unavailable:
        "No se ha podido contactar con WorkAdventure. Revise la URL de juego y la URL interna del pusher en los ajustes de la instancia.",
    updatedAt: "Actualizado {time}",
    broadcast: {
        title: "Difundir un mensaje",
        intro: "WorkAdventure entrega el mensaje a todas las personas que estén en este momento en las salas elegidas. Algunas versiones de WorkAdventure reciben estos mensajes sin mostrarlos: consulte la guía de integración.",
        message: "Mensaje",
        target: "Enviar a",
        allRooms: "Todas las salas del mundo",
        send: "Enviar",
        sent: "Mensaje entregado a WorkAdventure.",
        failed: "No se ha podido entregar el mensaje: no se ha podido contactar con WorkAdventure.",
    },
    people: {
        title: "Personas conectadas",
        connecting: "Conectando con WorkAdventure…",
        connected: "En directo: la lista se actualiza a medida que las personas entran y salen.",
        disconnected: "Desconectado de WorkAdventure.",
        reconnect: "Volver a conectar",
        empty: "Nadie conectado.",
        notConfigured:
            "Para ver en tiempo real quién está conectado, asigne el mismo secreto aleatorio al servicio play de WorkAdventure (ADMIN_SOCKETS_TOKEN) y a este panel (ADMIN_SOCKETS_TOKEN en su .env) y, después, reinicie ambos.",
        columns: {
            name: "Nombre",
            room: "Sala",
            ipAddress: "Dirección IP",
        },
    },
};
