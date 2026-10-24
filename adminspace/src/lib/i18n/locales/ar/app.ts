import type { Messages } from "../en";

/** هيكل التطبيق: التنقل ومبدّل المؤسسات وقائمة الحساب وشريط وصول الدعم. */
export const app: Messages["app"] = {
    sections: {
        organization: "المؤسسة",
        administration: "الإدارة",
        platform: "المنصة",
    },
    nav: {
        overview: "نظرة عامة",
        home: "الرئيسية",
        workspaces: "مساحات العمل",
        people: "الأشخاص",
        directory: "الدليل",
        components: "المكونات",
        apiKeys: "مفاتيح Room API",
        domains: "النطاقات",
        audit: "سجل التدقيق",
        settings: "الإعدادات",
    },
    platformNav: {
        overview: "مركز التحكم",
        organizations: "المؤسسات",
        accounts: "الحسابات",
        components: "كتالوج المكونات",
        avatars: "كتالوج الشخصيات الرمزية",
        jobs: "المهام الخلفية",
        email: "إرسال البريد الإلكتروني",
        settings: "إعدادات النسخة",
        audit: "سجل التدقيق",
    },
    switcher: {
        label: "تبديل المؤسسة",
        yourOrganizations: "مؤسساتك",
        support: "وصول الدعم",
        create: "إنشاء مؤسسة",
        none: "لا تنتمي إلى أي مؤسسة بعد.",
        choose: "اختر مؤسسة",
        suspended: "معلّقة",
    },
    account: {
        menu: "قائمة الحساب",
        settings: "إعدادات الحساب",
        signOut: "تسجيل الخروج",
    },
    support: {
        banner: "وصول الدعم إلى {organization} حتى {time}. السبب: {reason}",
        end: "إنهاء وصول الدعم",
    },
    errorPage: {
        notFoundTitle: "الصفحة غير موجودة",
        forbiddenTitle: "تم رفض الوصول",
        suspendedTitle: "المؤسسة معلّقة",
        suspended: "علّق مسؤولو المنصة هذه المؤسسة. عوالمها مغلقة إلى أن يُعاد تفعيلها.",
        rateLimitedTitle: "طلبات كثيرة جدًا",
        errorTitle: "حدث خطأ ما",
        requestId: "المرجع: {id}",
        home: "الانتقال إلى الصفحة الرئيسية",
    },
    breadcrumbs: "مسار التنقل",
    openMenu: "فتح قائمة التنقل",
    closeMenu: "إغلاق قائمة التنقل",
};
