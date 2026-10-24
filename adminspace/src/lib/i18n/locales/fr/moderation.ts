import type { PluralMessage } from "../../index";
import type { Messages } from "../en";

const p = (forms: PluralMessage): PluralMessage => forms;

/** Bannissements et signalements. */
export const moderation: Messages["moderation"] = {
    title: "Modération",
    tabs: {
        bans: "Bannissements",
        reports: "Signalements",
    },
    bans: {
        description:
            "Les personnes bannies ne peuvent entrer dans aucune salle de ce monde. Les bannissements viennent des administrateurs dans WorkAdventure (personnes ayant l'étiquette admin) ou de cette interface d'administration.",
        filterActive: "Actifs",
        filterAll: "Tous, y compris levés et expirés",
        empty: "Aucun bannissement.",
        columns: {
            person: "Personne",
            ipAddress: "Adresse IP",
            reason: "Motif",
            by: "Banni par",
            since: "Depuis",
            until: "Jusqu'au",
            status: "Statut",
        },
        bannedByLine: "Banni par : {name}",
        status: {
            active: "Actif",
            revoked: "Levé",
            expired: "Expiré",
        },
        permanent: "Définitif",
        fromBackOffice: "Interface d'administration",
        create: "Bannir quelqu'un",
        target: "Personne",
        targetHelp: "Identifiant WorkAdventure ou adresse e-mail de la personne.",
        ipAddress: "Adresse IP",
        ipAddressHelp:
            "Facultatif. Bannit aussi cette adresse (IPv4 ou IPv6), afin qu'une autre identité ne puisse pas être utilisée.",
        invalidIp: "Saisissez une adresse IPv4 ou IPv6 valide.",
        targetRequired: "Indiquez un identifiant ou une adresse IP.",
        reason: "Motif",
        reasonHelp: "Affiché à la personne bannie.",
        duration: "Durée",
        durations: {
            permanent: "Définitif",
            hour: "1 heure",
            day: "24 heures",
            week: "7 jours",
            month: "30 jours",
        },
        created: "Bannissement enregistré.",
        createdAndKicked: "Bannissement enregistré, et la personne a été déconnectée de WorkAdventure.",
        revoke: "Lever",
        revokeTitle: "Lever ce bannissement ?",
        revokeDescription: "La personne pourra de nouveau entrer dans le monde.",
        revoked: "Bannissement levé.",
    },
    reports: {
        description:
            "Signalements envoyés depuis WorkAdventure (« Signaler cet utilisateur »). Examinez-les, puis traitez-les ou classez-les sans suite.",
        empty: "Aucun signalement.",
        filters: {
            open: "Ouverts",
            resolved: "Traités",
            dismissed: "Classés sans suite",
            all: "Tous",
        },
        status: {
            open: "Ouvert",
            resolved: "Traité",
            dismissed: "Classé sans suite",
        },
        count: p({
            zero: "Aucun signalement",
            one: "{count} signalement",
            other: "{count} signalements",
        }),
        reported: "Personne signalée",
        reporter: "Signalé par",
        room: "Salle",
        comment: "Commentaire",
        note: "Note de traitement",
        noteHelp: "Facultatif, visible uniquement par les administrateurs du monde.",
        noteLabel: "Note de traitement :",
        resolve: "Traiter",
        dismiss: "Classer sans suite",
        reopen: "Rouvrir",
        handledBy: "Traité {date}",
        updated: "Signalement mis à jour.",
        banReported: "Bannir la personne signalée",
        banReportedTitle: "Bannir la personne signalée ?",
        banReportedDescription: "Elle ne pourra plus entrer dans ce monde, et le signalement sera marqué comme traité.",
        banReason: "Signalé par une autre personne : {comment}",
    },
    liveDisconnect: {
        banSaved: "Bannissement enregistré. Déconnexion immédiate : {outcome}",
        banSavedOnly: "Bannissement enregistré.",
        outcomes: {
            sent: "demandée à WorkAdventure.",
            notConfigured:
                "indisponible, car la connexion en direct avec WorkAdventure n’est pas configurée. La personne sera refusée à sa prochaine connexion.",
            unreachable:
                "échouée, car WorkAdventure est injoignable. La personne sera refusée à sa prochaine connexion.",
            rejected:
                "refusée par WorkAdventure (vérifiez ADMIN_SOCKETS_TOKEN). La personne sera refusée à sa prochaine connexion.",
            notApplicable:
                "impossible pour un bannissement portant uniquement sur une adresse IP. L’adresse sera refusée à sa prochaine connexion.",
        },
    },
};
