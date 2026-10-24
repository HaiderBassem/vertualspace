import type { DeepPartial } from "../DeepPartial";
import type { Translation } from "../i18n-types";

const area: DeepPartial<Translation["area"]> = {
    noAccess: "عذرًا، ليس لديك إذن للوصول إلى هذه المنطقة.", // Sorry, you do not have permission to access this area.
    blocked: {
        locked: "هذه المنطقة مقفلة. لا يمكنك الدخول.",
        maxUsers: "هذه المنطقة ممتلئة. لا يمكنك الدخول.",
        noAccess: "عذرًا، ليس لديك إذن للوصول إلى هذه المنطقة.",
        unlockWithTrigger: "{trigger} لفتح هذه المنطقة.",
    },
    personalArea: {
        claimDescription: "هذه منطقة شخصية. هل ترغب في تولي الملكية؟", // This is a personal area. Do you want to claim it?
        buttons: {
            yes: "نعم", // Yes
            no: "لا", // No
            confirm: "تأكيد", // Confirm
        },
        errors: {
            taken: "قام شخص آخر بحجز هذا المكتب للتو.",
            notClaimable: "هذا المكتب يخصصه المسؤول. اسأله إن كنت بحاجة إليه.",
            disabled: "هذا المكتب غير متاح حاليًا.",
            notEligible: "هذا المكتب مخصص لفريق آخر.",
            alreadyOwned: "لديك مكتب بالفعل. تخلَّ عنه أولًا لاختيار مكتب آخر.",
            notBookable: "يمكن حجز المكاتب المرنة فقط.",
            bookingInvalid: "لا يمكن إجراء هذا الحجز.",
            bookingConflict: "حجز شخص آخر هذا المكتب بالفعل لجزء من ذلك الوقت.",
            bookingDouble: "لقد حجزت مكتبًا آخر بالفعل لجزء من ذلك الوقت.",
            bookingLimit: "لديك بالفعل الحد الأقصى المسموح به من الحجوزات. ألغِ أحدها أولًا.",
        },
        card: {
            yours: "مكتبك",
            ownedBy: "مكتب {name}",
            free: "مكتب شاغر",
            assigned: "يخصص المسؤول هذا المكتب.",
            outOfService: "هذا المكتب خارج الخدمة.",
            notForYou: "هذا المكتب مخصص لفريق آخر.",
            alreadyHaveDesk: "لديك مكتب بالفعل.",
            atDesk: "على مكتبه الآن",
            inOffice: "في مقر العمل، لكن ليس على مكتبه",
            away: "ليس في مقر العمل الآن",
            youAreHere: "أنت على مكتبك",
            sit: "اجلس على مكتبي",
            claim: "احجز هذا المكتب",
            close: "إغلاق",
            hot: "مكتب مرن: يمكن لأي شخص الجلوس هنا",
            reservedFor: "محجوز لـ {name} حتى {until}",
            reservedForYou: "محجوز لك حتى {until}",
            occupiedBy: "{name} يجلس هنا",
            sitHere: "اجلس هنا",
            standUp: "انهض",
            book: "احجز هذا المكتب",
            bookNextHours: "الساعتان القادمتان",
            bookRestOfDay: "اليوم حتى {until}",
            bookTomorrow: "غدًا {from}–{until}",
            yourBookings: "حجوزاتك",
            booking: "{from} – {until}",
            cancelBooking: "إلغاء",
        },
        nameplate: {
            free: "مكتب شاغر",
            hot: "مكتب مرن",
            keptFor: "محجوز لـ {name}",
            outOfService: "خارج الخدمة",
            taken: "مشغول",
        },
        welcome: {
            title: "ليس لديك مكتب بعد",
            description: "اختر مكتبًا شاغرًا ليصبح مكتبك. يمكنك تزيينه بأغراضك الخاصة.",
            findDesk: "اعثر لي على مكتب",
            later: "ليس الآن",
        },
        claimed: {
            title: "مكتبك جاهز",
            description: "أصبح لك الآن. اسحب العناصر إليه ليصبح مكانًا يشبه بيتك.",
        },
        personalSpaceWithNames: "المساحة الشخصية لـ {name}",
        alreadyHavePersonalArea: "لديك بالفعل منطقة شخصية. سيتم حذفها إذا طالبت بهذه المنطقة.",
    },
    seat: {
        sit: "[SPACE] للجلوس 🪑",
        sitTouch: "👆 للجلوس 🪑",
        stand: "[SPACE] للنهوض",
        standTouch: "👆 للنهوض",
        refused: {
            notFound: "هذا المقعد لم يعد موجودًا.",
            taken: "يجلس شخص ما هناك بالفعل.",
            tooFar: "لا يمكنك الوصول إلى هذا المقعد من هنا.",
            deskTaken: "هذا المقعد تابع لمكتب شخص آخر.",
            deskOf: "هذا مكتب {name}.",
            reserved: "هذا المكتب محجوز لشخص آخر حاليًا.",
            disabled: "هذا المكتب خارج الخدمة.",
            notEligible: "هذا المكتب مخصص لفريق آخر.",
            error: "تعذر الجلوس. يرجى المحاولة مرة أخرى.",
        },
    },
};

export default area;
