import type { DeepPartial } from "../DeepPartial";
import type { Translation } from "../i18n-types";

const login: DeepPartial<Translation["login"]> = {
    genericError: "Zmólka jo póstawała",
    input: {
        name: {
            placeholder: "Zapódaj swójo mě",
            empty: "Žedno mě njejo zapódane",
            tooLongError: "Mě jo pśeliš dłujke",
            notValidError: "Mě njejo płaśece",
        },
    },
    terms: "Jolic až kliknjoš na 'dalej', akceptěrujoš {links}.",
    termsOfUse: "Wustawki wužywanja",
    privacyPolicy: "Deklaracija dla woplěwanja datow",
    cookiePolicy: "Regule za placki (cookije)",
    continue: "Dalej",
    signIn: {
        titleFirstVisit: "Pśizjawjenje jo trjebne",
        titleSessionExpired: "Pśizjawjenje jo skóńcone",
        leadFirstVisit: "Wužyj konto za źěło, kótarež jo administrator za tebje załožył.",
        leadSessionExpired: "Pśizjaw se znowego a źi slědk.",
        button: "Z kontom za źěło pśizjawjaś",
        redirecting: "Bok za pśizjawjenje se wócynja…",
        helpTitle: "Hyšći njamaš konta?",
        help: "Pšos swójogo administratora, aby śi pśepšosył. Dostanjoš e-mail z krokami, kótarež maš slědowaś.",
    },
};

export default login;
