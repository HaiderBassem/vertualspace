import type { DeepPartial } from "../DeepPartial";
import type { Translation } from "../i18n-types";

const social: DeepPartial<Translation["social"]> = {
    localTime: "🕐 เวลาท้องถิ่น {time}",
    activity: {
        listening: "🎵 {title} — {artist}",
        listeningTitle: "🎵 {title}",
        coding: "💻 กำลังทำงานกับ {repo}",
    },
    notifyWhenFree: {
        action: "แจ้งฉันเมื่อว่าง",
        stop: "หยุดรอ",
        watching: "เราจะแจ้งให้คุณทราบเมื่อ {name} ว่าง",
        alreadyFree: "ตอนนี้ {name} ว่างแล้ว",
        nowFree: "ตอนนี้ {name} ว่างแล้ว",
    },
    wave: {
        action: "โบกมือ",
        received: "{name} โบกมือให้คุณ",
        receivedBack: "{name} โบกมือตอบ",
        waveBack: "โบกมือตอบ",
        goTo: "ไปหา",
        message: "ข้อความ",
        sent: "คุณโบกมือให้ {name} 👋",
        rateLimited: "ใจเย็นๆ! คุณโบกมือให้ {name} ได้อีกครั้งใน {seconds} วินาที",
        receiverGone: "{name} ไม่ได้ออนไลน์แล้ว",
        failed: "ส่งการโบกมือถึง {name} ไม่สำเร็จ โปรดลองอีกครั้ง",
    },
    goTo: {
        action: "ไปหา",
        notFound: "{name} ไม่อยู่บนแผนที่นี้แล้ว",
        noFreeSpot: "ไม่มีที่ว่างข้าง {name}",
        failed: "ไม่สามารถไปหา {name} ได้ โปรดลองอีกครั้ง",
    },
    knock: {
        prompt: "การสนทนานี้เป็นแบบส่วนตัว",
        knock: "เคาะประตู",
        waiting: "คุณเคาะประตูแล้ว กำลังรอคำตอบ…",
        received: "{name} กำลังเคาะประตู",
        letIn: "ให้เข้ามา",
        notNow: "ไม่ใช่ตอนนี้",
        letYouIn: "{name} ให้คุณเข้ามาแล้ว",
        declined: "{name} ตอบว่า: ไม่ใช่ตอนนี้",
        rateLimited: "คุณเพิ่งเคาะประตูไป เคาะได้อีกครั้งใน {seconds} วินาที",
        failed: "ส่งการเคาะประตูไม่สำเร็จ โปรดลองอีกครั้ง",
    },
    someone: "ใครบางคน",
};

export default social;
