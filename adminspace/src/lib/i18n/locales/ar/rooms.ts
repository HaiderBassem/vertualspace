import type { PluralMessage } from "../../index";
import type { Messages } from "../en";

const p = (forms: PluralMessage): PluralMessage => forms;

/** غرف العالم والخرائط التي تحمّلها. */
export const rooms: Messages["rooms"] = {
    title: "الغرف",
    description:
        "تحمّل كل غرفة خريطة واحدة. عنوانها هو عنوان العالم متبوعًا بمعرّف الغرفة، وينتقل الأشخاص بين الغرف عبر هذا العنوان أو عبر المخارج المرسومة في الخرائط.",
    newRoom: "غرفة جديدة",
    editRoom: "تعديل الغرفة",
    empty: "لا توجد في هذا العالم أي غرفة بعد. أنشئ غرفة ليتمكّن الأشخاص من دخوله.",
    columns: {
        name: "الغرفة",
        map: "الخريطة",
        access: "الوصول",
        online: "المتصلون الآن",
    },
    defaultBadge: "افتراضية",
    defaultHelp: "من يفتح عنوان العالم دون اسم غرفة يصل إلى الغرفة الافتراضية.",
    setDefault: "تعيينها افتراضية",
    moveUp: "نقل لأعلى",
    moveDown: "نقل لأسفل",
    everyone: "الجميع",
    restrictedTo: "الوسوم: {tags}",
    online: p({
        zero: "لا أحد",
        one: "شخص واحد",
        two: "شخصان",
        few: "{count} أشخاص",
        many: "{count} شخصًا",
        other: "{count} شخص",
    }),
    occupancyUnavailable: "عدد المتصلين غير متاح: تعذّر الوصول إلى WorkAdventure.",
    reload: "إعادة التحميل للجميع",
    reloadTitle: "إعادة تحميل هذه الغرفة للجميع؟",
    reloadDescription: "سيُطلب من كل الموجودين في الغرفة حاليًا إعادة تحميلها، مثلًا بعد تغيير خريطتها.",
    reloaded: "طُلب من جميع الموجودين في الغرفة إعادة تحميلها.",
    deleteTitle: "حذف هذه الغرفة؟",
    deleteDescription: "ستعرض الروابط المؤدية إلى هذه الغرفة خطأً. لا يُحذف ملف الخريطة نفسه من مكان استضافته.",
    created: "تم إنشاء الغرفة.",
    fields: {
        name: "الاسم",
        slug: "معرّف الغرفة",
        slugHelp: "أحرف لاتينية صغيرة وأرقام وشرطات وشرطات سفلية وشرطات مائلة (مثل floor-1/meeting).",
        description: "الوصف",
        mapKind: "نوع الخريطة",
        mapKindWam: "خريطة map-storage ‏(.wam)، قابلة للتعديل بمحرر الخرائط في WorkAdventure",
        mapKindTmj: "خريطة Tiled ‏(.tmj أو .json) مستضافة على أي خادم ويب",
        wamUrl: "عنوان URL لملف WAM",
        wamUrlHelp: "عنوان URL لملف ‎.wam في map-storage الخاص بـ WorkAdventure.",
        mapUrl: "عنوان URL لخريطة Tiled",
        mapUrlHelp: "عنوان URL العام لملف خريطة Tiled. يجب أن تكون مجموعات البلاطات (tilesets) متاحة من المكان نفسه.",
        requiredTags: "الوسوم المطلوبة للدخول",
        requiredTagsHelp:
            "مفصولة بفواصل. عند تحديدها، لا يدخل إلا الأعضاء الذين يحملون أحد هذه الوسوم على الأقل (أو الوسم admin).",
        thumbnailUrl: "عنوان URL للصورة المصغّرة",
        isDefault: "الغرفة الافتراضية للعالم",
    },
    mapStorage: {
        title: "الخرائط الموجودة في map-storage",
        use: "استخدام هذه الخريطة",
        notConfigured: "اضبط عناوين map-storage في إعدادات النسخة لاستعراض خرائطها هنا.",
        unreachable: "تعذّر الوصول إلى map-storage. لا يزال بإمكانك كتابة عنوان URL للخريطة.",
        none: "لا يحتوي map-storage على أي خريطة بعد.",
    },
    mapWarning: "لم تستجب خريطة الغرفة {slug}. لن يتمكن WorkAdventure من تحميل الغرفة ما دامت خريطتها غير متاحة.",
    checkMap: "التحقق من الخريطة",
    mapCheck: {
        ok: "الخريطة تستجيب (HTTP {status}).",
        unreachable: "تعذّر الوصول إلى الخريطة.",
        httpError: "استجابت الخريطة بخطأ (HTTP {status}).",
        notChecked: "لم يجرِ التحقق: الخريطة على عنوان في شبكة خاصة.",
    },
    mapProblems: {
        extensionWam: "يجب أن تكون خريطة map-storage ملفًا بصيغة ‎.wam.",
        extensionTmj: "يجب أن تكون خريطة Tiled ملفًا بصيغة ‎.tmj أو ‎.json.",
        otherOrganization: "تنتمي هذه الخريطة إلى مؤسسة أخرى ولا يمكن استخدامها هنا.",
    },
};
