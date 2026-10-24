import type { PluralMessage } from "../../index";
import type { Messages } from "../en";

const p = (forms: PluralMessage): PluralMessage => forms;

/** «من الحاضر»: الأشخاص المتصلون الآن بعوالم المؤسسة (docs/PRESENCE.md). */
export const presence: Messages["presence"] = {
    nav: "من الحاضر",
    title: "من الحاضر",
    intro: "الأشخاص المتصلون الآن بعوالم مؤسستك، كما يبلغ عنهم WorkAdventure. تتحدث القائمة تلقائيًا كل 15 ثانية.",
    privacy: "لا يرى هذه الصفحة إلا المصرح لهم برؤية الأعضاء. لا يُسجَّل أي شيء، ويختفي الشخص من القائمة فور مغادرته.",
    online: p({
        zero: "لا أحد متصل",
        one: "شخص واحد متصل",
        two: "شخصان متصلان",
        few: "{count} أشخاص متصلون",
        many: "{count} شخصًا متصلًا",
        other: "{count} شخص متصل",
    }),
    signedIn: p({
        zero: "لا أحد مسجّل الدخول",
        one: "واحد مسجّل الدخول",
        two: "اثنان مسجّلا الدخول",
        few: "{count} مسجّلون الدخول",
        many: "{count} مسجّلًا الدخول",
        other: "{count} مسجّل الدخول",
    }),
    guests: p({
        zero: "لا ضيوف",
        one: "ضيف واحد",
        two: "ضيفان",
        few: "{count} ضيوف",
        many: "{count} ضيفًا",
        other: "{count} ضيف",
    }),
    inWorld: p({
        zero: "لا أحد",
        one: "شخص واحد",
        two: "شخصان",
        few: "{count} أشخاص",
        many: "{count} شخصًا",
        other: "{count} شخص",
    }),
    updated: "آخر تحديث",
    refreshing: "جارٍ التحديث…",
    refreshFailed: "تعذّر تحديث القائمة. ستتم المحاولة مجددًا بعد بضع ثوانٍ.",
    emptyTitle: "لا أحد حاضر الآن",
    emptyText:
        "يظهر الأشخاص هنا بعد ثوانٍ من دخولهم أحد عوالمك. لا يبلغ WorkAdventure عنهم إلا إذا كان يستخدم هذا الخادم واجهةً برمجية للإدارة.",
    columns: {
        person: "الشخص",
        status: "الحالة",
        since: "منذ",
        account: "العضو",
    },
    signedInBadge: "مسجّل الدخول",
    guestBadge: "ضيف",
    memberPage: "صفحة العضو",
    notAMember: "ليس عضوًا في هذا العالم",
    roomLabel: "الغرفة {room}",
    statuses: {
        online: "متصل",
        away: "غائب",
        backInAMoment: "سأعود بعد قليل",
        busy: "مشغول",
        doNotDisturb: "عدم الإزعاج",
        inMeeting: "في اجتماع",
        speaking: "يتحدث",
        silent: "صامت",
        noProximity: "لا يقبل المحادثات",
    },
    onlineNow: "متصل الآن",
};
