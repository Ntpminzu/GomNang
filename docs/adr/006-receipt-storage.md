# ADR-006 — Store Expense Receipts in PostgreSQL

**Chứng từ chi lưu trong PostgreSQL**

- Ngày lập bản ghi: 25/10/2026.
- Trạng thái: **Implemented** — đối chiếu với source; human review US-5 đạt phần lớn các ca.
- Owner: Khanh (US-5). Phạm vi: upload và đọc chứng từ chi, quyết định Q-04.

## 1. Bối cảnh

Đề yêu cầu upload file thật. Trước đây khoản chi chỉ có ô dán link hoá đơn, không kiểm được link có thật hay ai xem được. Backend chạy trên Render, ổ đĩa container mất khi deploy lại. Nhóm chưa có khoá dịch vụ lưu file riêng (Supabase Storage, S3) và không thêm secret mới trước hạn nộp.

## 2. Các phương án

| Phương án | Ưu điểm | Hạn chế |
| :-- | :-- | :-- |
| **Bảng `files` trong PostgreSQL** | Không cần dịch vụ hay secret mới; file và metadata ghi cùng database; chạy giống nhau trên PGlite và Supabase | Database phình theo số file; không có CDN; giới hạn 3 MB |
| Ổ đĩa backend | Đơn giản nhất khi chạy máy | Render xoá ổ đĩa khi deploy lại, mất file |
| Supabase Storage / S3 | Hợp file lớn, có CDN, URL ký tạm | Cần khoá service role mới, cấu hình bucket và chính sách; thêm một chỗ có thể lộ dữ liệu |
| Giữ ô dán link | Không phải làm gì | Không phải upload thật; không kiểm được quyền xem |

## 3. Quyết định

- **Lưu nội dung file trong bảng `files`** (cột `bytea`); khoản chi tham chiếu qua `expenses.receipt_file_id`, mỗi file gắn tối đa một khoản chi.
- **Loại và kích thước:** chỉ JPEG, PNG, WebP, PDF, tối đa 3 MB. Backend nhận loại theo byte đầu file, không tin Content-Type hay đuôi tên; database có ràng buộc kiểm lại.
- **Ai tải:** người phụ trách tài chính, khi dự án đang kêu gọi hoặc đang thực hiện.
- **Ai xem:** file chưa gắn khoản chi chỉ người tải lên; khoản chi chờ duyệt hoặc bị từ chối chỉ người điều phối và người phụ trách tài chính; khoản chi đã duyệt của dự án công khai thì ai cũng xem, như sao kê công khai. Không có quyền thì trả 404.
- **Phục vụ file:** `GET /api/files/:id` kèm `nosniff`, `Content-Security-Policy: sandbox`, `Cache-Control: private, no-store`.
- **Ảnh lớn:** trình duyệt thu nhỏ ảnh trên 3 MB về cạnh dài 1600 px, nén JPEG trước khi gửi.

## 4. Lý do lựa chọn

Đây là phương án duy nhất có file thật, bền qua các lần deploy Render, mà không thêm dịch vụ hay secret mới trước hạn nộp. Quyền xem đi theo trạng thái khoản chi, giống sao kê công khai của các nền tảng gây quỹ: chỉ công khai sau khi được duyệt.

## 5. Hệ quả và giới hạn

- Migration `0015_khanh_us2_us5_us8` thêm bảng `files` (bật RLS) và cột `receipt_file_id`; khoản chi cũ chỉ có `receipt_url` vẫn hiện link.
- File tải lên mà không gắn khoản chi (người dùng huỷ hộp thoại) vẫn nằm trong bảng; chưa có việc dọn định kỳ.
- Bản chạy thử trong trình duyệt (mock) không lưu file và báo 503 `UPLOAD_UNAVAILABLE` sau khi kiểm quyền.
- AI chưa đọc ảnh/PDF; upload chứng từ không tính là capability multimodal.

## 6. Bằng chứng và điều kiện xem lại

Source: [files.ts](../../packages/domain/src/files.ts), `canUploadReceipt`/`canViewReceipt` trong [rules.ts](../../packages/domain/src/rules.ts), [transparency.service.ts](../../be/src/modules/transparency/transparency.service.ts), [ExpenseDialog](../../fe/src/presentation/modules/transparency/components/ExpenseDialog.tsx), [ReceiptPreview](../../fe/src/presentation/modules/transparency/components/ReceiptPreview.tsx), [migration 0015](../../be/drizzle/0015_khanh_us2_us5_us8.sql).

Kiểm chứng: [API test](../../be/tests/integration/api.test.ts), E2E "US-5 chứng từ" trong [project-flow.spec.ts](../../fe/e2e/project-flow.spec.ts), [bằng chứng US-5](../evidence/us5-verification.md). Chạy thật: ảnh 16,5 MB thu về JPEG 1005 KB; file HTML khai là PNG bị từ chối 415.

Xem lại khi dung lượng file làm database gần chạm giới hạn gói Supabase, khi cần file lớn hơn 3 MB, hoặc khi có khoá dịch vụ lưu file: thay phần lưu trong repository bằng adapter object storage, giữ nguyên API và luật quyền.
