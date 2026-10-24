import type { Messages } from "../en";

/** Textes affichés aux joueurs sur les écrans d'erreur de WorkAdventure, renvoyés par l'API d'administration. */
export const workadventure: Messages["workadventure"] = {
    errorTitle: "Accès refusé",
    roomNotFound: {
        subtitle: "Cette salle n'existe pas.",
        details: "Vérifiez le lien que vous avez suivi, ou demandez-en un nouveau aux personnes qui vous ont invité.",
    },
    worldNotFound: {
        subtitle: "Ce monde n'existe pas.",
        details: "Vérifiez le lien que vous avez suivi, ou demandez-en un nouveau aux personnes qui vous ont invité.",
    },
    worldArchived: {
        subtitle: "Ce monde est fermé.",
        details: "Ses administrateurs l'ont archivé. Contactez-les si vous pensez qu'il s'agit d'une erreur.",
    },
    worldExpired: {
        subtitle: "Ce monde a expiré.",
        details: "Contactez ses administrateurs pour qu'ils le rouvrent.",
    },
    organizationSuspended: {
        subtitle: "Ce monde n’est pas disponible.",
        details: "Son organisation a été suspendue par les administrateurs de la plateforme.",
    },
    roomPreparing: {
        subtitle: "Cette salle est en cours de préparation.",
        details: "Sa carte est en cours de publication. Réessayez dans une minute.",
    },
    invalidUrl: {
        subtitle: "Cette adresse ne correspond à aucune salle WorkAdventure.",
        details: "Vérifiez le lien que vous avez suivi.",
    },
    banned: {
        subtitle: "Vous avez été banni de ce monde.",
        details: "Motif : {reason}",
    },
    membersOnly: {
        subtitle: "Ce monde est réservé à ses membres.",
        details:
            "Connectez-vous avec le compte qui a été invité, ou demandez une invitation aux administrateurs du monde.",
        button: "Se déconnecter",
    },
    loginRequired: {
        subtitle: "Vous devez vous connecter pour entrer dans ce monde.",
        details: "Connectez-vous pour continuer.",
        button: "Se connecter",
    },
    tagRequired: {
        subtitle: "Vous ne pouvez pas entrer dans cette salle.",
        details: "L'accès à cette salle est restreint. Demandez l'accès aux administrateurs du monde si nécessaire.",
        button: "Se déconnecter",
    },
    worldFull: {
        title: "Monde complet",
        subtitle: "Ce monde a atteint son nombre maximal de personnes.",
        details: "Une nouvelle tentative sera faite automatiquement dans quelques instants.",
        button: "Réessayer",
    },
    banNotAllowed: {
        subtitle: "Vous n'êtes pas autorisé à bannir des personnes dans ce monde.",
        details: "Seuls les administrateurs du monde peuvent bannir des personnes.",
    },
    defaultBanReason: "Aucun motif indiqué.",
};
