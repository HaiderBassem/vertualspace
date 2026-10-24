import type { DeepPartial } from "../DeepPartial";
import type { Translation } from "../i18n-types";

const login: DeepPartial<Translation["login"]> = {
    input: {
        name: {
            placeholder: "輸入你的名字",
            empty: "名字為空",
            tooLongError: "名字太長",
            notValidError: "名字格式不正確",
        },
    },
    genericError: "發生錯誤",
    terms: "點選繼續，即表示你同意我們的{links}。",
    termsOfUse: "使用條款",
    privacyPolicy: "隱私權政策",
    cookiePolicy: "Cookie 政策",
    continue: "繼續",
    signIn: {
        titleFirstVisit: "登入後進入",
        titleSessionExpired: "你已登出",
        leadFirstVisit: "請使用管理員為你建立的工作帳號。",
        leadSessionExpired: "重新登入，回到你剛才所在的位置。",
        button: "使用工作帳號登入",
        redirecting: "正在開啟登入頁面…",
        helpTitle: "還沒有帳號？",
        help: "請讓管理員邀請你。你會收到一封說明後續步驟的電子郵件。",
    },
};

export default login;
