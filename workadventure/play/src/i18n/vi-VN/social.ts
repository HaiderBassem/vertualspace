import type { DeepPartial } from "../DeepPartial";
import type { Translation } from "../i18n-types";

const social: DeepPartial<Translation["social"]> = {
    localTime: "🕐 {time} giờ địa phương",
    activity: {
        listening: "🎵 {title} — {artist}",
        listeningTitle: "🎵 {title}",
        coding: "💻 Đang làm việc với {repo}",
    },
    notifyWhenFree: {
        action: "Báo cho tôi khi rảnh",
        stop: "Ngừng chờ",
        watching: "Chúng tôi sẽ báo cho bạn khi {name} rảnh.",
        alreadyFree: "{name} hiện đang rảnh.",
        nowFree: "{name} đã rảnh",
    },
    wave: {
        action: "Vẫy tay",
        received: "{name} vẫy tay với bạn",
        receivedBack: "{name} vẫy tay đáp lại",
        waveBack: "Vẫy tay đáp lại",
        goTo: "Đi tới",
        message: "Nhắn tin",
        sent: "Bạn đã vẫy tay với {name} 👋",
        rateLimited: "Từ từ nào! Bạn có thể vẫy tay với {name} lần nữa sau {seconds} giây.",
        receiverGone: "{name} không còn trực tuyến.",
        failed: "Không thể gửi lời vẫy tay tới {name}. Vui lòng thử lại.",
    },
    goTo: {
        action: "Đi tới",
        notFound: "{name} không còn ở trên bản đồ này.",
        noFreeSpot: "Không còn chỗ trống bên cạnh {name}.",
        failed: "Không thể đi tới chỗ {name}. Vui lòng thử lại.",
    },
    knock: {
        prompt: "Cuộc trò chuyện này là riêng tư",
        knock: "Gõ cửa",
        waiting: "Bạn đã gõ cửa. Đang chờ phản hồi…",
        received: "{name} đang gõ cửa",
        letIn: "Cho vào",
        notNow: "Để sau",
        letYouIn: "{name} đã cho bạn vào",
        declined: "{name} trả lời: để sau",
        rateLimited: "Bạn vừa gõ cửa. Bạn có thể gõ cửa lại sau {seconds} giây.",
        failed: "Không thể gõ cửa. Vui lòng thử lại.",
    },
    someone: "Ai đó",
};

export default social;
