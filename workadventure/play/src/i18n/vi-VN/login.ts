import type { DeepPartial } from "../DeepPartial";
import type { Translation } from "../i18n-types";

const login: DeepPartial<Translation["login"]> = {
    input: {
        name: {
            placeholder: "Nhập tên của bạn",
            empty: "Tên đang để trống",
            tooLongError: "Tên quá dài",
            notValidError: "Định dạng tên không hợp lệ",
        },
    },
    genericError: "Đã xảy ra lỗi",
    terms: "Bằng việc tiếp tục, bạn đồng ý với {links} của chúng tôi.",
    termsOfUse: "điều khoản sử dụng",
    privacyPolicy: "chính sách quyền riêng tư",
    cookiePolicy: "chính sách cookie",
    continue: "Tiếp tục",
    signIn: {
        titleFirstVisit: "Đăng nhập để vào",
        titleSessionExpired: "Bạn đã bị đăng xuất",
        leadFirstVisit: "Hãy dùng tài khoản công việc mà quản trị viên đã tạo cho bạn.",
        leadSessionExpired: "Đăng nhập lại để quay về nơi bạn đã ở.",
        button: "Đăng nhập bằng tài khoản công việc",
        redirecting: "Đang mở trang đăng nhập…",
        helpTitle: "Chưa có tài khoản?",
        help: "Hãy nhờ quản trị viên mời bạn. Bạn sẽ nhận được email kèm các bước cần làm.",
    },
};

export default login;
