import type { Messages } from "../en";
import type { PluralMessage } from "../../index";

const p = (forms: PluralMessage): PluralMessage => forms;

/** Navigation, rôles, authentification et paramètres du compte personnel. */
export const shell: Messages["shell"] = {
    nav: {
        main: "Navigation principale",
        myWorlds: "Mes mondes",
        organizations: "Organisations",
        platform: "Plateforme",
        account: "Mon compte",
        world: {
            overview: "Vue d'ensemble",
            live: "En direct",
            rooms: "Salles",
            members: "Membres",
            tags: "Étiquettes",
            moderation: "Modération",
            settings: "Paramètres",
            activity: "Activité",
        },
        organization: {
            worlds: "Mondes",
            team: "Équipe",
            apiKeys: "Clés de l'API Room",
            domains: "Domaines",
            audit: "Journal d'audit",
            settings: "Paramètres",
        },
        platformItems: {
            overview: "État du système",
            organizations: "Toutes les organisations",
            accounts: "Comptes",
            catalog: "Catalogue d'avatars",
            settings: "Paramètres de l'instance",
            audit: "Journal d'audit",
        },
    },
    roles: {
        superadmin: "Super-administrateur",
        owner: "Propriétaire",
        admin: "Administrateur",
        moderator: "Modérateur",
        viewer: "Lecteur",
        employee: "Employé",
        support: "Support de la plateforme",
        descriptions: {
            owner: "Contrôle total, y compris l'équipe et la suppression de l'organisation.",
            admin: "Gère les espaces de travail, les mondes, les salles, les paramètres, les composants et les intégrations, ainsi que les personnes sous le rôle d'administrateur.",
            moderator:
                "Gère les membres et les étiquettes, les bannissements et les signalements, et envoie des messages en direct.",
            viewer: "Accès en lecture seule.",
            employee:
                "Utilise les bureaux de ses espaces de travail et voit ses collègues et les composants. Aucune administration.",
        },
    },
    workspaceRoles: {
        manager: "Responsable d'espace",
        member: "Membre de l'espace",
        descriptions: {
            manager: "Administre les mondes de cet espace de travail : salles, membres, modération, composants.",
            member: "Peut entrer dans les mondes de cet espace de travail dans WorkAdventure.",
        },
    },
    auth: {
        loginTitle: "Connexion",
        loginIntro: "Connectez-vous pour administrer vos mondes WorkAdventure.",
        password: "Mot de passe",
        submit: "Se connecter",
        invalidCredentials:
            "Adresse e-mail ou mot de passe incorrect. Après plusieurs échecs, la connexion au compte est suspendue pendant 15 minutes.",
        locked: "Trop de tentatives échouées. Réessayez dans 15 minutes.",
        disabled: "Ce compte est désactivé.",
        mfaTitle: "Authentification à deux facteurs",
        mfaIntro:
            "Saisissez le code à 6 chiffres de votre application d'authentification, ou l'un de vos codes de secours.",
        mfaCode: "Code d'authentification ou de secours",
        mfaInvalid: "Ce code n'est pas valide. Vérifiez l'heure de votre appareil et réessayez.",
        mfaRequired: "Votre organisation exige l'authentification à deux facteurs. Configurez-la pour continuer.",
        setupTitle: "Bienvenue dans Adminspace",
        setupIntro: "Créez le premier compte super-administrateur. Il pourra gérer l'ensemble de la plateforme.",
        setupDone: "La plateforme est configurée. Vous pouvez maintenant vous connecter.",
        passwordTooShort: "Utilisez au moins {min} caractères.",
        passwordTooLong: "Utilisez au plus {max} caractères.",
        passwordConfirm: "Confirmer le mot de passe",
        passwordMismatch: "Les mots de passe ne correspondent pas.",
        loggedOut: "Vous avez été déconnecté.",
        rateLimited: "Trop de tentatives. Patientez quelques minutes, puis réessayez.",
        mfaCodeHint: "Un code de secours ressemble à abcde-12345. Chacun ne fonctionne qu'une fois.",
        mfaLocked:
            "Trop de codes invalides : l'authentification à deux facteurs est verrouillée pendant 15 minutes. Reconnectez-vous plus tard.",
        mustChangePassword:
            "Vous utilisez un mot de passe temporaire. Choisissez un nouveau mot de passe pour continuer.",
        setupToken: "Jeton d'installation",
        setupTokenHelp: "La valeur de la variable d'environnement SETUP_TOKEN de ce serveur.",
        setupTokenInvalid: "Ce jeton d'installation n'est pas valide.",
        setupDisabled:
            "L'installation par le web est désactivée sur ce serveur de production. Créez le premier super-administrateur en ligne de commande sur le serveur :",
    },
    account: {
        title: "Mon compte",
        profile: "Profil",
        preferences: "Préférences",
        localeHelp: "Langue de l'interface d'administration. Les dates et les nombres suivent ses conventions.",
        timeZoneHelp: "Les dates et heures sont affichées dans ce fuseau horaire (base de données IANA).",
        automatic: "Automatique (navigateur)",
        security: "Sécurité",
        changePassword: "Changer le mot de passe",
        currentPassword: "Mot de passe actuel",
        newPassword: "Nouveau mot de passe",
        passwordChanged: "Mot de passe modifié. Vos autres sessions ont été fermées.",
        wrongPassword: "Le mot de passe actuel est incorrect.",
        mfa: "Authentification à deux facteurs",
        mfaEnabled: "L'authentification à deux facteurs est activée.",
        mfaDisabled: "L'authentification à deux facteurs n'est pas activée.",
        mfaSetupIntro:
            "Scannez cette clé avec une application d'authentification (TOTP, RFC 6238), puis saisissez le code qu'elle affiche.",
        mfaSecret: "Clé de configuration",
        mfaEnable: "Activer l'authentification à deux facteurs",
        mfaDisable: "Désactiver l'authentification à deux facteurs",
        sessions: "Sessions actives",
        currentSession: "Cette session",
        endOtherSessions: "Fermer les autres sessions",
        sessionsEnded: "Les autres sessions ont été fermées.",
        ipAddress: "Adresse IP",
        device: "Appareil",
        emailTaken: "Un autre compte utilise déjà cette adresse e-mail.",
        mfaStart: "Configurer l'authentification à deux facteurs",
        mfaUri: "Lien de configuration (URI otpauth)",
        mfaConfirmIntro: "Saisissez le code affiché par votre application pour terminer.",
        mfaEnabledNow: "L'authentification à deux facteurs est désormais activée.",
        mfaDisabledNow: "L'authentification à deux facteurs est désormais désactivée.",
        mfaMandatory:
            "L'authentification à deux facteurs est obligatoire sur cette plateforme : elle ne peut pas être désactivée.",
        mfaDisableIntro:
            "Saisissez votre mot de passe et un code d'authentification ou de secours actuel pour désactiver l'authentification à deux facteurs.",
        noOtherSessions: "Aucune autre session active.",
        emailChangePassword: "Nécessaire uniquement pour changer l'adresse e-mail.",
        mfaStartIntro: "Confirmez votre mot de passe pour configurer l'authentification à deux facteurs.",
        mfaReplace: "Remplacer l'application d'authentification",
        mfaReplaceIntro:
            "Saisissez votre mot de passe et un code actuel pour enregistrer une nouvelle application d'authentification. L'ancienne cesse de fonctionner.",
        mfaCurrentCode: "Code d'authentification ou de secours actuel",
        mfaEnrolmentExpired: "Cette configuration a expiré. Recommencez.",
        recoveryCodes: "Codes de secours",
        recoveryCodesIntro:
            "Chaque code peut remplacer une seule fois un code d'authentification, par exemple si vous perdez votre téléphone. Conservez-les en lieu sûr : ils ne sont affichés que maintenant.",
        recoveryCodesRegenerate: "Générer de nouveaux codes de secours",
        recoveryCodesRegenerateIntro:
            "Saisissez votre mot de passe. Les anciens codes de secours cessent de fonctionner.",
        recoveryCodesRemaining: p({
            zero: "Plus aucun code de secours.",
            one: "{count} code de secours restant.",
            other: "{count} codes de secours restants.",
        }),
    },
    accountAdmin: {
        temporaryPassword: "Mot de passe temporaire",
        resetMfa: "Réinitialiser l'authentification à deux facteurs",
        resetMfaDescription:
            "Supprime l'application d'authentification et les codes de secours de ce compte, et met fin à ses sessions. La personne configure de nouveau l'authentification à deux facteurs à sa prochaine connexion.",
    },
};
