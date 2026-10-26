# Cấu trúc RAG GomNang sau refactor

Cập nhật 26/10/2026: giữ pgvector, chuyển sang [index thủ công](rag-manual-index.md) theo yêu cầu mới. Chat dùng bản index gần nhất dù cũ; không còn tự đồng bộ. Chưa nghiệm thu toàn bộ US7; xem [giai đoạn 1](us7-phase1.md).

## Đọc code từ đâu?

Bắt đầu tại [answerQuestion](../be/src/modules/chat/chat.service.ts). Hàm này điều phối; mỗi bước có trách nhiệm riêng:

```text
ChatWidget → askChat → Next proxy → chat.route
  → metadata pending → Zod → chat.controller → answerQuestion
    → guard câu hỏi + toàn bộ history trước khi chọn/cắt history
    → kiểm provider đã cấu hình
    → selectHistory
    → buildRetrievalQuestion
    → kiểm index đúng embedding model đã có
    → retrieve → embedQuery → selectSources (SQL pgvector)
    → guard title/excerpt/ID/URL của candidates trong index cũ
    → không nguồn: refused/NO_EVIDENCE, không gọi chat model
    → buildMessages
    → client.complete (Qwen qua Ollama)
    → parseChatOutput: JSON {status, reply}
    → model từ chối: lời từ chối backend, không sources
    → citationWarnings
    → citation sai/thiếu hoặc JSON/schema sai: chặn output, HTTP 502 failed
    → ghi metadata completed trước khi trả
    → reply + sources + generatedByModel + status/reasonCode/requestId/promptVersion
```

## Đối chiếu với repo mẫu

| Repo mẫu | GomNang | Khác biệt có chủ đích |
| :-- | :-- | :-- |
| `config.js` | [chat.config.ts](../be/src/modules/chat/chat.config.ts) | Giới hạn RAG + system prompt/instruction; provider/env vẫn ở config hiện tại |
| `readDocuments` | `projects.listPublicChatSources` + `CHAT_GUIDES` | Chỉ chạy khi index, đọc dữ liệu DB/hướng dẫn GomNang |
| `chunkText` / `chunkMarkdown` | `chunkText` + `buildChatChunks` trong [retrieval](../be/src/modules/chat/chat.retrieval.ts) | Giữ thuật toán cắt theo ranh giới từ, metadata và ID hiện tại; không yêu cầu heading Markdown dạng số |
| `createIndex` | `createIndex` trong retrieval + `be/scripts/index-chat.ts` | Chạy riêng bằng `npm.cmd run rag:index`; incremental, không chạy trong chat |
| `loadIndex` | Không cần hàm riêng | Metadata đọc từ DB khi sync, vector được tìm bằng SQL |
| `retrieve` | `retrieve` trong retrieval | Embed câu hỏi rồi gọi repository |
| `rankChunks` / `selectSources` | `selectSources` trong [repository](../be/src/modules/chat/chat.repository.ts) | SQL cosine/model/public-status filter trước LIMIT; không tính toàn bộ vector bằng JavaScript |
| `selectHistory`, `buildRetrievalQuestion` | [chat.rag.ts](../be/src/modules/chat/chat.rag.ts) | Dùng cặp hỏi–đáp gần nhất, câu user giúp hiểu câu nối tiếp |
| `buildMessages`, `citationWarnings` | `chat.rag.ts` | Nguồn là JSON; citation `[n]`; thiếu/sai citation thì chặn output |
| `generationPayload`, `generateAnswer` | `chat.model.ts`: `client.complete` | Chỉ Qwen/Ollama; JSON mode và usage/model nếu provider báo |
| `answerQuestion` | [chat.service.ts](../be/src/modules/chat/chat.service.ts) | Một pipeline RAG; không còn nhánh lời chào/danh mục riêng |

## Chỉ mục và dữ liệu

- Chunk mục tiêu 800 ký tự, overlap khoảng 120 ký tự; cắt theo từ. Một từ quá dài có thể vượt mục tiêu 800. Đây không phải token budget.
- `createIndex` chỉ được CLI/fixture gọi: đọc metadata/nội dung cũ (không tải vector), so hash thực/hash lưu/model, embed chunk mới/đổi theo batch 32 rồi transaction upsert/prune. Không đổi thì không embedding document. CLI giữ session advisory lock giữa các tiến trình và kiểm snapshot nguồn trước save; không giữ transaction khi gọi Ollama.
- Embedding phải hoàn tất trước khi ghi transaction; lỗi batch không được ghi một phần hay xóa chỉ mục cũ. Request lỗi dừng lại, không dùng chỉ mục cũ để tiếp tục generation.
- `selectSources` giữ hướng dẫn có `projectId = null` hoặc dự án còn thuộc `PUBLIC_PROJECT_STATUSES`, lọc model/similarity trước top 5. Similarity phải lớn hơn 0,35.
- Chỉ mục vẫn ở `chat_chunks`, vector 1024 chiều. Refactor nền không đổi schema; giai đoạn 1 thêm riêng `chat_requests`, không reset/seed dữ liệu.
- Queue thư viện bảo vệ cùng đối tượng DB; CLI PostgreSQL còn khóa session chống lệnh khác chạy đồng thời. Chat không kiểm hash nội dung mới hoặc dựng chunk. Quyền vẫn lọc theo trạng thái công khai lúc SQL truy vấn; không hứa quyền/nội dung nguyên tử xuyên lúc model sinh đáp án.

