# ADR-006 — Chứng từ chi lưu trong PostgreSQL

- Ngày: 25/10/2026. Owner: Khanh (US-5).
- Trạng thái: **Implemented**. Accepted khi người kiểm ghi xác nhận trong human review của [US-5](../evidence/us5-verification.md).
- Liên quan: US-5, Q-04, sổ thu chi công khai.

## Bối cảnh

Đề yêu cầu upload file thật. Trước đây khoản chi chỉ có ô dán link ảnh hoá đơn, không kiểm được link có thật hay ai xem được. Backend chạy trên Render: ổ đĩa của container mất khi deploy lại, nên không lưu file ra đĩa được. Nhóm chưa có khoá cho dịch vụ lưu file riêng (Supabase Storage, S3), và không thêm secret mới trước hạn nộp.

## Quyết định

- **Lưu nội dung file trong bảng `files`** (cột `bytea`) của chính database ứng dụng; khoản chi tham chiếu qua `expenses.receipt_file_id` (mỗi file gắn tối đa một khoản chi).
- **Loại và kích thước:** chỉ JPEG, PNG, WebP, PDF, tối đa 3 MB. Backend nhận loại theo byte đầu file, không tin Content-Type hay đuôi tên. Database có ràng buộc kiểm lại loại và kích thước.
- **Ai tải:** người phụ trách tài chính, khi dự án đang kêu gọi hoặc đang thực hiện.
- **Ai xem:** file chưa gắn khoản chi chỉ người tải lên; khoản chi chờ duyệt hoặc bị từ chối chỉ người điều phối và người phụ trách tài chính; khoản chi đã duyệt của dự án công khai thì ai cũng xem, như sao kê công khai. Không có quyền thì trả 404.
- **Phục vụ file:** `GET /api/files/:id` kèm `nosniff`, `Content-Security-Policy: sandbox`, `Cache-Control: private, no-store`. Frontend tải file kèm phiên đăng nhập rồi hiện xem trước trong trang.
- **Ảnh lớn:** trình duyệt tự thu nhỏ ảnh trên 3 MB về cạnh dài 1600 px, nén JPEG trước khi gửi.

## Phương án thay thế và trade-off

| Phương án | Lợi ích | Đánh đổi |
| :-- | :-- | :-- |
| Bảng `files` trong PostgreSQL (chọn) | Không cần dịch vụ hay secret mới; file và metadata ghi cùng database; chạy giống nhau trên PGlite và Supabase | Database phình theo số file; không có CDN; giới hạn 3 MB |
| Ổ đĩa backend | Đơn giản nhất khi chạy máy | Render xoá ổ đĩa khi deploy lại, mất file |
| Supabase Storage / S3 | Hợp với file lớn, có CDN, URL ký tạm | Cần khoá service role mới, cấu hình bucket và chính sách; thêm một chỗ có thể lộ dữ liệu |
| Giữ ô dán link | Không phải làm gì | Không phải upload thật; không kiểm được quyền xem |

## Hệ quả

- Migration `0013_expense_receipt_files` thêm bảng `files` (bật RLS) và cột `receipt_file_id`. Khoản chi cũ chỉ có `receipt_url` vẫn hiện link như trước.
- File tải lên nhưng không gắn khoản chi (người dùng huỷ hộp thoại) vẫn nằm trong bảng; chưa có việc dọn định kỳ.
- Bản chạy thử trong trình duyệt (mock) không lưu file và báo 503 `UPLOAD_UNAVAILABLE` sau khi kiểm quyền.
- Đề muốn file làm input cho AI "khi có thể". Capability AI đã chọn là structured output trên văn bản; đọc ảnh/PDF cần năng lực đa phương thức, chưa làm.

Sources: [files.ts](../../packages/domain/src/files.ts), `canUploadReceipt`/`canViewReceipt` ở [rules.ts](../../packages/domain/src/rules.ts), [transparency.service.ts](../../be/src/modules/transparency/transparency.service.ts), [transparency.middleware.ts](../../be/src/modules/transparency/transparency.middleware.ts), [ExpenseDialog](../../fe/src/presentation/modules/transparency/components/ExpenseDialog.tsx), [ReceiptPreview](../../fe/src/presentation/modules/transparency/components/ReceiptPreview.tsx), [migration](../../be/drizzle/0013_expense_receipt_files.sql).

## Khi xem lại

Khi tổng dung lượng file làm database gần chạm giới hạn gói Supabase, khi cần file lớn hơn 3 MB, hoặc khi có khoá dịch vụ lưu file. Khi đó thay phần lưu trong repository bằng adapter object storage, giữ nguyên API và luật quyền.
