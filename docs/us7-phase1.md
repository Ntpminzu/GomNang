# US7 — Giai đoạn 1: một pipeline, trạng thái và metadata

Ghi nhận thay thế ngày 26/10: [chỉ Qwen/Ollama](chat-qwen-only.md). Các đoạn nhắc provider cloud/auth/parity bên dưới mô tả thiết kế tại mốc giai đoạn 1; adapter đó đã bị gỡ, không phải khả năng hiện tại hoặc điều kiện nghiệm thu còn hiệu lực.

Ngày triển khai: 26/10/2026. Đã sửa code và triển khai bảng log trên Supabase cấu hình trong `be/.env`; **chờ người dùng tự kiểm tra UI/model thật**. Chưa đóng US7.

Ghi nhận tiếp theo: [giai đoạn 2](us7-phase2.md) đã bổ sung guard input/history/nguồn và prompt chat hiện là `gomnang-rag-v3`. Các đoạn mô tả v2 bên dưới là mốc giai đoạn 1 sau chuyển manual index; không dùng kết quả kiểm chứng cũ để suy ra bản mới đã đạt.

Điều chỉnh sau giai đoạn 1: theo yêu cầu mới, chuyển sang [index thủ công bằng lệnh](rag-manual-index.md), chấp nhận nội dung index cũ; không auto-sync hoặc kiểm content freshness trong lượt hỏi. Giữ SQL lọc quyền công khai. Thay đổi này không cần migration mới và chưa chạy CLI trên DB thật.

## Phần đã làm

- Bỏ nhánh lời chào/danh mục trả lời cứng và helper cũ. Câu hỏi dự án đi qua RAG; không có nguồn thì từ chối. Giữ trang danh sách, hướng dẫn tìm dự án, thẻ nguồn và lời giới thiệu tĩnh khi widget trống.
- Prompt tập trung ở `chat.config.ts`: chat `gomnang-rag-v2` (bổ sung nguồn có thể cũ), query `gomnang-query-v1`. Sửa prompt sau này phải tăng version tương ứng.
- Một lượt gọi model sinh JSON nội bộ `{status: answered|refused, reply}`. Backend kiểm JSON/schema/citation trước khi trả đáp án. Không gọi model sửa JSON, retry hoặc đổi provider tự động. JSON này phục vụ US7, không được tính thành capability thứ hai của US8.
- HTTP 200 thêm `status`, `reasonCode`, `requestId`, `promptVersion`, giữ `reply`, `sources`, `generatedByModel`. Model từ chối được thay bằng lời từ chối an toàn của backend, không phát lại nội dung model và không sources.
- Sai JSON/schema, output rỗng hoặc sai/thiếu citation là HTTP 502 `failed`; provider/config không khả dụng 503, timeout 504, quota Gemini 429. Gemini vẫn cần JWT; lỗi xác thực 401/403 `failed`.
- History giả role system/developer/admin bị chặn HTTP 400, metadata `refused/HISTORY_ROLE_FORBIDDEN`; lỗi input khác là 400 `failed/BAD_REQUEST`. JSON hỏng/quá lớn bị chặn trước ranh giới chat nên chỉ có HTTP log 400/413.
- UI phân biệt trả lời có nguồn, từ chối và lỗi; hiện mã tra cứu, khôi phục câu hỏi khi lỗi để sửa/gửi lại, thông báo dữ liệu gửi provider. Chỉ cặp hỏi–đáp `answered` được gửi lại làm history; backend vẫn coi history là dữ liệu không đáng tin.

`answered` hiện nghĩa là đã qua schema/citation, **chưa chứng minh từng khẳng định đúng nguồn**. Guard riêng cho input/history/nguồn, kiểm lộ prompt, đổi chủ đề và deadline tiếp tục ở giai đoạn 2–4. Theo quyết định mới, bỏ mục kiểm freshness nội dung; chỉ mục cập nhật thủ công, quyền công khai vẫn lọc khi tìm. Gemini nghiệm thu model thật ở giai đoạn 5. Chưa streaming; US10 bổ sung nội dung tạm và bước kiểm cuối theo quyết định đã chốt.