Lệnh index đọc nguồn công khai + needs, dựng chunk rồi lưu vector. Request chỉ `embedQuery` và tìm trong pgvector. Nội dung dự án/hướng dẫn đã sửa chưa index lại vẫn là bản cũ; dự án mới chưa index có thể không tìm thấy. Thiếu index đúng model trả 503 `CHAT_INDEX_NOT_READY`, không tự tạo. Metadata chat `embeddedDocuments=0`.

## History và câu hỏi nối tiếp

HTTP contract vẫn tối đa 8 turns user/assistant, 3000 ký tự mỗi turn. `selectHistory` chỉ dùng các cặp user → assistant liền nhau, bỏ lượt lẻ, chọn tối đa 3 cặp mới nhất. Sau khi bỏ citation cũ trong assistant, trim và cắt tối đa 1000 ký tự/turn, tổng nội dung được chọn không quá 4000 ký tự. Assistant chỉ chứa citation được thay bằng placeholder. Các cặp trả theo thứ tự thời gian.

Giai đoạn 3: `isFollowUpQuestion` chọn history chỉ khi câu hiện tại nối tiếp như “dự án đó”, “sau đó”, “nhu cầu?”. Khi đó `buildRetrievalQuestion` ghép tối đa hai câu user (350 ký tự/câu). Câu mới độc lập không nhận history cũ trong query hoặc generation; assistant không đưa vào query embedding. Chỉ nguồn của lượt hiện tại là chứng cứ. Đây là heuristic ngữ cảnh, không phải classifier ngoài phạm vi.

Ví dụ: hỏi “Dự án Mùa Sen Tím có mục tiêu gì?”, sau đó “Dự án đó cần những gì?” — query thứ hai có thêm câu hỏi trước để xác định chủ đề. Đây là ghép chuỗi, không phải LLM rewrite query.

Ngữ cảnh cũ có thể gây nhiễu khi chuyển chủ đề hoặc hỏi ngoài phạm vi. Test wiring không chứng minh model từ chối đúng các ca này. Guardrails US-7 phải kiểm câu hiện tại, history và nguồn; không tin câu trả lời cũ hay chỉ dẫn độc hại trong history.

## Ranh giới US-7 và kiểm chứng

Giai đoạn 1 thêm version, trạng thái/metadata/UI. [Giai đoạn 2](us7-phase2.md) thêm guard pattern input/history, document trước chunking và chunk trước embedding, title/excerpt/ID/URL khi đọc index cũ. Loại nhóm nguồn bị phát hiện không an toàn, không sửa bản ghi gốc; vẫn cho contact dự án công khai. Guard chưa hiểu mọi cách lách, chưa eval model thật; kiểm output lộ prompt đầy đủ/semantic scope vẫn để giai đoạn 3, eval để giai đoạn 6. Citation hợp lệ chưa chứng minh đúng nguồn. Chưa streaming.

Top 5 là chunk, không phải toàn bộ danh mục hoặc 5 dự án khác nhau. Không có nguồn không đồng nghĩa không có dự án. Trang danh sách là `/`. Model từ chối không được phát lại nguyên output; API trả lời từ chối của backend, metadata vẫn ghi có gọi model.

[Giai đoạn 3](us7-phase3.md) thêm deadline chung, provider body read có giới hạn, pool PostgreSQL riêng cho chat và kiểm output secret/prompt theo mẫu. Chưa chạy kiểm chứng; không suy ra mọi OOS hoặc mọi câu sai nguồn đều bị chặn.

Tests liên quan: [history/prompt/citation](../be/tests/integration/chat-rag.test.ts), [index/retrieval](../be/tests/integration/chat-index.test.ts), [retrieval hồi quy](../be/tests/integration/chat-retrieval.test.ts), [HTTP API](../be/tests/integration/api.test.ts), [chat qua browser/proxy](../fe/e2e/chat-flow.spec.ts). Các test dùng vector/model fixture và DB cô lập; không thay eval semantic với model thật. Kết quả thực thi ở [evidence](evidence/rag-refactor-verification.md).
