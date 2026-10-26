# RAG — lập chỉ mục thủ công

Cập nhật 26/10/2026 theo lựa chọn người dùng: chỉ cập nhật vector bằng lệnh; chatbot được phép dùng nội dung index cũ. Không kiểm hash nội dung dự án trong lượt hỏi.

## Cách dùng

Tại repository root, giữ cấu hình DB hiện có trong `be/.env`, bảo đảm Ollama và embedding model đang hoạt động:

```powershell
npm.cmd run rag:index
```

Lệnh tương đương: `npm.cmd run rag:index -w gomnang-api`. CLI chỉ đọc `DATABASE_URL`, `OLLAMA_BASE_URL`, `OLLAMA_EMBEDDING_MODEL`; không cần JWT, Google OAuth hoặc cấu hình generation để index. CLI yêu cầu PostgreSQL, không tự fallback/tạo PGlite.

Chạy lần đầu, hoặc chạy lại sau khi công khai/sửa/thu hồi dự án, sửa nhu cầu/hướng dẫn, thay chunking hoặc embedding model. CLI không cần chạy mỗi lần hỏi. Sau khi index thành công, chat dùng được ngay, không cần restart để nạp lại index. Nếu backend đang chạy code cũ không watch, restart một lần để áp dụng thay đổi code.

CLI đọc nguồn công khai, dựng chunks, so ID/hash/model rồi embedding **chỉ chunk mới hoặc thay đổi**. Không đổi thì không embedding document. Chunk không còn trong bộ nguồn được xóa khỏi `chat_chunks`; không xóa dự án hoặc dữ liệu nghiệp vụ. Đổi embedding model sẽ tạo lại vector cho các chunk cần chuyển model.

Summary JSON gồm `added`, `updated`, `removed`, `unchanged`, `total`, `model`, `durationMs`; không in nội dung nguồn hoặc connection URL. Thư viện index vẫn ở `chat.retrieval.ts`, entrypoint ở `be/scripts/index-chat.ts`.

Giai đoạn 2 bổ sung guard: loại document có dấu hiệu injection/credential trước chunking, kiểm chunks/URL trước embedding. Summary thêm `excludedProjects` (dự án bị loại ở lớp document) và `excluded` (chunk bị loại khi gọi index trực tiếp). Prune chỉ tác động derived vector, không sửa/xóa dữ liệu dự án gốc. Chat còn kiểm candidates từ index cũ trước prompt; [chi tiết](us7-phase2.md).

## Luồng chạy

```text
Lệnh rag:index
  → đọc snapshot nguồn công khai + needs
  → buildChatChunks → so hash/model
  → embedDocuments phần thay đổi, batch 32
  → kiểm nguồn chưa đổi từ lúc bắt đầu
  → transaction upsert/prune → summary

Lượt chat
  → metadata pending → validate/auth
  → selectHistory → buildRetrievalQuestion
  → kiểm có index cho embedding model
  → embedQuery → pgvector/public-status filter/top 5
  → model → kiểm JSON/citation → metadata completed → trả kết quả
```

Trong request chat không có `listPublicChatSources`, `buildChatChunks`, `createIndex` hoặc `embedDocuments`. Metadata `embedded_documents=0`; `embedding_calls` vẫn tăng khi embedding câu hỏi. Lần chạy CLI không bị ghi giả thành một chat request.

## Dữ liệu cũ và quyền

- Bot dùng text/title/URL của lần index gần nhất; không đọc lại nội dung/needs để kiểm freshness. Dự án mới chưa index có thể không tìm được. Nội dung hoặc nhãn trạng thái trong excerpt có thể cũ dù dự án vẫn công khai.
- SQL vẫn kiểm **trạng thái công khai hiện tại** trước topK. Dự án đã chuyển sang draft/pending không được tìm thấy dù row vector cũ còn trong DB. Đây là kiểm quyền ở thời điểm truy vấn, không phải bảo đảm nguyên tử xuyên lúc model sinh câu trả lời.
- Guides dùng bản đã index, thay guides cũng cần chạy lại lệnh. Không tự đọc lại file hướng dẫn trong lượt hỏi.
- Có index đúng model nhưng không match → `200 refused/NO_EVIDENCE`. Không có chunk cho model hiện tại → `503 failed/CHAT_INDEX_NOT_READY`; không tự index ở nhánh lỗi.
- Không dùng `INDEX_UPDATE_REQUIRED` hay kiểm cả nhóm nguồn như phương án đã đề xuất trước đó. Chấp nhận nội dung cũ là thay đổi yêu cầu được người dùng chốt; không được coi đây là freshness đầy đủ của US7.
- Chuyển manual index đã tăng prompt lên v2; giai đoạn 2 hiện dùng `gomnang-rag-v3`, thêm quy tắc nguồn/history và contact công khai, vẫn giữ nhắc nguồn có thể cũ. Query instruction vẫn `gomnang-query-v1`. Widget nhắc kiểm tra trang dự án.

## An toàn và lỗi của CLI

Chỉ cập nhật bảng derived data `chat_chunks`; không seed/reset/migrate hoặc ghi các bảng nghiệp vụ. Schema PostgreSQL phải được triển khai sẵn. Kết nối phải là PostgreSQL trực tiếp hoặc pooler chế độ session; không dùng transaction pooler (các endpoint Supabase cổng 6543). Kết nối session Supabase hiện tại cổng 5432 phù hợp thiết kế.

Một advisory lock cố định trên connection riêng ngăn hai CLI cùng index một DB; lệnh sau báo `INDEX_BUSY`. Custom transaction pooler cũng không được hỗ trợ dù dùng port khác. Không tự bỏ khóa hoặc reconnect để tiếp tục save sau khi mất session.

CLI không giữ transaction trong lúc gọi embedding. Tất cả embedding thay đổi phải hoàn tất trước khi ghi; lỗi batch không ghi một phần hoặc prune index cũ. Snapshot nguồn/needs được đọc nhất quán; nếu khác lúc kiểm trước save thì hủy transaction với `INDEX_SOURCE_CHANGED`, người vận hành chạy lại. Nguồn vẫn có thể thay đổi sau lần kiểm cuối; lựa chọn này không bảo đảm kiến thức luôn mới.

## Tự kiểm tra

1. Chạy lệnh trên và xem summary; chạy lại khi dữ liệu không đổi thì mong đợi `added=0`, `updated=0`, `removed=0`.
2. Hỏi mục tiêu/nhu cầu của một dự án đã index; kiểm nguồn mở được.
3. Sau thay đổi nghiệp vụ được phép, chưa chạy lệnh: bot có thể vẫn dùng nội dung cũ. Sau khi chạy lại, bot dùng chunk cập nhật.
4. Xem `chat_requests`: lượt chat không embedding document; vẫn có query embedding và model call nếu tìm thấy nguồn.

Không thêm ca giả độc hại vào DB thật hoặc sửa trực tiếp dữ liệu nghiệp vụ chỉ để thử. Ca missing/wrong-model index, source changed, batch failure, no-op và private-project dùng fixtures cô lập trong `chat-manual-index.test.ts`, `chat-index.test.ts`, API/E2E fixtures.

Trong lượt thay đổi này: **không chạy CLI trên DB thật, không gọi model, không chạy tests/typecheck/build/E2E/eval** theo yêu cầu người dùng. Tests/fixtures đã cập nhật để chờ giai đoạn kiểm tra tự động cuối. Chỉ đọc đối chiếu source/callers, kiểm diff và refresh Graphify; chưa xác nhận runtime của CLI.
