import type { DeepPartial } from "../DeepPartial";
import type { Translation } from "../i18n-types";

const customStatus: DeepPartial<Translation["customStatus"]> = {
    title: "حالة مخصصة",
    set: "تعيين حالة…",
    clear: "مسح الحالة",
    edit: "تعديل الحالة",
    emojiLabel: "رمز تعبيري",
    textLabel: "ما حالتك؟",
    textPlaceholder: "مثال: في إجازة حتى يوم الاثنين",
    durationLabel: "المسح بعد",
    durations: {
        never: "عدم المسح",
        "30m": "30 دقيقة",
        "1h": "ساعة واحدة",
        "4h": "4 ساعات",
        today: "اليوم",
        week: "هذا الأسبوع",
    },
    presets: {
        meeting: "في اجتماع",
        commuting: "في الطريق",
        sick: "في إجازة مرضية",
        vacation: "في إجازة",
        remote: "أعمل عن بُعد",
        focus: "في وضع التركيز",
    },
    save: "حفظ",
    cancel: "إلغاء",
    focusSession: {
        title: "التركيز",
        hint: "عدم الإزعاج لبعض الوقت، حتى أثناء تجولك",
        minutes: "{count} دقيقة",
        until: "🎧 في وضع التركيز حتى {time}",
        end: "إنهاء",
        status: "في وضع التركيز",
    },
};

export default customStatus;
