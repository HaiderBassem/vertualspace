import type { PluralMessage } from "../../index";
import type { Messages } from "../en";

const p = (forms: PluralMessage): PluralMessage => forms;

/** « Qui est là » : les personnes connectées aux mondes de l'organisation en ce moment (docs/PRESENCE.md). */
export const presence: Messages["presence"] = {
    nav: "Qui est là",
    title: "Qui est là",
    intro: "Les personnes connectées aux mondes de votre organisation en ce moment, telles que WorkAdventure les signale. La liste se met à jour toute seule toutes les 15 secondes.",
    privacy:
        "Seules les personnes autorisées à voir les membres voient cette page. Rien n'est enregistré, et une personne disparaît de la liste dès qu'elle s'en va.",
    online: p({ one: "{count} personne en ligne", other: "{count} personnes en ligne" }),
    signedIn: p({ one: "{count} connectée à son compte", other: "{count} connectées à leur compte" }),
    guests: p({ one: "{count} invité", other: "{count} invités" }),
    inWorld: p({ one: "{count} personne", other: "{count} personnes" }),
    updated: "Mise à jour",
    refreshing: "Mise à jour…",
    refreshFailed: "La liste n'a pas pu être mise à jour. Nouvel essai dans quelques secondes.",
    emptyTitle: "Personne n'est là pour le moment",
    emptyText:
        "Les personnes apparaissent ici quelques secondes après être entrées dans l'un de vos mondes. WorkAdventure ne les signale que s'il utilise ce serveur comme API d'administration.",
    columns: {
        person: "Personne",
        status: "Statut",
        since: "Depuis",
        account: "Membre",
    },
    signedInBadge: "Connectée",
    guestBadge: "Invité",
    memberPage: "Fiche du membre",
    notAMember: "Pas membre de ce monde",
    roomLabel: "Salle {room}",
    statuses: {
        online: "En ligne",
        away: "Absent",
        backInAMoment: "De retour dans un instant",
        busy: "Occupé",
        doNotDisturb: "Ne pas déranger",
        inMeeting: "En réunion",
        speaking: "Prend la parole",
        silent: "En silencieux",
        noProximity: "Ne prend pas de conversations",
    },
    onlineNow: "En ligne en ce moment",
};
