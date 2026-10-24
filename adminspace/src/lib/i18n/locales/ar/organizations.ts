import type { PluralMessage } from "../../index";
import type { Messages } from "../en";

const p = (forms: PluralMessage): PluralMessage => forms;

/** المؤسسات: القائمة والإنشاء والإعدادات والفريق (مسؤولو لوحة الإدارة). */
export const organizations: Messages["organizations"] = {
    title: "المؤسسات",
    intro: "تجمع المؤسسة عوالم والأشخاص الذين يديرونها.",
    create: "مؤسسة جديدة",
    createTitle: "إنشاء مؤسسة",
    createIntro: "ستكون مالكها. يمكنك إضافة مسؤولين آخرين لاحقًا.",
    createNotAllowed: "لا يمكن إلا لمسؤولي المنصة إنشاء مؤسسات على هذه النسخة.",
    created: "تم إنشاء المؤسسة.",
    empty: "لست عضوًا في أي مؤسسة بعد.",
    worldCount: p({
        zero: "لا توجد عوالم",
        one: "عالم واحد",
        two: "عالمان",
        few: "{count} عوالم",
        many: "{count} عالمًا",
        other: "{count} عالم",
    }),
    fields: {
        name: "الاسم",
        slug: "معرّف URL",
        country: "البلد",
        defaultLocale: "اللغة الافتراضية",
        contactEmail: "البريد الإلكتروني للتواصل",
    },
    hints: {
        slug: "يظهر في عنوان كل عالم: /@/{slug}/…",
        country: "البلد الذي تأسست فيه المؤسسة (ISO 3166-1).",
        defaultLocale: "اللغة المقترحة للمحتوى المُنشأ لهذه المؤسسة.",
        contactEmail: "الجهة التي يُتواصل معها بشأن هذه المؤسسة.",
    },
    noCountry: "غير محدد",
    worlds: {
        title: "العوالم",
        newWorld: "عالم جديد",
        empty: "لا يوجد في هذه المؤسسة أي عالم بعد.",
        showArchived: "عرض العوالم المؤرشفة",
        columns: {
            world: "العالم",
            access: "الوصول",
            state: "الحالة",
            created: "تاريخ الإنشاء",
        },
    },
    settings: {
        title: "إعدادات المؤسسة",
        intro: "هوية المؤسسة وبيانات التواصل معها.",
        slugReadOnly: "لا يمكن تغيير معرّف URL، لأن ذلك سيُعطّل عناوين جميع العوالم.",
        dangerZone: "منطقة الخطر",
        deleteTitle: "حذف هذه المؤسسة",
        deleteDescription:
            "يحذف جميع عوالمها وغرفها وأعضائها وعمليات الحظر والبلاغات ومفاتيح API. سيرفض WorkAdventure جميع عناوين هذه العوالم. لا يمكن التراجع عن ذلك.",
    },
    team: {
        addRequested:
            "إذا كان هناك حساب يستخدم عنوان البريد الإلكتروني هذا، فقد أصبح الآن جزءًا من الفريق بهذا الدور. الدعوات عبر البريد الإلكتروني غير متاحة: إن لزم الأمر، اطلب أولًا من المشرف العام إنشاء الحساب.",
        title: "الفريق",
        intro: "الأشخاص الذين يمكنهم إدارة هذه المؤسسة في Adminspace، وما يُسمح لهم بفعله.",
        add: "إضافة مسؤول",
        addIntro: "يحتاج الشخص إلى حساب في Adminspace. اطلب من أحد مسؤولي المنصة إنشاءه عند الحاجة.",
        accountNotFound: "لا يوجد حساب يستخدم عنوان البريد الإلكتروني هذا.",
        alreadyMember: "هذا الشخص موجود في الفريق بالفعل.",
        lastOwner: "يجب أن يكون للمؤسسة مالك واحد على الأقل.",
        added: "تمت إضافة المسؤول.",
        roleChanged: "تم تغيير الدور.",
        removed: "تمت إزالة المسؤول.",
        remove: "إزالة",
        removeTitle: "إزالة {name} من الفريق؟",
        removeDescription: "سيفقد صلاحية الوصول إلى هذه المؤسسة في Adminspace.",
        you: "أنت",
        rolesTitle: "الأدوار",
        columns: {
            person: "الشخص",
            role: "الدور",
            since: "عضو منذ",
            lastLogin: "آخر تسجيل دخول",
        },
    },
    audit: {
        title: "سجل التدقيق",
        intro: "كل تغيير أُجري في هذه المؤسسة، سواء من مسؤوليها أو من WorkAdventure (الحظر والبلاغات). تُعرض الأوقات بمنطقتك الزمنية.",
        filterAction: "الإجراء يبدأ بـ",
        empty: "لا توجد إدخالات.",
        columns: {
            time: "الوقت",
            actor: "بواسطة",
            action: "الإجراء",
            target: "الهدف",
            ip: "عنوان IP",
            details: "التفاصيل",
        },
    },
};
