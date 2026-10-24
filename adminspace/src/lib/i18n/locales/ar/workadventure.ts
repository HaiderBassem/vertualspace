import type { Messages } from "../en";

/** نصوص تظهر للاعبين على شاشات الخطأ في WorkAdventure، تُرسَل عبر Admin API. */
export const workadventure: Messages["workadventure"] = {
    errorTitle: "تم رفض الدخول",
    roomNotFound: {
        subtitle: "هذه الغرفة غير موجودة.",
        details: "تحقّق من الرابط الذي استخدمته، أو اطلب رابطًا جديدًا من الأشخاص الذين دعوك.",
    },
    worldNotFound: {
        subtitle: "هذا العالم غير موجود.",
        details: "تحقّق من الرابط الذي استخدمته، أو اطلب رابطًا جديدًا من الأشخاص الذين دعوك.",
    },
    worldArchived: {
        subtitle: "هذا العالم مغلق.",
        details: "قام مسؤولوه بأرشفته. تواصل معهم إن كنت تعتقد أن ذلك خطأ.",
    },
    worldExpired: {
        subtitle: "انتهت صلاحية هذا العالم.",
        details: "تواصل مع مسؤوليه لإعادة فتحه.",
    },
    organizationSuspended: {
        subtitle: "هذا العالم غير متاح.",
        details: "علّق مسؤولو المنصة مؤسسته.",
    },
    roomPreparing: {
        subtitle: "يجري تجهيز هذه الغرفة.",
        details: "يجري نشر خريطتها. أعد المحاولة بعد دقيقة.",
    },
    invalidUrl: {
        subtitle: "هذا العنوان ليس غرفة صالحة في WorkAdventure.",
        details: "تحقّق من الرابط الذي استخدمته.",
    },
    banned: {
        subtitle: "تم حظرك من هذا العالم.",
        details: "السبب: {reason}",
    },
    membersOnly: {
        subtitle: "هذا العالم مخصّص لأعضائه فقط.",
        details: "سجّل الدخول بالحساب الذي وُجّهت إليه الدعوة، أو اطلب دعوة من مسؤولي العالم.",
        button: "تسجيل الخروج",
    },
    loginRequired: {
        subtitle: "يجب تسجيل الدخول لدخول هذا العالم.",
        details: "سجّل الدخول للمتابعة.",
        button: "تسجيل الدخول",
    },
    tagRequired: {
        subtitle: "لا يمكنك دخول هذه الغرفة.",
        details: "الدخول إلى هذه الغرفة مقيّد. اطلب من مسؤولي العالم منحك صلاحية الوصول إن كنت بحاجة إليها.",
        button: "تسجيل الخروج",
    },
    worldFull: {
        title: "العالم ممتلئ",
        subtitle: "بلغ هذا العالم الحد الأقصى لعدد الأشخاص.",
        details: "ستتم محاولة أخرى تلقائيًا بعد لحظات.",
        button: "إعادة المحاولة",
    },
    banNotAllowed: {
        subtitle: "لا يُسمح لك بحظر الأشخاص في هذا العالم.",
        details: "يمكن لمسؤولي العالم فقط حظر الأشخاص.",
    },
    defaultBanReason: "لم يُذكر سبب.",
};
