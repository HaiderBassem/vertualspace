import type { DeepPartial } from "../DeepPartial";
import type { Translation } from "../i18n-types";

const login: DeepPartial<Translation["login"]> = {
    input: {
        name: {
            placeholder: "أدخل اسمك", // Enter your name
            empty: "لم يتم إدخال اسم", // No name provided
            tooLongError: "الاسم طويل جدًا", // The name is too long
            notValidError: "الاسم غير صالح", // The name is invalid
        },
    },
    genericError: "حدث خطأ", // An error occurred
    terms: "بالمتابعة، فإنك تقبل {links}.", // By continuing, you accept the {links}.
    termsOfUse: "شروط الاستخدام", // Terms of Use
    privacyPolicy: "سياسة الخصوصية", // Privacy Policy
    cookiePolicy: "سياسة ملفات تعريف الارتباط", // Cookie Policy
    continue: "استمر", // Continue
    signIn: {
        titleFirstVisit: "سجّل الدخول للمتابعة",
        titleSessionExpired: "تم تسجيل خروجك",
        leadFirstVisit: "استخدم حساب العمل الذي أنشأه لك المسؤول.",
        leadSessionExpired: "سجّل الدخول مرة أخرى للعودة إلى حيث كنت.",
        button: "تسجيل الدخول بحساب العمل",
        redirecting: "جارٍ فتح صفحة تسجيل الدخول…",
        helpTitle: "ليس لديك حساب بعد؟",
        help: "اطلب من المسؤول دعوتك. ستصلك رسالة بريد إلكتروني بالخطوات التي يجب اتباعها.",
    },
};

export default login;
