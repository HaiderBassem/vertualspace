import type { Messages } from "../en";

/** Claves de la Room API y dominios personalizados de una organización. */
export const integrations: Messages["integrations"] = {
    apiKeysTitle: "Claves de la Room API",
    apiKeysIntro:
        "Las claves permiten que su propio software utilice la Room API de WorkAdventure (variables y eventos de las salas) en los mundos de esta organización.",
    apiKeysUsage:
        "Envíe la clave en el encabezado X-API-Key de las llamadas a la Room API. WorkAdventure la comprueba con este panel en cada llamada.",
    apiKeysEmpty: "Todavía no hay ninguna clave.",
    newKey: "Nueva clave",
    keyName: "Nombre",
    keyNameHelp: "Para qué sirve la clave, por ejemplo el nombre del software que la utiliza.",
    scope: "Alcance",
    scopeAll: "Todos los mundos de la organización",
    expiresAt: "Fecha de caducidad",
    expiresHelp: "Déjelo vacío para una clave que no caduque. La clave deja de funcionar al final de ese día (UTC).",
    createKey: "Crear la clave",
    keyCreated: "Copie esta clave ahora: no se volverá a mostrar.",
    key: "Clave",
    lastUsed: "Último uso",
    keyStatus: {
        active: "Activa",
        revoked: "Revocada",
        expired: "Caducada",
    },
    revokeTitle: "¿Revocar esta clave?",
    revokeDescription: "El software que la utiliza pierde de inmediato el acceso a la Room API.",
    keyRevoked: "Clave revocada.",

    domainsTitle: "Dominios",
    domainsIntro: "Dominios personalizados en los que se sirve WorkAdventure para esta organización.",
    domainsHowItWorks:
        "WorkAdventure pregunta a este panel si un dominio es legítimo antes de redirigir a las personas tras un inicio de sesión con OpenID Connect (GET /api/domain/verify) y obtiene el token de verificación de un dominio cuando se emite un certificado para él (GET /white-label/cf-challenge).",
    domainsEmpty: "Todavía no hay ningún dominio personalizado.",
    host: "Nombre de dominio",
    hostHelp: "Por ejemplo play.example.com. Se aceptan nombres de dominio internacionales.",
    addDomain: "Añadir el dominio",
    invalidHost: "Introduzca un nombre de dominio válido, sin https:// ni ruta.",
    hostTaken: "Este dominio ya está registrado.",
    challenge: "Token de verificación",
    challengeUrl: "URL de verificación",
    domainStatus: {
        verified: "Verificado",
        pending: "Pendiente de verificación",
    },
    verify: "Comprobar la prueba DNS",
    verifyTitle: "¿Marcar este dominio como verificado?",
    verifyDescription:
        "Para demostrar que esta organización controla el dominio, publique el registro DNS TXT siguiente y después compruébelo. WorkAdventure solo acepta el dominio cuando se encuentra el registro.",
    verified: "Dominio verificado.",
    removeTitle: "¿Quitar este dominio?",
    removeDescription: "WorkAdventure rechazará los inicios de sesión redirigidos a este dominio.",
    removed: "Dominio quitado.",
    verifyNoProof:
        "No se encontró el registro TXT {record} o no contiene el token de verificación. Los cambios de DNS pueden tardar un tiempo en propagarse.",
    verifyDnsError: "Falló la consulta DNS de {record}. Vuelva a intentarlo más tarde.",
    recordName: "Nombre del registro TXT",
    recordValue: "Valor del registro TXT",
};
