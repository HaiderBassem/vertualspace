import type { BaseTranslation } from "../i18n-types";

const login: BaseTranslation = {
    input: {
        name: {
            placeholder: "Enter your name",
            empty: "The name is empty",
            tooLongError: "Name is too long",
            notValidError: "Incorrect name format",
        },
    },
    genericError: "An error occurred",
    terms: "By continuing, you are agreeing our {links}.",
    termsOfUse: "terms of use",
    privacyPolicy: "privacy policy",
    cookiePolicy: "cookie policy",
    continue: "Continue",
    signIn: {
        titleFirstVisit: "Sign in to enter",
        titleSessionExpired: "You were signed out",
        leadFirstVisit: "Use the work account that your administrator created for you.",
        leadSessionExpired: "Sign in again to go back to where you were.",
        button: "Sign in with your work account",
        redirecting: "Opening the sign-in page…",
        helpTitle: "No account yet?",
        help: "Ask your administrator to invite you. You will get an email with the steps to follow.",
    },
};

export default login;
