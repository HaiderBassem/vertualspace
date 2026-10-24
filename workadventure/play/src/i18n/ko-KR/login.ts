import type { DeepPartial } from "../DeepPartial";
import type { Translation } from "../i18n-types";

const login: DeepPartial<Translation["login"]> = {
    input: {
        name: {
            placeholder: "이름을 입력하세요",
            empty: "이름이 비어 있습니다",
            tooLongError: "이름이 너무 깁니다",
            notValidError: "잘못된 이름 형식",
        },
    },
    genericError: "오류가 발생했습니다",
    terms: "계속하면 {links}에 동의하는 것입니다.",
    termsOfUse: "이용 약관",
    privacyPolicy: "개인정보 보호정책",
    cookiePolicy: "쿠키 정책",
    continue: "계속하기",
    signIn: {
        titleFirstVisit: "로그인하고 입장하기",
        titleSessionExpired: "로그아웃되었습니다",
        leadFirstVisit: "관리자가 만들어 준 업무용 계정을 사용하세요.",
        leadSessionExpired: "다시 로그인하여 있던 곳으로 돌아가세요.",
        button: "업무용 계정으로 로그인",
        redirecting: "로그인 페이지를 여는 중…",
        helpTitle: "아직 계정이 없나요?",
        help: "관리자에게 초대를 요청하세요. 따라야 할 단계가 담긴 이메일을 받게 됩니다.",
    },
};

export default login;
