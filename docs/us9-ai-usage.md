# US-9 — Quản trị mức sử dụng AI

Phạm vi: metadata chat, embedding query tokens, aggregate API và dashboard admin. An phụ trách BE, Khanh phụ trách FE; nghiệm thu người dùng còn chờ kiểm tra thực tế. Không xử lý Render hoặc US-8/US-10.

## Luồng dữ liệu

`chat.embedding.ts` trả `{ embedding: number[], tokens: number | null }` cho `embedQuery`. `tokens` lấy từ `prompt_eval_count` nguyên không âm hợp lệ của Ollama; không suy từ độ dài văn bản. `embedDocuments` vẫn trả `number[][]`, không đo chi phí index trong US9.

`chat.service.ts` cộng usage đã biết vào `ChatRun.embeddingTokens`; retrieval dùng vector. Metadata được thử ghi một lần khi response đóng. Embedding thành công rồi model thất bại vẫn giữ usage embedding. Lỗi embedding hoặc thiếu usage giữ null. Nếu tương lai có nhiều lần embed, tổng chỉ gồm những lần đo được, chưa có bộ đếm mức đầy đủ từng call.

`chat_requests.embedding_tokens integer NULL` được bổ sung bởi migration 0014; dữ liệu lịch sử giữ NULL. Không lưu câu hỏi, history, output, IP hoặc tài khoản vào bảng này.

## API và khoảng đo

`GET /api/admin/ai-usage`: 401 nếu chưa đăng nhập, 403 nếu user/verifier, 200 cho admin, `Cache-Control: no-store`. Contract TypeScript: [ai-usage.ts](../packages/domain/src/ai-usage.ts).

- `period=24h|7d|30d`, mặc định 7d: `[now - N ngày, now)`.
- Hoặc `from=YYYY-MM-DD&to=YYYY-MM-DD`: trọn ngày Việt Nam, từ 00:00 ngày đầu tới trước 00:00 ngày sau ngày cuối, kẹp cuối tại now.
- Tối đa 92 ngày lịch bao gồm cả hai ngày; kiểm tra trước khi kẹp now. `from` không được sau hôm nay Việt Nam.
- Khóa lạ, giá trị rỗng/lặp/dạng mảng, thiếu một đầu, truyền preset cùng ngày, ngày không có thật hoặc thứ tự sai: 400 BAD_REQUEST có details.
- Lọc theo `started_at >= from AND started_at < to`, kể cả request bắt đầu trước khoảng nhưng hoàn tất trong khoảng sẽ không được tính. Request chưa hoàn tất/chưa ghi log chưa xuất hiện.
- Response trả khoảng chuẩn hóa bằng ISO và timezone `Asia/Ho_Chi_Minh`.
- Totals, byReason và recent đọc trong một transaction read-only repeatable-read. Recent tối đa 50 dòng mọi status, `started_at DESC, request_id DESC`; chỉ chọn cột metadata trong contract.
- DB lỗi trả 500 qua errorHandler. FE gọi HTTP trực tiếp, hiện ErrorAlert và nút thử lại; không tạo mock adapter. Chế độ mock-only có thể hiện lỗi.

## Công thức, mẫu số và đơn vị

| Trường | Ý nghĩa |
| --- | --- |
| totals.requests | Số request đã ghi nhận trong khoảng |
| answered/refused/failed | Đếm theo status; tổng bằng requests |
| modelOrigin/ruleOrigin/unknownOrigin | Đếm origin model/rule/null; không đồng nghĩa số lần model thành công |
| llmCalls/embeddingCalls | Tổng trường đếm lần thử gọi; không suy từ origin |
| latency.avgMs | Tổng latency_ms / requests, gồm mọi status và reply rule; đơn vị ms |
| tokens.total | Tổng generation total_tokens đã biết, không gồm embedding |
| tokens.totalDenominator | Số request có total_tokens khác NULL, gồm giá trị 0 thật |
| avgTotalPerMeasuredRequest | tokens.total / totalDenominator; token/request đo được |
| tokens.embedding và embeddingDenominator | Tương tự, dùng embedding_tokens của câu hỏi |
| avgEmbeddingPerMeasuredRequest | embedding / embeddingDenominator; token/request đo được |
| cost.kind | local-no-api-bill; chi phí TB/request không áp dụng (local), chưa đo điện/phần cứng |
| tools.tracked | false: pipeline RAG hiện không gọi tools LLM; rà lại khi US-8 được chốt |