## Luồng đọc code

```text
ChatWidget → askChat → Next proxy → chat.route
  → beginChatRequest: tạo metadata pending trước validation/auth
  → Zod → auth nếu Gemini → chat.controller → answerQuestion
    → history/query → kiểm index sẵn sàng → retrieve
    → không nguồn: refused/NO_EVIDENCE
    → có nguồn: client.complete → parseChatOutput → citationWarnings
  → finishChatRequest: ghi trạng thái cuối trước res.json
  → widget: câu trả lời/nguồn, từ chối hoặc lỗi
```

`chat.output.ts` kiểm envelope; `chat.telemetry.ts` quản lý metadata/lỗi của route; `chat.telemetry.repository.ts` truy vấn bảng log.

Top 5 là **chunk**, có thể gồm hướng dẫn hoặc nhiều chunk cùng dự án. Prompt yêu cầu chỉ nêu kết quả tìm được; không khẳng định toàn bộ danh sách, tổng số hoặc không có dự án từ retrieval. Danh sách chính thức ở `/`.

Lập chỉ mục bằng `npm.cmd run rag:index` trước khi hỏi hoặc sau thay đổi nguồn. Request không embedding document. Thiếu index đúng model trả `503/CHAT_INDEX_NOT_READY`; không tự tạo index.

## Log và dữ liệu

`chat_requests` chỉ backend truy cập: RLS bật, không browser policy, thu hồi quyền PUBLIC/anon/authenticated. Không chứa câu hỏi, history, output, nội dung nguồn, IP hay thông tin tài khoản.

- `id`: UUID nội bộ/khóa chính; `request_id`: mã tương quan HTTP có thể lặp vì client được gửi `x-request-id`. Dùng `id` để phân biệt bản ghi.
- Provider/model yêu cầu và model thực do provider báo được lưu riêng; thiếu thông tin thực thì `null`.
- `model_calls`, `embedding_calls`, `embedded_documents` đếm lần/khối lượng **đã thử gọi**, không bảo đảm provider xử lý thành công. `model_calls > 0` cho biết có gọi model, kể cả khi từ chối và API trả `generatedByModel=false`.
- Tokens generation lấy từ provider nếu có; unknown là `null`. Ollama tổng = input + output khi đủ hai số, thinking riêng để null; Gemini giữ tổng/thinking do provider báo. Chưa đo token embedding/cost; US9 hoàn thiện phần này.
- `lifecycle=pending` có thể còn khi process chết/mất DB giữa lượt; metadata pending chưa phải thống kê hoàn chỉnh. Chỉ `completed` mới có kết quả cuối. Latency đo từ bắt đầu log tới lúc chuẩn bị ghi kết quả, không phải latency riêng model.
- Log đầu/cuối thất bại → chat 503 `CHAT_LOG_UNAVAILABLE`; console chỉ mã tra cứu/log ID/code. Không bảo đảm luôn có bản ghi khi chính DB không truy cập được.

Chính sách đã chốt: cho AI dùng liên hệ cố ý công khai trong nội dung dự án, không thêm join bảng tài khoản. Bản nháp, dữ liệu tài khoản, secret và dữ liệu người thụ hưởng ngoài phạm vi công khai vẫn bị loại khỏi phạm vi cho phép. Lớp phát hiện nội dung độc hại còn triển khai ở giai đoạn 2.

## Migration đã triển khai

Migration `0012_us7_chat_requests` được sinh bằng Drizzle, bổ sung thu hồi quyền log. Runner riêng chỉ nhận baseline 0011 hoặc schema đã ở 0012; không dùng runner US1 để triển khai US7.

