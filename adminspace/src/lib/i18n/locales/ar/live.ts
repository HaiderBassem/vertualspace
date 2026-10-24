import type { PluralMessage } from "../../index";
import type { Messages } from "../en";

const p = (forms: PluralMessage): PluralMessage => forms;

/** الحضور المباشر في العالم والرسائل المُذاعة إلى غرفه. */
export const live: Messages["live"] = {
    title: "مباشر",
    description: "من يوجد في العالم الآن، ورسائل تظهر لكل الموجودين في غرفه.",
    total: p({
        zero: "لا أحد متصل",
        one: "شخص واحد متصل",
        two: "شخصان متصلان",
        few: "{count} أشخاص متصلون",
        many: "{count} شخصًا متصلًا",
        other: "{count} شخص متصل",
    }),
    perRoom: "المتصلون في كل غرفة",
    unavailable: "تعذّر الوصول إلى WorkAdventure. تحقّق من عنوان play وعنوان pusher الداخلي في إعدادات النسخة.",
    updatedAt: "آخر تحديث {time}",
    broadcast: {
        title: "إذاعة رسالة",
        intro: "يوصل WorkAdventure الرسالة إلى كل الموجودين حاليًا في الغرف المختارة. بعض إصدارات WorkAdventure تستقبل هذه الرسائل دون عرضها: راجع دليل التكامل.",
        message: "الرسالة",
        target: "الإرسال إلى",
        allRooms: "جميع غرف العالم",
        send: "إرسال",
        sent: "تم تسليم الرسالة إلى WorkAdventure.",
        failed: "تعذّر إيصال الرسالة: تعذّر الوصول إلى WorkAdventure.",
    },
    people: {
        title: "الأشخاص المتصلون",
        connecting: "جارٍ الاتصال بـ WorkAdventure…",
        connected: "مباشر: تُحدَّث القائمة عند دخول الأشخاص وخروجهم.",
        disconnected: "انقطع الاتصال بـ WorkAdventure.",
        reconnect: "إعادة الاتصال",
        empty: "لا أحد متصل.",
        notConfigured:
            "لرؤية المتصلين لحظيًا، امنح السرّ العشوائي نفسه لخدمة play في WorkAdventure ‏(ADMIN_SOCKETS_TOKEN) ولهذه اللوحة (ADMIN_SOCKETS_TOKEN في ملف ‎.env الخاص بها)، ثم أعد تشغيل كليهما.",
        columns: {
            name: "الاسم",
            room: "الغرفة",
            ipAddress: "عنوان IP",
        },
    },
};
