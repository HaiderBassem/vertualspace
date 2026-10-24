import type { Messages } from "../en";

/** Incorporación: registro, verificación del correo electrónico, invitaciones, restablecimiento de la contraseña y sus correos. */
export const onboarding: Messages["onboarding"] = {
    register: {
        title: "Cree su organización",
        intro: "Configure un espacio de trabajo para su equipo en pocos minutos. Usted será el propietario de la organización.",
        accountSection: "Su cuenta",
        organizationSection: "Su organización",
        name: "Su nombre",
        email: "Correo electrónico profesional",
        password: "Contraseña",
        passwordConfirm: "Confirmar la contraseña",
        organizationName: "Nombre de la organización",
        organizationSlug: "Identificador de URL",
        organizationSlugHint: "Letras minúsculas, cifras y guiones. Sus mundos estarán en /@/{slug}/…",
        submit: "Crear mi organización",
        haveAccount: "¿Ya tiene una cuenta?",
        login: "Iniciar sesión",
        closed: "El registro está cerrado en esta plataforma. Pida a un administrador que le invite.",
        needsMail:
            "El registro requiere el envío de correos electrónicos, que todavía no está configurado en esta plataforma. Consulte a un administrador de la plataforma.",
        pendingTitle: "Revise su bandeja de entrada",
        pending:
            "Si la dirección puede utilizarse, hemos enviado un enlace a {email} para confirmarla. Ábralo en un plazo de 24 horas para terminar de crear su organización.",
        pendingHint:
            "¿No ha recibido nada al cabo de unos minutos? Revise la carpeta de correo no deseado o vuelva a registrarse.",
        accountExists:
            "Ya hay una cuenta que utiliza esta dirección de correo electrónico. Inicie sesión y, después, cree la organización desde su cuenta.",
        terms: "Al crear una organización, confirma que está autorizado a actuar en su nombre.",
    },
    verify: {
        title: "Confirme su organización",
        intro: "Un último paso: confirme para crear su cuenta y su organización.",
        summaryAccount: "Cuenta",
        summaryOrganization: "Organización",
        confirm: "Crear mi organización",
        slugTaken: "Este identificador de URL se ha ocupado mientras tanto. Elija otro para continuar.",
        invalidTitle: "Este enlace no se puede utilizar",
        invalid:
            "El enlace ha caducado o ya se ha utilizado. Si ya ha confirmado, inicie sesión. Si no, vuelva a registrarse.",
        accountExists:
            "Ya hay una cuenta que utiliza esta dirección de correo electrónico. Inicie sesión para continuar.",
    },
    welcome: {
        title: "Bienvenido a {organization}",
        intro: "Su organización está lista. Estos son los siguientes pasos.",
        steps: {
            profile: "Complete el perfil de la organización",
            profileHint: "Logotipo, color, país y correo electrónico de contacto.",
            workspace: "Organice sus espacios de trabajo",
            workspaceHint: "Agrupe sus oficinas por departamento o sede. Ya tiene un espacio de trabajo.",
            world: "Cree su primer mundo",
            worldHint: "Un mundo es una oficina virtual en WorkAdventure, formada por salas.",
            invite: "Invite a su equipo",
            inviteHint: "Envíe invitaciones por correo electrónico, con el rol adecuado para cada persona.",
            components: "Amueble su oficina",
            componentsHint:
                "Elija escritorios, salas de reuniones y elementos decorativos de la biblioteca de componentes.",
        },
        done: "Hecho",
        todo: "Pendiente",
        skip: "Ir al panel",
    },
    invite: {
        title: "Únase a {organization}",
        intro: "{inviter} le ha invitado a unirse a {organization} como {role}.",
        introNoInviter: "Le han invitado a unirse a {organization} como {role}.",
        workspaces: "Tendrá acceso a: {workspaces}.",
        accept: "Unirse a {organization}",
        loginToAccept: "Esta dirección ya tiene una cuenta. Inicie sesión para aceptar la invitación.",
        loginAction: "Iniciar sesión para aceptar",
        createAccount: "Cree su cuenta para unirse",
        name: "Su nombre",
        password: "Contraseña",
        passwordConfirm: "Confirmar la contraseña",
        createAndJoin: "Crear mi cuenta y unirme",
        invitedEmail: "Invitación para {email}",
        wrongAccount:
            "Ha iniciado sesión como {current}, pero esta invitación es para {invited}. Cierre la sesión y vuelva a abrir el enlace.",
        logoutAndContinue: "Cerrar sesión",
        invalidTitle: "Esta invitación no se puede utilizar",
        invalid: "El enlace no es válido. Pida una nueva invitación a la persona que le invitó.",
        expired: "Esta invitación ha caducado. Pida a la persona que le invitó que se la vuelva a enviar.",
        revoked: "Esta invitación se ha retirado.",
        accepted: "Esta invitación ya se ha aceptado. Inicie sesión para continuar.",
        organizationInactive: "Esta organización no está disponible en este momento.",
        noLongerValid: "Esta invitación ya no es válida. Pida una nueva a un administrador de la organización.",
        joined: "Se ha unido a {organization}.",
    },
    forgot: {
        title: "Restablecer la contraseña",
        intro: "Introduzca la dirección de correo electrónico de su cuenta. Le enviaremos un enlace para elegir una nueva contraseña.",
        email: "Correo electrónico",
        submit: "Enviar el enlace",
        sent: "Si alguna cuenta utiliza esta dirección, se le ha enviado un enlace. Es válido durante 30 minutos.",
        unavailable:
            "El restablecimiento de la contraseña por correo electrónico no está disponible en esta plataforma. Pida a un administrador de la plataforma que restablezca su contraseña.",
        backToLogin: "Volver al inicio de sesión",
        link: "¿Ha olvidado su contraseña?",
    },
    reset: {
        title: "Elija una nueva contraseña",
        intro: "Se cerrarán sus demás sesiones. La autenticación en dos pasos, si está activada, se sigue aplicando.",
        password: "Nueva contraseña",
        passwordConfirm: "Confirmar la nueva contraseña",
        submit: "Cambiar mi contraseña",
        done: "Se ha cambiado su contraseña. Ya puede iniciar sesión.",
        invalid: "Este enlace ha caducado o ya se ha utilizado. Solicite uno nuevo.",
        askAgain: "Solicitar un nuevo enlace",
    },
    emails: {
        invitation: {
            subject: "Le han invitado a unirse a {organization}",
            body: "{inviter} le ha invitado a unirse a {organization} en AdminSpace como {role}.",
            action: "Aceptar la invitación",
            footnote: "Esta invitación caduca el {expiresAt} (UTC). Si no la esperaba, puede ignorar este correo.",
        },
        signupVerification: {
            subject: "Confirme la creación de {organization}",
            body: "Hola, {name}: confirme su dirección de correo electrónico para terminar de crear {organization} en AdminSpace.",
            action: "Confirmar y crear mi organización",
            footnote:
                "Este enlace es válido durante {hours} horas. Si no lo ha solicitado, ignore este correo: no se creará nada.",
        },
        signupExisting: {
            subject: "Ya tiene una cuenta de AdminSpace",
            body: "Alguien ha intentado registrarse con esta dirección de correo electrónico, que ya tiene una cuenta. Si ha sido usted, inicie sesión: puede crear una organización desde su cuenta.",
            action: "Iniciar sesión",
            footnote: "Si no ha sido usted, puede ignorar este correo. Su cuenta no ha cambiado.",
        },
        passwordReset: {
            subject: "Restablezca su contraseña de AdminSpace",
            body: "Hola, {name}: hemos recibido una solicitud para restablecer la contraseña de su cuenta.",
            action: "Elegir una nueva contraseña",
            footnote:
                "Este enlace es válido durante {minutes} minutos y solo funciona una vez. Si no lo ha solicitado, ignore este correo: su contraseña no cambia.",
        },
        passwordChanged: {
            subject: "Se ha cambiado su contraseña de AdminSpace",
            body: "Hola, {name}: se acaba de cambiar la contraseña de su cuenta y se han cerrado sus sesiones.",
            footnote:
                "Si no ha sido usted, restablezca su contraseña de inmediato y póngase en contacto con su administrador.",
        },
    },
};
