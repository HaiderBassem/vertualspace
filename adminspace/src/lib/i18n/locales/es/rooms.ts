import type { PluralMessage } from "../../index";
import type { Messages } from "../en";

const p = (forms: PluralMessage): PluralMessage => forms;

/** Salas de un mundo y los mapas que cargan. */
export const rooms: Messages["rooms"] = {
    title: "Salas",
    description:
        "Cada sala carga un mapa. Su URL es la URL del mundo seguida del identificador de la sala, y las personas pasan de una sala a otra mediante esa URL o mediante las salidas dibujadas en los mapas.",
    newRoom: "Nueva sala",
    editRoom: "Editar la sala",
    empty: "Este mundo todavía no tiene ninguna sala. Cree una para que las personas puedan entrar.",
    columns: {
        name: "Sala",
        map: "Mapa",
        access: "Acceso",
        online: "Conectados ahora",
    },
    defaultBadge: "Predeterminada",
    defaultHelp: "Las personas que abren la URL del mundo sin nombre de sala llegan a la sala predeterminada.",
    setDefault: "Convertir en predeterminada",
    moveUp: "Subir",
    moveDown: "Bajar",
    everyone: "Todo el mundo",
    restrictedTo: "Etiquetas: {tags}",
    online: p({ zero: "Nadie", one: "{count} persona", other: "{count} personas" }),
    occupancyUnavailable: "La ocupación no está disponible: no se ha podido contactar con WorkAdventure.",
    reload: "Recargar para todos",
    reloadTitle: "¿Recargar esta sala para todos?",
    reloadDescription:
        "Se pide a todas las personas que están en la sala que la recarguen, por ejemplo después de cambiar su mapa.",
    reloaded: "Se ha pedido a todas las personas de la sala que la recarguen.",
    deleteTitle: "¿Eliminar esta sala?",
    deleteDescription:
        "Los enlaces a esta sala mostrarán un error. El archivo del mapa no se elimina del lugar donde está alojado.",
    created: "Sala creada.",
    fields: {
        name: "Nombre",
        slug: "Identificador de la sala",
        slugHelp: "Letras minúsculas, cifras, guiones, guiones bajos y barras (por ejemplo planta-1/reunion).",
        description: "Descripción",
        mapKind: "Tipo de mapa",
        mapKindWam: "Mapa de map-storage (.wam), editable con el editor de mapas de WorkAdventure",
        mapKindTmj: "Mapa de Tiled (.tmj o .json) alojado en cualquier servidor web",
        wamUrl: "URL del archivo WAM",
        wamUrlHelp: "URL del archivo .wam en el map-storage de WorkAdventure.",
        mapUrl: "URL del mapa de Tiled",
        mapUrlHelp:
            "URL pública del archivo del mapa de Tiled. Sus tilesets deben ser accesibles desde el mismo lugar.",
        requiredTags: "Etiquetas necesarias para entrar",
        requiredTagsHelp:
            "Separadas por comas. Si se indican, solo pueden entrar los miembros que tengan al menos una de estas etiquetas (o la etiqueta admin).",
        thumbnailUrl: "URL de la miniatura",
        isDefault: "Sala predeterminada del mundo",
    },
    mapStorage: {
        title: "Mapas encontrados en map-storage",
        use: "Usar este mapa",
        notConfigured: "Configure las URL de map-storage en los ajustes de la instancia para explorar sus mapas aquí.",
        unreachable: "No se ha podido contactar con map-storage. Aun así, puede escribir la URL del mapa.",
        none: "Map-storage todavía no contiene ningún mapa.",
    },
    mapWarning:
        "El mapa de la sala {slug} no respondió. WorkAdventure no podrá cargar la sala mientras su mapa no esté accesible.",
    checkMap: "Comprobar el mapa",
    mapCheck: {
        ok: "El mapa responde (HTTP {status}).",
        unreachable: "No se pudo acceder al mapa.",
        httpError: "El mapa respondió con un error (HTTP {status}).",
        notChecked: "No comprobado: el mapa está en una dirección de red privada.",
    },
    mapProblems: {
        extensionWam: "Un mapa del map-storage debe ser un archivo .wam.",
        extensionTmj: "Un mapa de Tiled debe ser un archivo .tmj o .json.",
        otherOrganization: "Este mapa pertenece a otra organización y no se puede usar aquí.",
    },
};
