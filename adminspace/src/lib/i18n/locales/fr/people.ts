import type { PluralMessage } from "../../index";
import type { Messages } from "../en";

const p = (forms: PluralMessage): PluralMessage => forms;

/** Membres d'un monde et leurs étiquettes. */
export const people: Messages["people"] = {
    membersTitle: "Membres",
    tagsTitle: "Étiquettes",
    members: {
        description:
            "Toutes les personnes connues dans ce monde. Les membres ont été ajoutés par un administrateur ; les invités sont des personnes entrées sans avoir été ajoutées (les visiteurs anonymes sont identifiés par un UUID aléatoire, les personnes connectées par leur adresse e-mail).",
        searchLabel: "Rechercher par nom, adresse e-mail ou identifiant",
        kindFilter: "Type",
        tagFilter: "Étiquette",
        anyTag: "Toutes les étiquettes",
        departmentFilter: "Service",
        anyDepartment: "Tous les services",
        kinds: { member: "Membre", guest: "Invité" },
        columns: {
            person: "Personne",
            kind: "Type",
            tags: "Étiquettes",
            visits: "Visites",
            lastSeen: "Dernière visite",
            jobTitle: "Poste",
            department: "Service",
        },
        count: p({
            zero: "Personne",
            one: "{count} personne",
            other: "{count} personnes",
        }),
        empty: "Personne n'est encore entré dans ce monde.",
        anonymous: "Anonyme",
        add: "Ajouter un membre",
        addIntro:
            "Les membres sont identifiés par l'adresse e-mail avec laquelle ils se connectent à WorkAdventure. Dans un monde réservé aux membres, eux seuls peuvent entrer.",
        added: "Membre ajouté.",
        alreadyMember: "Cette personne est déjà membre du monde.",
        promoted: "Cet invité est désormais membre.",
        emailTaken: "Une autre personne de ce monde utilise déjà cette adresse e-mail.",
        tagsHelp: "Séparées par des virgules, par exemple admin, editor. Les étiquettes manquantes sont créées.",
        importTitle: "Importer des membres",
        importIntro:
            "Fichier CSV (UTF-8, RFC 4180) avec une ligne d'en-tête et les colonnes email, name et tags. Séparez plusieurs étiquettes par « ; » ou « | ». 5 000 lignes au maximum.",
        importProfileIntro:
            "Colonnes facultatives du profil professionnel\u00a0: job_title, department, manager_email et work_location. Une colonne absente du fichier laisse le champ tel quel, une cellule vide l'efface.",
        importFile: "Fichier CSV",
        importSubmit: "Importer",
        importResult: "{created} créé(s), {updated} mis à jour, {skipped} ignoré(s).",
        importLineError: "Ligne {line} : {error}",
        importErrors: {
            duplicateEmail: "cette adresse e-mail figure déjà sur une ligne précédente",
            invalidTag: "un nom d’étiquette est invalide (de 1 à 64 caractères, sans virgule)",
            reservedTag:
                "les étiquettes donnant des droits dans WorkAdventure ne peuvent être attribuées que par les personnes autorisées à gérer les étiquettes",
            unknownTag: "étiquette inconnue (seules les personnes autorisées à gérer les étiquettes peuvent en créer)",
            invalidEmail: "adresse e-mail invalide",
            missingEmail: "adresse e-mail manquante",
            missingHeader: "la ligne d'en-tête doit contenir une colonne « email »",
            tooManyRows: "trop de lignes",
            emptyFile: "le fichier est vide",
            fileTooLarge: "le fichier dépasse 1 Mo",
            managerNotFound: "le responsable n'est pas membre de l'organisation (colonnes du profil non appliquées)",
            managerIsSelf: "une personne ne peut pas être son propre responsable (colonnes du profil non appliquées)",
            managerCycle:
                "le responsable dépend, directement ou non, de cette personne (colonnes du profil non appliquées)",
            invalidManagerEmail: "adresse e-mail du responsable invalide",
        },
        export: "Exporter",
        exportCsv: "CSV (tableur)",
        exportJson: "JSON",
        previousPage: "Page précédente",
        nextPage: "Page suivante",
    },
    member: {
        erasedActiveBansKept: p({
            one: "{count} bannissement actif a été conservé pour qu’il continue de s’appliquer.",
            other: "{count} bannissements actifs ont été conservés pour qu’ils continuent de s’appliquer.",
        }),
        title: "Membre",
        identifier: "Identifiant WorkAdventure",
        identifierHelp:
            "Adresse e-mail pour les personnes connectées via OpenID Connect, UUID aléatoire pour les visiteurs anonymes.",
        visitCardUrl: "URL de la carte de visite",
        chatId: "Identifiant de discussion (Matrix)",
        locale: "Langue",
        visits: "Visites",
        firstSeen: "Connu depuis",
        lastSeen: "Dernière visite",
        kind: "Type",
        saved: "Membre mis à jour.",
        bans: "Bannissements",
        noBans: "Jamais banni.",
        reports: "Signalements concernant cette personne",
        noReports: "Aucun signalement.",
        ban: "Bannir du monde",
        banned: "Banni.",
        bannedAndKicked: "Banni et déconnecté de WorkAdventure.",
        exportData: "Exporter les données personnelles",
        exportHelp:
            "Tout ce que cette interface conserve sur la personne, au format JSON (droit d'accès, article 15 du RGPD).",
        erase: "Effacer",
        eraseTitle: "Effacer cette personne ?",
        eraseDescription:
            "Supprime le membre, ses étiquettes et son Woka enregistré (droit à l'effacement, article 17 du RGPD). Les bannissements et signalements sont conservés, car ils protègent d'autres personnes. Si la personne revient, elle apparaîtra comme un nouvel invité.",
        erased: "La personne a été effacée.",
        profile: {
            title: "Profil professionnel",
            intro: "Commun à tous les mondes de l'organisation.",
            jobTitle: "Poste",
            department: "Service",
            manager: "Responsable",
            managerHelp: "Adresse e-mail d'un autre membre de l'organisation. Laissez vide s'il n'y en a pas.",
            workLocation: "Lieu de travail",
            workLocationHelp: "Par exemple Bureau de Paris ou Télétravail.",
            save: "Enregistrer le profil",
            saved: "Profil mis à jour.",
            noEmail: "Seules les personnes ayant une adresse e-mail ont un profil professionnel.",
            reportsTo: "Rattaché à",
            directReports: "Collaborateurs directs",
            noManager: "Aucun responsable",
            noDirectReports: "Personne ne dépend de cette personne.",
            notSet: "Non renseigné",
            errors: {
                managerNotFound: "Ce responsable n'est pas membre de l'organisation.",
                managerIsSelf: "Une personne ne peut pas être son propre responsable.",
                managerCycle:
                    "Ce responsable dépend, directement ou non, de cette personne. Le changement créerait une boucle.",
            },
        },
    },
    tags: {
        description:
            "Les étiquettes donnent des droits dans WorkAdventure : « admin » permet de bannir d'autres personnes et d'utiliser l'éditeur de cartes, « editor » permet d'utiliser l'éditeur de cartes, et des salles ou des zones de cartes peuvent être réservées à certaines étiquettes.",
        empty: "Aucune étiquette pour le moment.",
        add: "Ajouter une étiquette",
        nameHelp: "Jusqu'à 64 caractères, sans virgule.",
        descriptionLabel: "Description",
        colorLabel: "Couleur",
        colorHelp: "Utilisée uniquement dans Adminspace, pour distinguer les étiquettes.",
        members: p({
            zero: "Aucun membre",
            one: "{count} membre",
            other: "{count} membres",
        }),
        created: "Étiquette créée.",
        saved: "Étiquette mise à jour.",
        nameTaken: "Une étiquette portant ce nom existe déjà.",
        invalidName: "Utilisez de 1 à 64 caractères, sans virgule.",
        deleteTitle: "Supprimer l'étiquette {name} ?",
        deleteDescription: "Elle est retirée de tous les membres. Les salles qui l'exigent continuent de l'exiger.",
        builtIn: "Utilisée par WorkAdventure",
        columns: {
            tag: "Étiquette",
            description: "Description",
            members: "Membres",
        },
    },
    tagErrors: {
        invalidTag: "Un nom d’étiquette est invalide : utilisez de 1 à 64 caractères, sans virgule.",
        reservedTag:
            "Seules les personnes autorisées à gérer les étiquettes peuvent attribuer ou retirer les étiquettes qui donnent des droits dans WorkAdventure, comme admin ou editor.",
        unknownTag:
            "Cette étiquette n’existe pas encore. Seules les personnes autorisées à gérer les étiquettes peuvent la créer.",
    },
};
