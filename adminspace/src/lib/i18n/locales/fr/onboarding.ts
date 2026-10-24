import type { Messages } from "../en";

/** Intégration : inscription, vérification de l’adresse e-mail, invitations, réinitialisation du mot de passe et e-mails associés. */
export const onboarding: Messages["onboarding"] = {
    register: {
        title: "Créer votre organisation",
        intro: "Configurez un espace de travail pour votre équipe en quelques minutes. Vous serez le propriétaire de l’organisation.",
        accountSection: "Votre compte",
        organizationSection: "Votre organisation",
        name: "Votre nom",
        email: "Adresse e-mail professionnelle",
        password: "Mot de passe",
        passwordConfirm: "Confirmer le mot de passe",
        organizationName: "Nom de l’organisation",
        organizationSlug: "Identifiant d’URL",
        organizationSlugHint:
            "Lettres minuscules, chiffres et tirets. Vos mondes seront accessibles à l’adresse /@/{slug}/…",
        submit: "Créer mon organisation",
        haveAccount: "Vous avez déjà un compte ?",
        login: "Se connecter",
        closed: "Les inscriptions sont fermées sur cette plateforme. Demandez à un administrateur de vous inviter.",
        needsMail:
            "L’inscription nécessite l’envoi d’e-mails, qui n’est pas encore configuré sur cette plateforme. Adressez-vous à un administrateur de la plateforme.",
        pendingTitle: "Consultez votre boîte de réception",
        pending:
            "Si l’adresse peut être utilisée, nous avons envoyé un lien à {email} pour la confirmer. Ouvrez-le dans les 24 heures pour terminer la création de votre organisation.",
        pendingHint:
            "Rien reçu après quelques minutes ? Vérifiez votre dossier de courrier indésirable, ou inscrivez-vous à nouveau.",
        accountExists:
            "Un compte utilise déjà cette adresse e-mail. Connectez-vous, puis créez l’organisation depuis votre compte.",
        terms: "En créant une organisation, vous confirmez être habilité à agir en son nom.",
    },
    verify: {
        title: "Confirmer votre organisation",
        intro: "Dernière étape : confirmez pour créer votre compte et votre organisation.",
        summaryAccount: "Compte",
        summaryOrganization: "Organisation",
        confirm: "Créer mon organisation",
        slugTaken: "Cet identifiant d’URL a été pris entre-temps. Choisissez-en un autre pour continuer.",
        invalidTitle: "Ce lien ne peut pas être utilisé",
        invalid:
            "Le lien a expiré ou a déjà été utilisé. Si vous avez déjà confirmé, connectez-vous. Sinon, inscrivez-vous à nouveau.",
        accountExists: "Un compte utilise déjà cette adresse e-mail. Connectez-vous pour continuer.",
    },
    welcome: {
        title: "Bienvenue dans {organization}",
        intro: "Votre organisation est prête. Voici les prochaines étapes.",
        steps: {
            profile: "Compléter le profil de l’organisation",
            profileHint: "Logo, couleur, pays et adresse e-mail de contact.",
            workspace: "Organiser vos espaces de travail",
            workspaceHint: "Regroupez vos bureaux par service ou par site. Vous disposez déjà d’un espace de travail.",
            world: "Créer votre premier monde",
            worldHint: "Un monde est un bureau virtuel dans WorkAdventure, composé de salles.",
            invite: "Inviter votre équipe",
            inviteHint: "Envoyez des invitations par e-mail, avec le rôle adapté à chaque personne.",
            components: "Aménager votre bureau",
            componentsHint:
                "Choisissez des bureaux, des salles de réunion et des décorations dans la bibliothèque de composants.",
        },
        done: "Terminé",
        todo: "À faire",
        skip: "Accéder au tableau de bord",
    },
    invite: {
        title: "Rejoindre {organization}",
        intro: "{inviter} vous invite à rejoindre {organization} en tant que {role}.",
        introNoInviter: "Vous avez reçu une invitation à rejoindre {organization} en tant que {role}.",
        workspaces: "Vous aurez accès à : {workspaces}.",
        accept: "Rejoindre {organization}",
        loginToAccept: "Cette adresse dispose déjà d’un compte. Connectez-vous pour accepter l’invitation.",
        loginAction: "Se connecter pour accepter",
        createAccount: "Créez votre compte pour rejoindre l’organisation",
        name: "Votre nom",
        password: "Mot de passe",
        passwordConfirm: "Confirmer le mot de passe",
        createAndJoin: "Créer mon compte et rejoindre l’organisation",
        invitedEmail: "Invitation pour {email}",
        wrongAccount:
            "Vous êtes connecté en tant que {current}, mais cette invitation est destinée à {invited}. Déconnectez-vous, puis ouvrez de nouveau le lien.",
        logoutAndContinue: "Se déconnecter",
        invalidTitle: "Cette invitation ne peut pas être utilisée",
        invalid: "Le lien n’est pas valide. Demandez une nouvelle invitation à la personne qui vous a invité.",
        expired: "Cette invitation a expiré. Demandez à la personne qui vous a invité de vous la renvoyer.",
        revoked: "Cette invitation a été retirée.",
        accepted: "Cette invitation a déjà été acceptée. Connectez-vous pour continuer.",
        organizationInactive: "Cette organisation n’est pas disponible pour le moment.",
        noLongerValid:
            "Cette invitation n’est plus valide. Demandez-en une nouvelle à un administrateur de l’organisation.",
        joined: "Vous avez rejoint {organization}.",
    },
    forgot: {
        title: "Réinitialiser votre mot de passe",
        intro: "Saisissez l’adresse e-mail de votre compte. Nous vous enverrons un lien pour choisir un nouveau mot de passe.",
        email: "Adresse e-mail",
        submit: "Envoyer le lien",
        sent: "Si un compte utilise cette adresse, un lien lui a été envoyé. Il est valable 30 minutes.",
        unavailable:
            "La réinitialisation du mot de passe par e-mail n’est pas disponible sur cette plateforme. Demandez à un administrateur de la plateforme de réinitialiser votre mot de passe.",
        backToLogin: "Retour à la connexion",
        link: "Mot de passe oublié ?",
    },
    reset: {
        title: "Choisir un nouveau mot de passe",
        intro: "Vos autres sessions seront fermées. L’authentification à deux facteurs, si elle est activée, reste requise.",
        password: "Nouveau mot de passe",
        passwordConfirm: "Confirmer le nouveau mot de passe",
        submit: "Changer mon mot de passe",
        done: "Votre mot de passe a été modifié. Vous pouvez maintenant vous connecter.",
        invalid: "Ce lien a expiré ou a déjà été utilisé. Demandez-en un nouveau.",
        askAgain: "Demander un nouveau lien",
    },
    emails: {
        invitation: {
            subject: "Invitation à rejoindre {organization}",
            body: "{inviter} vous invite à rejoindre {organization} sur AdminSpace en tant que {role}.",
            action: "Accepter l’invitation",
            footnote:
                "Cette invitation expire le {expiresAt} (UTC). Si vous ne l’attendiez pas, vous pouvez ignorer cet e-mail.",
        },
        signupVerification: {
            subject: "Confirmez la création de {organization}",
            body: "Bonjour {name}, confirmez votre adresse e-mail pour terminer la création de {organization} sur AdminSpace.",
            action: "Confirmer et créer mon organisation",
            footnote:
                "Ce lien est valable {hours} heures. Si vous n’en avez pas fait la demande, ignorez cet e-mail : rien ne sera créé.",
        },
        signupExisting: {
            subject: "Vous avez déjà un compte AdminSpace",
            body: "Quelqu’un a tenté de s’inscrire avec cette adresse e-mail, qui dispose déjà d’un compte. Si c’était vous, connectez-vous : vous pouvez créer une organisation depuis votre compte.",
            action: "Se connecter",
            footnote: "Si ce n’était pas vous, vous pouvez ignorer cet e-mail. Votre compte n’a pas été modifié.",
        },
        passwordReset: {
            subject: "Réinitialisez votre mot de passe AdminSpace",
            body: "Bonjour {name}, nous avons reçu une demande de réinitialisation du mot de passe de votre compte.",
            action: "Choisir un nouveau mot de passe",
            footnote:
                "Ce lien est valable {minutes} minutes et ne fonctionne qu’une fois. Si vous n’en avez pas fait la demande, ignorez cet e-mail : votre mot de passe ne change pas.",
        },
        passwordChanged: {
            subject: "Votre mot de passe AdminSpace a été modifié",
            body: "Bonjour {name}, le mot de passe de votre compte vient d’être modifié et vos sessions ont été fermées.",
            footnote:
                "Si vous n’êtes pas à l’origine de cette modification, réinitialisez immédiatement votre mot de passe et contactez votre administrateur.",
        },
    },
};