Mẫu số 0 → trung bình NULL. Không có request → tổng tokens 0; có request nhưng không có số đo → tổng NULL. NULL hiển thị “—”. Tổng có dữ liệu đo một phần được ghi nhãn “đã đo được”, kèm số request có số đo. Không chuyển NULL từng request thành 0. COUNT/SUM/AVG được cast rõ sang int/float8 để JSON không chứa số dạng string trên pg.

Ví dụ ba request latency 100/200/300 ms, generation 30/NULL/0, embedding 5/NULL/0: latency TB 200 ms (mẫu số 3), generation tổng 30, TB 15 (mẫu số 2), embedding tổng 5, TB 2.5 (mẫu số 2).

## Giới hạn quan sát

- Best-effort logging có thể thiếu dòng; số trên dashboard là số đã ghi nhận. Request JSON sai cú pháp/quá lớn có thể bị parser chặn trước telemetry.
- Chat chưa rate limit nên lượng request có thể bị thổi phồng. Index theo started_at và giới hạn 92 ngày không phải bằng chứng hiệu năng ở mọi quy mô.
- Latency gồm cả lỗi nhanh/rule; không phải thời gian riêng model. Khi US-10 streaming được triển khai phải rà lại lifecycle và latency tới kết thúc stream.
- Chưa đo token index tài liệu, chi phí vận hành thực, tools, biểu đồ, percentile hoặc cache.

## Triển khai Supabase

`npm.cmd run db:deploy:us9 -w gomnang-api` chạy preview; thêm `-- --apply` để apply. Chỉ chấp nhận Supabase và journal đúng chuỗi ở mốc 14 hoặc 15 migrations.

Apply giữ advisory lock, SHARE lock các bảng, backup public+drizzle bằng pg_dump và kiểm danh mục pg_restore, checksum 11 bảng nghiệp vụ và toàn bộ chat metadata trừ cột mới. Thêm cột và journal trong transaction; xác nhận nullable, identity/PK, RLS không policy, quyền anon/authenticated, dữ liệu cũ giữ NULL và checksum không đổi trước COMMIT. Chạy lại xác nhận already_current. Backup không đồng nghĩa đã diễn tập restore.

Theo chỉ đạo người dùng, cập nhật Supabase trong phạm vi US9, không xử lý Render. Backend nối Supabase cần dùng checkout có migration 0014; frontend không quản lý migration DB.

## Acceptance tests

| AC | Kiểm chứng tự động |
| --- | --- |
| A1 — embedding usage, không bịa số | chat-embedding-usage.test.ts: usage hợp lệ/thiếu/sai/0, giữ embedDocuments; model lỗi sau embed, embedding lỗi |
| A1 — migration bảo toàn | chat-log-migration.test.ts: dữ liệu cũ, NULL, cột integer nullable, RLS, identity; runner Supabase kiểm checksum/quyền/backup |
| A2 — công thức | admin-ai-usage.test.ts: ví dụ số đã nêu, status/origin/calls, unknown/empty/measured-zero |
| A2 — khoảng đo | Preset/default, ngày Việt Nam lúc UTC còn ngày trước, ngày nhuận/sai, 92/93 ngày trước clipping, biên [from,to) |
| A2 — dữ liệu gần nhất | Giới hạn 50, thứ tự và danh sách cột được phép |
| A3 — quyền/API | Guest 401, user/verifier 403, admin 200, no-store và JSON number/null |
| A3 — FE | ai-usage.spec.ts: auth/loading/empty/filter/400/500/retry/mobile/metadata; response filter cũ không đè filter mới |

Lệnh kiểm tra từ repo root: `npm.cmd test`, `npm.cmd run typecheck`, `npm.cmd run build`, `npm.cmd run test:e2e -- ai-usage.spec.ts`. E2E tự mở BE 4100/FE 3100 và DB PGlite tạm, không đọc DATABASE_URL hoặc .env backend; cần browser Playwright và hai cổng trống.

Kiểm PostgreSQL sau apply dùng query repository thật trên driver pg, không seed dữ liệu giả lên Supabase. Kiểm model Ollama thật tách khỏi tests fixture. Kết quả và trạng thái human review ghi tại [evidence](evidence/us9-verification.md).
