import type { PluralMessage } from "../../index";
import type { Messages } from "../en";

const p = (forms: PluralMessage): PluralMessage => forms;

/** Organisations : liste, création, paramètres, équipe (administrateurs de l'interface). */
export const organizations: Messages["organizations"] = {
    title: "Organisations",
    intro: "Une organisation regroupe des mondes et les personnes qui les administrent.",
    create: "Nouvelle organisation",
    createTitle: "Créer une organisation",
    createIntro: "Vous en serez le propriétaire. Vous pourrez ajouter d'autres administrateurs ensuite.",
    createNotAllowed: "Seuls les administrateurs de la plateforme peuvent créer des organisations sur cette instance.",
    created: "L'organisation a été créée.",
    empty: "Vous n'êtes membre d'aucune organisation pour le moment.",
    worldCount: p({ zero: "Aucun monde", one: "{count} monde", other: "{count} mondes" }),
    fields: {
        name: "Nom",
        slug: "Identifiant d'URL",
        country: "Pays",
        defaultLocale: "Langue par défaut",
        contactEmail: "Adresse e-mail de contact",
    },
    hints: {
        slug: "Apparaît dans l'adresse de chaque monde : /@/{slug}/…",
        country: "Pays où l'organisation est établie (ISO 3166-1).",
        defaultLocale: "Langue proposée pour les contenus créés pour cette organisation.",
        contactEmail: "Personne à contacter au sujet de cette organisation.",
    },
    noCountry: "Non précisé",
    worlds: {
        title: "Mondes",
        newWorld: "Nouveau monde",
        empty: "Cette organisation n'a pas encore de monde.",
        showArchived: "Afficher les mondes archivés",
        columns: {
            world: "Monde",
            access: "Accès",
            state: "État",
            created: "Créé le",
        },
    },
    settings: {
        title: "Paramètres de l'organisation",
        intro: "Identité et coordonnées de l'organisation.",
        slugReadOnly: "L'identifiant d'URL ne peut pas être modifié : cela casserait l'adresse de chaque monde.",
        dangerZone: "Zone de danger",
        deleteTitle: "Supprimer cette organisation",
        deleteDescription:
            "Supprime tous ses mondes, salles, membres, bannissements, signalements et clés d'API. WorkAdventure refusera toutes les adresses de ces mondes. Cette action est irréversible.",
    },
    team: {
        addRequested:
            "Si un compte utilise cette adresse e-mail, il fait maintenant partie de l’équipe avec ce rôle. Les invitations par e-mail ne sont pas disponibles : si besoin, demandez d’abord à un super-administrateur de créer le compte.",
        title: "Équipe",
        intro: "Personnes qui peuvent administrer cette organisation dans Adminspace, et ce qu'elles sont autorisées à faire.",
        add: "Ajouter un administrateur",
        addIntro:
            "La personne doit avoir un compte Adminspace. Si nécessaire, demandez à un administrateur de la plateforme d'en créer un.",
        accountNotFound: "Aucun compte n'utilise cette adresse e-mail.",
        alreadyMember: "Cette personne fait déjà partie de l'équipe.",
        lastOwner: "Une organisation doit avoir au moins un propriétaire.",
        added: "L'administrateur a été ajouté.",
        roleChanged: "Le rôle a été modifié.",
        removed: "L'administrateur a été retiré.",
        remove: "Retirer",
        removeTitle: "Retirer {name} de l'équipe ?",
        removeDescription: "Cette personne perdra l'accès à cette organisation dans Adminspace.",
        you: "vous",
        rolesTitle: "Rôles",
        columns: {
            person: "Personne",
            role: "Rôle",
            since: "Membre depuis",
            lastLogin: "Dernière connexion",
        },
    },
    audit: {
        title: "Journal d'audit",
        intro: "Toutes les modifications faites dans cette organisation, par ses administrateurs ou par WorkAdventure (bannissements, signalements). Les heures sont affichées dans votre fuseau horaire.",
        filterAction: "Action commençant par",
        empty: "Aucune entrée.",
        columns: {
            time: "Heure",
            actor: "Par",
            action: "Action",
            target: "Cible",
            ip: "Adresse IP",
            details: "Détails",
        },
    },
};
