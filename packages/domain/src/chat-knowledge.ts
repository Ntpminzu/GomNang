/** Nội dung hướng dẫn được duyệt để chatbot trích dẫn; trang /help hiển thị cùng một nguồn. */
export const CHAT_GUIDES = [
  {
    id: 'guide:find-projects',
    anchor: 'find-projects',
    title: 'Hướng dẫn tìm dự án công khai',
    text: 'Trang Dự án tại / hiển thị các dự án công khai. Có thể tìm theo tên dự án, địa điểm hoặc nhóm thụ hưởng, rồi mở trang chi tiết để kiểm tra thông tin.',
  },
  {
    id: 'guide:create-project',
    anchor: 'create-project',
    title: 'Cách tạo dự án',
    text: 'Bạn cần đăng nhập trước khi tạo dự án tại /projects/new. Người tạo dự án là người điều phối. Dự án mới được lưu ở trạng thái bản nháp.',
  },
  {
    id: 'guide:verify-project',
    anchor: 'verify-project',
    title: 'Xác minh và công khai dự án',
    text: 'Người điều phối gửi dự án bản nháp để xác minh. Người xác minh duyệt thì dự án mới được công khai; bản nháp và dự án chờ xác minh không xuất hiện trong danh sách công khai.',
  },
  {
    id: 'guide:contribute',
    anchor: 'contribute',
    title: 'Cam kết đóng góp',
    text: 'Người dùng đã đăng nhập có thể cam kết đóng góp cho dự án đang nhận đóng góp. Bàn giao và xác nhận là các bước tiếp theo. Hãy kiểm tra trang chi tiết dự án trước khi đóng góp.',
  },
] as const
