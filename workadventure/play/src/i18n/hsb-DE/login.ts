import type { DeepPartial } from "../DeepPartial";
import type { Translation } from "../i18n-types";

const login: DeepPartial<Translation["login"]> = {
    input: {
        name: {
            placeholder: "zapisaj swoje mjeno",
            empty: "žane mjeno zapodate",
            tooLongError: "mjeno je předołhe",
            notValidError: "mjeno je njepłaćiwe",
        },
    },
    terms: "Hdyž pokročuješ, akceptuješ {links}.",
    termsOfUse: "wužiwanske wuměnjenja",
    privacyPolicy: "wozjewjenje wo škiće datow",
    cookiePolicy: "cookie směrnicy",
    continue: "pokročować",
    genericError: "Zmólka jo póstawała",
    signIn: {
        titleFirstVisit: "Přizjewjenje je trěbne",
        titleSessionExpired: "Přizjewjenje je skónčene",
        leadFirstVisit: "Wužij konto za dźěło, kotrež je administrator za tebje załožił.",
        leadSessionExpired: "Přizjew so znowa a dźi wróćo.",
        button: "Z kontom za dźěło přizjewić",
        redirecting: "Strona za přizjewjenje so wočinja…",
        helpTitle: "Hišće nimaš konta?",
        help: "Próstw swojeho administratora, zo by će přeprosył. Dóstanješ e-mail z krokami, kotrež maš sćěhować.",
    },
};

export default login;
