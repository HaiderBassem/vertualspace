import type { PluralMessage } from "../../index";
import type { Messages } from "../en";

const p = (forms: PluralMessage): PluralMessage => forms;

/** Espaces de travail : regroupements de mondes dans AdminSpace (services, sites), leurs responsables et leurs membres. */
export const workspaces: Messages["workspaces"] = {
    defaultName: "Espace de travail principal",
    title: "Espaces de travail",
    intro: "Un espace de travail regroupe des mondes, pour un service ou un site. Ses responsables administrent ses mondes ; ses membres peuvent y entrer. Les adresses WorkAdventure ne changent pas.",
    create: "Nouvel espace de travail",
    createTitle: "Créer un espace de travail",
    created: "L’espace de travail a été créé.",
    updated: "L’espace de travail a été mis à jour.",
    empty: "Aucun espace de travail pour le moment.",
    showArchived: "Afficher les espaces de travail archivés",
    archived: "Archivé",
    worldCount: p({ zero: "Aucun monde", one: "{count} monde", other: "{count} mondes" }),
    peopleCount: p({ zero: "Aucune personne affectée", one: "{count} personne", other: "{count} personnes" }),
    fields: {
        name: "Nom",
        slug: "Identifiant d’URL",
        description: "Description",
    },
    hints: {
        slug: "Utilisé uniquement dans les adresses de l’interface d’administration, pas dans WorkAdventure.",
        description: "La vocation de cet espace de travail, par exemple le bureau de Paris ou l’équipe commerciale.",
    },
    detail: {
        worlds: "Mondes",
        worldsIntro:
            "Mondes de cet espace de travail. Déplacer un monde vers un autre espace de travail conserve son adresse WorkAdventure.",
        noWorlds: "Cet espace de travail n’a pas encore de monde.",
        newWorld: "Nouveau monde dans cet espace de travail",
        people: "Responsables et membres",
        peopleIntro:
            "Les responsables administrent les mondes de cet espace de travail. Les membres peuvent y entrer lorsque le monde est réservé aux membres. Les administrateurs de l’organisation ont déjà accès à tous les espaces de travail.",
        noPeople: "Personne n’est affecté à cet espace de travail.",
        assign: "Affecter une personne",
        assignPerson: "Personne",
        assignRole: "Accès",
        assignSubmit: "Affecter",
        assigned: "Accès mis à jour.",
        unassign: "Retirer l’accès",
        unassignTitle: "Retirer {name} de cet espace de travail ?",
        unassigned: "Accès retiré.",
        notMember: "Cette personne n’est pas membre de l’organisation. Invitez-la d’abord.",
        settings: "Paramètres de l’espace de travail",
    },
    archive: {
        action: "Archiver l’espace de travail",
        title: "Archiver {name} ?",
        description:
            "Ses mondes actifs sont également archivés : WorkAdventure refuse leurs adresses jusqu’à la restauration de l’espace de travail. La restauration rétablit exactement ces mondes.",
        done: p({
            zero: "L’espace de travail a été archivé.",
            one: "L’espace de travail et {count} monde ont été archivés.",
            other: "L’espace de travail et {count} mondes ont été archivés.",
        }),
        lastActive: "Une organisation doit avoir au moins un espace de travail actif.",
        restore: "Restaurer l’espace de travail",
        restored: p({
            zero: "L’espace de travail a été restauré.",
            one: "L’espace de travail et {count} monde ont été restaurés.",
            other: "L’espace de travail et {count} mondes ont été restaurés.",
        }),
    },
    remove: {
        action: "Supprimer l’espace de travail",
        title: "Supprimer {name} ?",
        description:
            "Seul un espace de travail vide peut être supprimé. Ses affectations d’accès sont supprimées avec lui.",
        notEmpty: "Déplacez ou supprimez d’abord les mondes de cet espace de travail.",
        lastWorkspace: "Une organisation doit avoir au moins un espace de travail.",
        done: "L’espace de travail a été supprimé.",
    },
    move: {
        title: "Espace de travail",
        intro: "L’espace de travail auquel appartient ce monde. Ses responsables administrent le monde.",
        submit: "Déplacer le monde",
        done: "Le monde a été déplacé.",
    },
    pick: "Espace de travail",
    pickHint:
        "Qui administre ce monde : les administrateurs de l’organisation et les responsables de cet espace de travail.",
};
