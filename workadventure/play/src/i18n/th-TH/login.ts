import type { DeepPartial } from "../DeepPartial";
import type { Translation } from "../i18n-types";

const login: DeepPartial<Translation["login"]> = {
    input: {
        name: {
            placeholder: "กรอกชื่อของคุณ",
            empty: "ยังไม่ได้กรอกชื่อ",
            tooLongError: "ชื่อยาวเกินไป",
            notValidError: "รูปแบบชื่อไม่ถูกต้อง",
        },
    },
    genericError: "เกิดข้อผิดพลาด",
    terms: "เมื่อดำเนินการต่อ แสดงว่าคุณยอมรับ {links} ของเรา",
    termsOfUse: "ข้อกำหนดการใช้งาน",
    privacyPolicy: "นโยบายความเป็นส่วนตัว",
    cookiePolicy: "นโยบายคุกกี้",
    continue: "ดำเนินการต่อ",
    signIn: {
        titleFirstVisit: "เข้าสู่ระบบเพื่อเข้าใช้งาน",
        titleSessionExpired: "คุณออกจากระบบแล้ว",
        leadFirstVisit: "ใช้บัญชีงานที่ผู้ดูแลระบบสร้างไว้ให้คุณ",
        leadSessionExpired: "เข้าสู่ระบบอีกครั้งเพื่อกลับไปยังที่ที่คุณอยู่",
        button: "เข้าสู่ระบบด้วยบัญชีงานของคุณ",
        redirecting: "กำลังเปิดหน้าเข้าสู่ระบบ…",
        helpTitle: "ยังไม่มีบัญชีใช่ไหม",
        help: "ขอให้ผู้ดูแลระบบเชิญคุณ คุณจะได้รับอีเมลที่บอกขั้นตอนที่ต้องทำ",
    },
};

export default login;
