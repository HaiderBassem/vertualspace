import type { PluralMessage } from "../../index";
import type { Messages } from "../en";

const p = (forms: PluralMessage): PluralMessage => forms;

/** Fréquentation en direct d'un monde et messages diffusés dans ses salles. */
export const live: Messages["live"] = {
    title: "En direct",
    description: "Qui est dans le monde en ce moment, et messages affichés à tout le monde dans ses salles.",
    total: p({
        zero: "Personne en ligne",
        one: "{count} personne en ligne",
        other: "{count} personnes en ligne",
    }),
    perRoom: "En ligne par salle",
    unavailable:
        "Impossible de joindre WorkAdventure. Vérifiez l'URL de jeu et l'URL interne du pusher dans les paramètres de l'instance.",
    updatedAt: "Mis à jour {time}",
    broadcast: {
        title: "Diffuser un message",
        intro: "WorkAdventure transmet le message à toutes les personnes présentes dans les salles choisies. Certaines versions de WorkAdventure reçoivent ces messages sans les afficher : consultez le guide d'intégration.",
        message: "Message",
        target: "Envoyer à",
        allRooms: "Toutes les salles du monde",
        send: "Envoyer",
        sent: "Message transmis à WorkAdventure.",
        failed: "Le message n'a pas pu être distribué : impossible de joindre WorkAdventure.",
    },
    people: {
        title: "Personnes connectées",
        connecting: "Connexion à WorkAdventure…",
        connected: "En direct : la liste se met à jour à mesure que les personnes arrivent et repartent.",
        disconnected: "Déconnecté de WorkAdventure.",
        reconnect: "Se reconnecter",
        empty: "Personne n'est connecté.",
        notConfigured:
            "Pour voir en temps réel qui est connecté, donnez le même secret aléatoire au service play de WorkAdventure (ADMIN_SOCKETS_TOKEN) et à cette interface (ADMIN_SOCKETS_TOKEN dans son .env), puis redémarrez les deux.",
        columns: {
            name: "Nom",
            room: "Salle",
            ipAddress: "Adresse IP",
        },
    },
};
