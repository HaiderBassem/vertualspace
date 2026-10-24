import type { DeepPartial } from "../DeepPartial";
import type { Translation } from "../i18n-types";

const login: DeepPartial<Translation["login"]> = {
    input: {
        name: {
            placeholder: "输入你的名字",
            empty: "名字为空",
            tooLongError: "名字太长",
            notValidError: "名字格式不正确",
        },
    },
    genericError: "发生错误",
    terms: "点击继续，意味着你同意我们的{links}.",
    termsOfUse: "使用协议",
    privacyPolicy: "隐私政策",
    cookiePolicy: "Cookie策略",
    continue: "继续",
    signIn: {
        titleFirstVisit: "登录后进入",
        titleSessionExpired: "你已退出登录",
        leadFirstVisit: "请使用管理员为你创建的工作账号。",
        leadSessionExpired: "重新登录，回到你刚才所在的位置。",
        button: "使用工作账号登录",
        redirecting: "正在打开登录页面…",
        helpTitle: "还没有账号？",
        help: "请让管理员邀请你。你会收到一封说明后续步骤的电子邮件。",
    },
};

export default login;
