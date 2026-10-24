import type { PluralMessage } from "../../index";
import type { Messages } from "../en";

const p = (forms: PluralMessage): PluralMessage => forms;

/** Accueil de l’organisation : vue d’ensemble des administrateurs, espace des employés et annuaire. */
export const home: Messages["home"] = {
    joined: "Bienvenue ! Vous êtes désormais membre de {organization}.",
    overview: {
        title: "Vue d’ensemble",
        intro: "L’état de votre organisation en un coup d’œil.",
        stats: {
            workspaces: "Espaces de travail",
            worlds: "Mondes",
            rooms: "Salles",
            people: "Personnes",
            pendingInvitations: "Invitations en attente",
        },
        setup: "Terminer la configuration",
        setupProgress: "Terminé : {done} sur {total}",
        worldsTitle: "Mondes",
        worldsIntro: "Bureaux virtuels dans WorkAdventure. Chacun appartient à un espace de travail.",
        workspaceColumn: "Espace de travail",
        activity: "Activité récente",
        activityEmpty: "Il ne s’est encore rien passé.",
        allActivity: "Voir le journal d’audit",
        newWorld: "Nouveau monde",
        invite: "Inviter des personnes",
    },
    employee: {
        greeting: "Bienvenue, {name}",
        intro: "Vos bureaux dans {organization}, vos collègues et les composants partagés.",
        offices: "Vos bureaux",
        officesIntro:
            "Ouvrez un bureau dans WorkAdventure. Connectez-vous-y avec {email} pour être reconnu comme membre.",
        noOffices: "Vous n’avez encore accès à aucun bureau.",
        noOfficesHint: "Un administrateur de votre organisation peut vous donner accès à un espace de travail.",
        enter: "Entrer",
        rooms: p({ zero: "Aucune salle pour le moment", one: "{count} salle", other: "{count} salles" }),
        unavailable: "L’adresse de WorkAdventure n’est pas configurée sur cette plateforme.",
        teammates: "Collègues",
        allTeammates: "Voir tout le monde",
        components: "Composants de bureau",
        componentsIntro: "Mobilier et décorations disponibles pour vos bureaux.",
        browseComponents: "Parcourir les composants",
    },
    directory: {
        title: "Annuaire",
        intro: "Les personnes de {organization}.",
        search: "Rechercher par nom ou adresse e-mail",
        empty: "Personne ne correspond à votre recherche.",
        count: p({ zero: "Personne", one: "{count} personne", other: "{count} personnes" }),
    },
};
