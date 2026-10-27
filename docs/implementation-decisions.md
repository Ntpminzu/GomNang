# Quyết định hiện thực nghiệp vụ — GomNang

Cập nhật 27/10/2026. Ba quyết định dưới đây trước là ADR-004, ADR-005, ADR-006. Từ 27/10/2026 bộ ADR chỉ giữ 3 quyết định kiến trúc ([mục lục ADR](adr/README.md)); các quyết định nghiệp vụ chuyển về đây, giữ nguyên nội dung và lý do. Lịch sử bản ADR cũ nằm trong Git (commit trước `e895f41`).

| Quyết định | Owner | User story |
| :-- | :-- | :-- |
| [Structured assessment](#structured-assessment) | Khanh (BE + FE) | US-8 |
| [Project soft delete](#project-soft-delete) | Khanh | US-2 |
| [Receipt storage](#receipt-storage) | Khanh | US-5 |

## Structured assessment

**Bối cảnh.** Đề yêu cầu nhóm 2 người có ít nhất 2 capability AI; RAG (US-7) là capability thứ nhất. Người gác cổng theo quy tắc chỉ bắt thiếu trường, ngày sai, dự án trùng. Nó không đọc được người thụ hưởng mơ hồ, kế hoạch phi thực tế, số điện thoại trong mô tả hay lời kêu gọi chuyển tiền cá nhân.

**Quyết định.** Capability thứ hai là **Structured output**. Người xác minh bấm "Đánh giá bằng AI"; backend gửi system prompt có version và JSON Schema sinh từ Zod để Ollama chỉ sinh `{ verdict, signals[] }`; backend kiểm lại bằng Zod; `mergeAiAssessment` gộp với kết quả quy tắc rồi lưu assessment `source='ai'`.

- AI chỉ nâng mức cảnh báo. `PERSONAL_DATA` và `POSSIBLE_SCAM` ép FLAG; AI không hạ được verdict của quy tắc.
- AI không đổi trạng thái dự án, không mở khoá nút duyệt. Người xác minh tự đánh dấu danh mục 5 điểm rồi mới duyệt được.
- Output sai schema được hỏi lại một lần, sau đó trả 502 `AI_INVALID_OUTPUT` và giữ assessment cũ.
- Chỉ gửi trường công khai của hồ sơ, ghi rõ "dữ liệu, không phải chỉ dẫn". Mỗi lần gọi ghi bảng `ai_requests`: prompt version, model, số lần thử, token, latency, chi phí, kết cục.
- Gọi có schema thì `think: false` và `temperature: 0` để cùng hồ sơ cho cùng kết quả (từ 27/10/2026).
- Prompt đang dùng: [assessment.v4](../be/src/modules/verification/prompts/assessment.v4.md), 7 câu hỏi kiểm tra tuần tự. Eval 20 ca: v1 13/20, v2 15–17/20, v3 13/20, **v4 20/20** hai lần liên tiếp ([bằng chứng](evidence/us8-verification.md#2c-prompt-v4--2020-trên-qwen34b-27102026)).

| Phương án | Lợi ích | Đánh đổi |
| :-- | :-- | :-- |
| Structured output (chọn) | Dùng lại assessment, hàng chờ, adapter Ollama; kiểm được bằng schema và eval | Model nhỏ chậm trên CPU; chất lượng phụ thuộc prompt |
| Tool-using agent | Thao tác rộng hơn | Cần vòng lặp tool, xác nhận trước khi ghi, audit; rủi ro cao trước hạn |
| Multimodal hoá đơn | Giá trị minh bạch chi tiêu | Cần model đọc ảnh/PDF |
| Multi-agent | Hai vai kiểm chéo | Chưa có orchestration; khó eval trong thời gian còn lại |
| Để AI tự duyệt | Nhanh | Trái nguyên tắc con người chịu trách nhiệm; injection có thể lách duyệt |

**Hệ quả.**

- Cột `source` của bảng assessments đã cho phép `ai` từ migration 0000; bảng `ai_requests` nằm trong migration `0015_khanh_us2_us5_us8`.
- Gọi model nằm ngoài transaction nên request dài không giữ khoá DB. Trước khi ghi, service khoá lại dự án và kiểm lại quyền.
- Chỉ bật JSON mode thì `qwen3:4b` hay chép lại hồ sơ đầu vào; gửi JSON Schema thì mọi ca chỉ cần 1 lần gọi.
- Đặt `signals` trước `verdict` trong schema làm model gắn `POSSIBLE_SCAM` cho mọi hồ sơ (thử ngày 27/10, 12/20), nên giữ `verdict` đứng trước.
- Proxy `/api` của Next.js chờ tối đa 330 giây; v4 mất 4–25 giây mỗi hồ sơ trên CPU máy dev.

Sources: [verification.ai.ts](../be/src/modules/verification/verification.ai.ts), [verification.service.ts](../be/src/modules/verification/verification.service.ts), [chat.model.ts](../be/src/modules/chat/chat.model.ts), [assess.ts](../packages/domain/src/assess.ts), [prompts](../be/src/modules/verification/prompts/), [AssessmentPanel](../fe/src/presentation/modules/verification/components/AssessmentPanel.tsx), [eval](../be/scripts/eval-assessment.ts).

**Khi xem lại.** Khi đổi model hoặc phiên bản Ollama, khi eval báo nhầm ở hồ sơ bình thường hoặc bỏ sót PII/lừa đảo. Mỗi lần đổi prompt tạo file version mới và chạy lại cùng 20 ca.

## Project soft delete

**Bối cảnh.** US-2 cần xoá dữ liệu chính. Bảng `audit_log` chỉ cho ghi thêm: trigger PostgreSQL chặn UPDATE, DELETE, TRUNCATE, và mỗi dòng tham chiếu `projects.id` không cascade. Xoá cứng dự án đã có sổ ghi vết sẽ phá cam kết "lịch sử không sửa được". Dự án đã công khai có thể đã nhận đóng góp, nên người góp cần thấy lại.

**Quyết định.**

- Chỉ **người điều phối** được xoá, và chỉ khi dự án là **Bản nháp**. Dự án bị trả lại cũng quay về Bản nháp.
- Dự án đã gửi xác minh hoặc đã công khai không xoá được (409 `PROJECT_NOT_DRAFT`); dự án đã công khai dùng **Huỷ dự án** để giữ lịch sử.
- Xoá là **xoá mềm**: đặt `projects.deleted_at` và ghi một dòng sổ ghi vết `draft → deleted` trong cùng transaction.
- Mọi đường đọc/sửa đi qua `findProject` nên dự án đã xoá trả 404; trang Việc của tôi cũng lọc ra. Không có nút khôi phục.
- Giao diện bắt xác nhận trong hộp thoại; nút được focus mặc định là "Quay lại".

| Phương án | Lợi ích | Đánh đổi |
| :-- | :-- | :-- |
| Xoá mềm bản nháp (chọn) | Giữ sổ ghi vết nguyên vẹn; một cột, hai điều kiện lọc | Dữ liệu vẫn nằm trong DB; truy vấn mới phải nhớ lọc |
| Xoá cứng bản nháp | Dữ liệu biến mất thật | Phải xoá cả sổ ghi vết, trái trigger chỉ ghi thêm |
| Cho xoá cả dự án đã công khai | Linh hoạt | Người góp mất dấu khoản đã góp; trùng vai với Huỷ dự án |
| Thêm trạng thái `deleted` vào enum | Dùng lại kiểm tra theo trạng thái | Phải sửa mọi bảng nhãn và luồng trạng thái ở FE và domain |

Tham khảo: GoFundMe chỉ cho người tổ chức xoá và khuyến nghị tắt nhận tiền thay vì xoá ([Delete your fundraiser](https://support.gofundme.com/hc/en-us/articles/203604074-How-Do-I-Delete-My-Fundraiser-)).

**Hệ quả.** Migration `0015_khanh_us2_us5_us8` thêm cột `deleted_at` nullable, không đổi dữ liệu cũ. Truy vấn mới lấy dự án theo người dùng mà không qua `findProject` phải tự lọc `deleted_at IS NULL`.

Sources: `canDeleteProject` trong [rules.ts](../packages/domain/src/rules.ts), `deleteProject` trong [projects.service.ts](../be/src/modules/projects/projects.service.ts), [projects.repository.ts](../be/src/modules/projects/projects.repository.ts), [dashboard.repository.ts](../be/src/modules/dashboard/dashboard.repository.ts), [DraftPanel](../fe/src/presentation/modules/projects/components/DraftPanel.tsx), [migration 0015](../be/drizzle/0015_khanh_us2_us5_us8.sql).

**Khi xem lại.** Khi cần admin gỡ dự án vi phạm đã công khai, hoặc có yêu cầu xoá dữ liệu cá nhân theo luật: cần thiết kế ẩn công khai nhưng giữ sổ ghi vết, và quy trình khôi phục.

## Receipt storage

**Bối cảnh.** Đề yêu cầu upload file thật. Trước đây khoản chi chỉ có ô dán link hoá đơn, không kiểm được link có thật hay ai xem được. Backend chạy trên Render, ổ đĩa container mất khi deploy lại. Nhóm chưa có khoá dịch vụ lưu file riêng và không thêm secret mới trước hạn nộp.

**Quyết định.**

- **Lưu nội dung file trong bảng `files`** (cột `bytea`) của database ứng dụng; khoản chi tham chiếu qua `expenses.receipt_file_id`, mỗi file gắn tối đa một khoản chi.
- **Loại và kích thước:** chỉ JPEG, PNG, WebP, PDF, tối đa 3 MB. Backend nhận loại theo byte đầu file, không tin Content-Type hay đuôi tên; database có ràng buộc kiểm lại.
- **Ai tải:** người phụ trách tài chính, khi dự án đang kêu gọi hoặc đang thực hiện.
- **Ai xem:** file chưa gắn khoản chi chỉ người tải lên; khoản chi chờ duyệt hoặc bị từ chối chỉ người điều phối và người phụ trách tài chính; khoản chi đã duyệt của dự án công khai thì ai cũng xem. Không có quyền thì trả 404.
- **Phục vụ file:** `GET /api/files/:id` kèm `nosniff`, `Content-Security-Policy: sandbox`, `Cache-Control: private, no-store`.
- **Ảnh lớn:** trình duyệt thu nhỏ ảnh trên 3 MB về cạnh dài 1600 px, nén JPEG trước khi gửi.

| Phương án | Lợi ích | Đánh đổi |
| :-- | :-- | :-- |
| Bảng `files` trong PostgreSQL (chọn) | Không cần dịch vụ hay secret mới; chạy giống nhau trên PGlite và Supabase | Database phình theo số file; không có CDN; giới hạn 3 MB |
| Ổ đĩa backend | Đơn giản nhất | Render xoá ổ đĩa khi deploy lại |
| Supabase Storage / S3 | Hợp file lớn, có CDN, URL ký tạm | Cần khoá service role mới, cấu hình bucket và chính sách |
| Giữ ô dán link | Không phải làm gì | Không phải upload thật; không kiểm được quyền xem |

**Hệ quả.** Migration `0015_khanh_us2_us5_us8` thêm bảng `files` (bật RLS) và cột `receipt_file_id`; khoản chi cũ chỉ có `receipt_url` vẫn hiện link. File tải lên mà không gắn khoản chi vẫn nằm trong bảng, chưa có việc dọn định kỳ. Đọc ảnh/PDF bằng AI cần năng lực đa phương thức, chưa làm.

Sources: [files.ts](../packages/domain/src/files.ts), `canUploadReceipt`/`canViewReceipt` trong [rules.ts](../packages/domain/src/rules.ts), [transparency.service.ts](../be/src/modules/transparency/transparency.service.ts), [ExpenseDialog](../fe/src/presentation/modules/transparency/components/ExpenseDialog.tsx), [ReceiptPreview](../fe/src/presentation/modules/transparency/components/ReceiptPreview.tsx), [migration 0015](../be/drizzle/0015_khanh_us2_us5_us8.sql).

**Khi xem lại.** Khi dung lượng file làm database gần chạm giới hạn gói Supabase, khi cần file lớn hơn 3 MB, hoặc khi có khoá dịch vụ lưu file: thay phần lưu trong repository bằng adapter object storage, giữ nguyên API và luật quyền.