```powershell
# Từ root; mặc định preview, không apply
npm.cmd run db:deploy:us7 -w gomnang-api
# DB hiện tại đã được áp dụng; chỉ dùng để triển khai migration đã duyệt
npm.cmd run db:deploy:us7 -w gomnang-api -- --apply
```

Runner trả `committed`, 13 migrations; đã kiểm RLS/quyền/index/cột log, bảng log mới rỗng và checksum toàn bộ 11 bảng cũ không đổi. Trước triển khai có 28 projects, 10 users, 26 chat_chunks. Archive public+drizzle đã kiểm danh sách bảng bằng `pg_restore --list`; chưa diễn tập restore, không phải backup toàn bộ nền tảng Supabase.

Backup: `be/.data/supabase-us7-2026-10-25T17-57-43-956Z/`, gồm `application.dump`, `manifest.json`, `result.json`; `.data` bị Git ignore. Tên thư mục theo UTC, ngày tài liệu theo Việt Nam.

PostgreSQL startup từ nay **chỉ kiểm journal/hash**, dừng nếu thiếu migration/drift, không tự apply DDL. PGlite vẫn migrate riêng khi mở. Không reset, seed hay sửa dữ liệu nghiệp vụ trong triển khai này.

## Bạn tự dùng thử

Khởi động ở hai terminal tại root, giữ cấu hình hiện có; FE dùng HTTP và Ollama/embedding phải sẵn sàng:

```powershell
npm.cmd run dev:be
npm.cmd run dev:fe
```

| Ca | Thao tác | Điều cần quan sát |
| :-- | :-- | :-- |
| M1 | Hỏi “Cách tạo dự án?” bằng Ollama | Trả lời có nguồn, mở được trang hướng dẫn, có mã tra cứu |
| M2 | Hỏi mục tiêu/nhu cầu một dự án đang công khai thật | Khớp nguồn, không suy ra số tiền thực nhận |
| M3 | “Liệt kê các dự án công khai” | Qua RAG/model nếu có nguồn, hoặc từ chối nếu thiếu; không hứa danh sách đầy đủ/tổng số |
| M4 | Hội thoại mới, gửi “hi” | Không còn câu trả lời cứng; đi qua pipeline thường, không bắt buộc một câu chào cụ thể |
| M5 | Hỏi ngoài nguồn, sau đó hỏi lại câu hợp lệ | Phân biệt từ chối/lỗi; lượt từ chối vẫn hiện nhưng không được gửi làm history |
| M6 | Network → response POST `/api/chat` | Có status/reasonCode/requestId/promptVersion; không hiển thị JSON nội bộ của model lên UI |
| M7 | Tra request trong DB bằng SQL dưới | Metadata completed/version/trạng thái đúng; không chứa câu hỏi/output |

```sql
select id, request_id, requested_provider, requested_model, actual_model,
       prompt_version, query_prompt_version, lifecycle, status, reason_code,
       http_status, origin, model_calls, embedding_calls, embedded_documents,
       input_tokens, output_tokens, thinking_tokens, total_tokens, latency_ms
from public.chat_requests order by started_at desc limit 20;
```

Ca lỗi giả, race, nguồn độc hại và DB log lỗi kiểm tự động ở môi trường cô lập trong giai đoạn 6. Không cài nội dung độc hại vào dự án thật hoặc tắt dịch vụ dùng chung để thử lỗi.

Theo yêu cầu người dùng, lượt này **không chạy automated tests, typecheck, build, E2E hay eval**, không gọi model nghiệm thu thay người dùng. Chỉ sinh migration, kiểm an toàn trước/sau deploy, đọc đối chiếu source và cập nhật Graphify. Fixtures/test cũ đã sửa theo interface mới để chờ chạy giai đoạn 6; kết quả test refactor cũ không áp dụng cho thay đổi này.

Dừng ở giai đoạn 1, chờ kết quả tự thử trước giai đoạn 2.
