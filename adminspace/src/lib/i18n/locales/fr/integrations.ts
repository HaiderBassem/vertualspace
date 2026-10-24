import type { Messages } from "../en";

/** Clés de l'API Room et domaines personnalisés d'une organisation. */
export const integrations: Messages["integrations"] = {
    apiKeysTitle: "Clés de l'API Room",
    apiKeysIntro:
        "Les clés permettent à vos propres logiciels d'utiliser l'API Room de WorkAdventure (variables et événements des salles) dans les mondes de cette organisation.",
    apiKeysUsage:
        "Envoyez la clé dans l'en-tête X-API-Key des appels à l'API Room. WorkAdventure la vérifie auprès de cette interface à chaque appel.",
    apiKeysEmpty: "Aucune clé pour le moment.",
    newKey: "Nouvelle clé",
    keyName: "Nom",
    keyNameHelp: "À quoi sert la clé, par exemple le nom du logiciel qui l'utilise.",
    scope: "Portée",
    scopeAll: "Tous les mondes de l'organisation",
    expiresAt: "Date d'expiration",
    expiresHelp: "Laissez vide pour une clé sans expiration. La clé cesse de fonctionner à la fin de ce jour (UTC).",
    createKey: "Créer la clé",
    keyCreated: "Copiez cette clé maintenant : elle ne sera plus jamais affichée.",
    key: "Clé",
    lastUsed: "Dernière utilisation",
    keyStatus: {
        active: "Active",
        revoked: "Révoquée",
        expired: "Expirée",
    },
    revokeTitle: "Révoquer cette clé ?",
    revokeDescription: "Les logiciels qui l'utilisent perdent immédiatement l'accès à l'API Room.",
    keyRevoked: "Clé révoquée.",

    domainsTitle: "Domaines",
    domainsIntro: "Domaines personnalisés sur lesquels WorkAdventure est servi pour cette organisation.",
    domainsHowItWorks:
        "WorkAdventure demande à cette interface si un domaine est légitime avant de rediriger les personnes après une connexion OpenID Connect (GET /api/domain/verify), et récupère le jeton de vérification d'un domaine lorsqu'un certificat est émis pour celui-ci (GET /white-label/cf-challenge).",
    domainsEmpty: "Aucun domaine personnalisé pour le moment.",
    host: "Nom de domaine",
    hostHelp: "Par exemple play.example.com. Les noms de domaine internationalisés sont acceptés.",
    addDomain: "Ajouter le domaine",
    invalidHost: "Saisissez un nom de domaine valide, sans https:// ni chemin.",
    hostTaken: "Ce domaine est déjà enregistré.",
    challenge: "Jeton de vérification",
    challengeUrl: "URL de vérification",
    domainStatus: {
        verified: "Vérifié",
        pending: "Vérification en attente",
    },
    verify: "Vérifier la preuve DNS",
    verifyTitle: "Marquer ce domaine comme vérifié ?",
    verifyDescription:
        "Pour prouver que cette organisation contrôle le domaine, publiez l’enregistrement DNS TXT ci-dessous, puis vérifiez-le. WorkAdventure n’accepte le domaine qu’une fois l’enregistrement trouvé.",
    verified: "Domaine vérifié.",
    removeTitle: "Retirer ce domaine ?",
    removeDescription: "WorkAdventure refusera les connexions redirigées vers ce domaine.",
    removed: "Domaine retiré.",
    verifyNoProof:
        "L’enregistrement TXT {record} est introuvable ou ne contient pas le jeton de vérification. Les modifications DNS peuvent mettre un certain temps à se propager.",
    verifyDnsError: "La recherche DNS de {record} a échoué. Réessayez plus tard.",
    recordName: "Nom de l’enregistrement TXT",
    recordValue: "Valeur de l’enregistrement TXT",
};
