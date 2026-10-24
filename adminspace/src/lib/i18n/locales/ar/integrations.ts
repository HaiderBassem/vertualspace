import type { Messages } from "../en";

/** مفاتيح Room API والنطاقات المخصّصة للمؤسسة. */
export const integrations: Messages["integrations"] = {
    apiKeysTitle: "مفاتيح Room API",
    apiKeysIntro:
        "تتيح المفاتيح لبرامجك الخاصة استخدام Room API في WorkAdventure (متغيرات الغرف وأحداثها) في عوالم هذه المؤسسة.",
    apiKeysUsage:
        "أرسل المفتاح في الترويسة X-API-Key عند كل استدعاء لـ Room API. يتحقّق WorkAdventure منه لدى هذه اللوحة في كل استدعاء.",
    apiKeysEmpty: "لا توجد مفاتيح بعد.",
    newKey: "مفتاح جديد",
    keyName: "الاسم",
    keyNameHelp: "الغرض من المفتاح، مثل اسم البرنامج الذي يستخدمه.",
    scope: "النطاق",
    scopeAll: "جميع عوالم المؤسسة",
    expiresAt: "تاريخ انتهاء الصلاحية",
    expiresHelp: "اتركه فارغًا لمفتاح لا تنتهي صلاحيته. يتوقف المفتاح عن العمل في نهاية هذا اليوم (UTC).",
    createKey: "إنشاء المفتاح",
    keyCreated: "انسخ هذا المفتاح الآن، فلن يُعرض مرة أخرى.",
    key: "المفتاح",
    lastUsed: "آخر استخدام",
    keyStatus: {
        active: "نشط",
        revoked: "مُبطَل",
        expired: "منتهي الصلاحية",
    },
    revokeTitle: "إبطال هذا المفتاح؟",
    revokeDescription: "تفقد البرامج التي تستخدمه الوصول إلى Room API فورًا.",
    keyRevoked: "تم إبطال المفتاح.",

    domainsTitle: "النطاقات",
    domainsIntro: "النطاقات المخصّصة التي يُقدَّم عليها WorkAdventure لهذه المؤسسة.",
    domainsHowItWorks:
        "يسأل WorkAdventure هذه اللوحة عمّا إذا كان النطاق موثوقًا قبل إعادة توجيه الأشخاص بعد تسجيل الدخول عبر OpenID Connect ‏(GET /api/domain/verify)، ويجلب رمز التحقق الخاص بالنطاق عند إصدار شهادة له (GET /white-label/cf-challenge).",
    domainsEmpty: "لا توجد نطاقات مخصّصة بعد.",
    host: "اسم النطاق",
    hostHelp: "مثل play.example.com. أسماء النطاقات الدولية مقبولة.",
    addDomain: "إضافة النطاق",
    invalidHost: "أدخل اسم نطاق صالحًا، بدون https://‎ وبدون مسار.",
    hostTaken: "هذا النطاق مسجّل بالفعل.",
    challenge: "رمز التحقق",
    challengeUrl: "عنوان URL للتحقق",
    domainStatus: {
        verified: "تم التحقق",
        pending: "بانتظار التحقق",
    },
    verify: "التحقق من إثبات DNS",
    verifyTitle: "وضع علامة «تم التحقق» على هذا النطاق؟",
    verifyDescription:
        "لإثبات أن هذه المؤسسة تتحكم في النطاق، انشر سجل DNS من نوع TXT الموضّح أدناه، ثم تحقّق منه. لا يقبل WorkAdventure النطاق إلا بعد العثور على السجل.",
    verified: "تم التحقق من النطاق.",
    removeTitle: "إزالة هذا النطاق؟",
    removeDescription: "سيرفض WorkAdventure عمليات تسجيل الدخول المُعاد توجيهها إلى هذا النطاق.",
    removed: "تمت إزالة النطاق.",
    verifyNoProof:
        "لم يُعثر على سجل TXT ‏{record} أو أنه لا يحتوي على رمز التحقق. قد يستغرق انتشار تغييرات DNS بعض الوقت.",
    verifyDnsError: "فشل استعلام DNS عن {record}. أعد المحاولة لاحقًا.",
    recordName: "اسم سجل TXT",
    recordValue: "قيمة سجل TXT",
};
