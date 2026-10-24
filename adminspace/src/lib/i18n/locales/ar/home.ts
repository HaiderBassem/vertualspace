import type { PluralMessage } from "../../index";
import type { Messages } from "../en";

const p = (forms: PluralMessage): PluralMessage => forms;

/** الصفحة الرئيسية للمؤسسة: النظرة العامة للمسؤولين، ومساحة الموظفين، والدليل. */
export const home: Messages["home"] = {
    joined: "مرحبًا! أصبحت الآن عضوًا في {organization}.",
    overview: {
        title: "نظرة عامة",
        intro: "حالة مؤسستك في لمحة.",
        stats: {
            workspaces: "مساحات العمل",
            worlds: "العوالم",
            rooms: "الغرف",
            people: "الأشخاص",
            pendingInvitations: "الدعوات قيد الانتظار",
        },
        setup: "أكمل الإعداد",
        setupProgress: "اكتمل {done} من {total}",
        worldsTitle: "العوالم",
        worldsIntro: "مكاتب افتراضية في WorkAdventure. ينتمي كل منها إلى مساحة عمل.",
        workspaceColumn: "مساحة العمل",
        activity: "النشاط الأخير",
        activityEmpty: "لم يحدث شيء بعد.",
        allActivity: "عرض سجل التدقيق",
        newWorld: "عالم جديد",
        invite: "دعوة أشخاص",
    },
    employee: {
        greeting: "مرحبًا، {name}",
        intro: "مكاتبك في {organization}، وزملاؤك، والمكونات المشتركة.",
        offices: "مكاتبك",
        officesIntro: "افتح مكتبًا في WorkAdventure. سجّل الدخول هناك باستخدام {email} ليتم التعرّف عليك كعضو.",
        noOffices: "ليست لديك صلاحية الوصول إلى أي مكتب بعد.",
        noOfficesHint: "يمكن لأحد مسؤولي مؤسستك منحك صلاحية الوصول إلى مساحة عمل.",
        enter: "دخول",
        rooms: p({
            zero: "لا توجد غرف بعد",
            one: "غرفة واحدة",
            two: "غرفتان",
            few: "{count} غرف",
            many: "{count} غرفة",
            other: "{count} غرفة",
        }),
        unavailable: "عنوان WorkAdventure غير مضبوط على هذه المنصة.",
        teammates: "الزملاء",
        allTeammates: "عرض الجميع",
        components: "مكونات المكتب",
        componentsIntro: "الأثاث وعناصر الديكور المتاحة لمكاتبك.",
        browseComponents: "استعراض المكونات",
    },
    directory: {
        title: "الدليل",
        intro: "أشخاص {organization}.",
        search: "البحث بالاسم أو البريد الإلكتروني",
        empty: "لا يوجد أحد يطابق بحثك.",
        count: p({
            zero: "لا أحد",
            one: "شخص واحد",
            two: "شخصان",
            few: "{count} أشخاص",
            many: "{count} شخصًا",
            other: "{count} شخص",
        }),
    },
};
