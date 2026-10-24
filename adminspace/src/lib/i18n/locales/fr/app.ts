import type { Messages } from "../en";

/** Structure de l’application : navigation, sélecteur d’organisation, menu du compte, bandeau d’accès du support. */
export const app: Messages["app"] = {
    sections: {
        organization: "Organisation",
        administration: "Administration",
        platform: "Plateforme",
    },
    nav: {
        overview: "Vue d’ensemble",
        home: "Accueil",
        workspaces: "Espaces de travail",
        people: "Personnes",
        directory: "Annuaire",
        components: "Composants",
        apiKeys: "Clés de l’API Room",
        domains: "Domaines",
        audit: "Journal d’audit",
        settings: "Paramètres",
    },
    platformNav: {
        overview: "Centre de contrôle",
        organizations: "Organisations",
        accounts: "Comptes",
        components: "Catalogue de composants",
        avatars: "Catalogue d’avatars",
        jobs: "Tâches en arrière-plan",
        email: "Envoi des e-mails",
        settings: "Paramètres de l’instance",
        audit: "Journal d’audit",
    },
    switcher: {
        label: "Changer d’organisation",
        yourOrganizations: "Vos organisations",
        support: "Accès du support",
        create: "Créer une organisation",
        none: "Vous n’appartenez encore à aucune organisation.",
        choose: "Choisir une organisation",
        suspended: "Suspendue",
    },
    account: {
        menu: "Menu du compte",
        settings: "Paramètres du compte",
        signOut: "Se déconnecter",
    },
    support: {
        banner: "Accès du support à {organization} jusqu’à {time}. Motif : {reason}",
        end: "Mettre fin à l’accès du support",
    },
    errorPage: {
        notFoundTitle: "Page introuvable",
        forbiddenTitle: "Accès refusé",
        suspendedTitle: "Organisation suspendue",
        suspended:
            "Cette organisation a été suspendue par les administrateurs de la plateforme. Ses mondes sont fermés jusqu’à sa réactivation.",
        rateLimitedTitle: "Trop de requêtes",
        errorTitle: "Une erreur s’est produite",
        requestId: "Référence : {id}",
        home: "Aller à la page d’accueil",
    },
    breadcrumbs: "Fil d’Ariane",
    openMenu: "Ouvrir la navigation",
    closeMenu: "Fermer la navigation",
};
