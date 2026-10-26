# Thiết kế AI — GOM NẮNG

Cập nhật 25/10/2026. Nhóm 2 thành viên, capability 1 là RAG, **capability 2 là Structured output** cho người xác minh (chốt 25/10/2026). Tài liệu tách hiện thực, giới hạn và đích thiết kế; không chứa kết quả eval hoặc thông tin khả dụng model được tự suy đoán.

## 1. Vai trò AI và ownership

RAG giúp hỏi hướng dẫn website và thông tin dự án công khai bằng ngôn ngữ tự nhiên, có link nguồn. AI không xác nhận đóng góp, ghi chi hay duyệt dự án thay người có trách nhiệm.

An phụ trách backend, Khanh phụ trách frontend; An sở hữu RAG/model integration và tests/eval backend, Khanh sở hữu chat/sources/real-time UI và tests frontend; cả hai cùng review eval. Capability thứ hai (US-8) do Khanh làm cả BE và FE theo phân công 25/10/2026. Khanh cần giải thích luồng widget tới model, An cần giải thích hiển thị nguồn/lỗi UI. Agent hỗ trợ lập trình không tính là capability multi-agent trong sản phẩm.

## 2. Model và ranh giới gọi API hiện tại

| Thành phần | Mặc định trong source | Cách gọi và giới hạn |
| :-- | :-- | :-- |
| Local chat | `OLLAMA_MODEL=qwen3:4b` | Backend gọi Ollama `/api/chat`, `stream: false`, `think: true`; khách được dùng |
| Cloud chat | `GEMINI_MODEL=gemini-3.8-flash` | Backend gọi `generateContent`, header `x-goog-api-key`; có key mới bật, yêu cầu JWT |
| Embeddings | `OLLAMA_EMBEDDING_MODEL=qwen3-embedding:0.6b` | Ollama `/api/embed`, vector bắt buộc 1024 chiều; dùng cho cả local và Gemini |

Đây là **giá trị config**, không khẳng định model cloud còn khả dụng hoặc tài khoản demo có quyền. Trước demo phải kiểm model/quyền/cấu hình thật. Sources: [env.ts](../be/src/config/env.ts), [server.ts](../be/src/server.ts), [chat.model.ts](../be/src/modules/chat/chat.model.ts), [gemini.model.ts](../be/src/modules/chat/gemini.model.ts), [chat.embedding.ts](../be/src/modules/chat/chat.embedding.ts).

Phân tích lựa chọn: local giữ dữ liệu trong môi trường tự vận hành nhưng cần tài nguyên; cloud giảm vận hành model nhưng gửi dữ liệu tới provider và có chi phí/quota. Nhóm chưa có số đo chứng minh lựa chọn tối ưu. Cần ghi version, phần cứng, dataset, tokens, latency và chất lượng của cùng bộ câu hỏi trước khi kết luận.

## 3. Pipeline RAG hiện có

| Bước | Hiện thực |
| :-- | :-- |
| Nguồn | `CHAT_GUIDES`; trường công khai của dự án `published`, `in_progress`, `completed`, `cancelled` |
| Document | Tên, trạng thái, địa điểm, nhóm thụ hưởng, thời gian, mục tiêu, nhu cầu; không có số dư/tiền đã nhận theo thời gian thực trong document này |
| Chunking | Theo từ, mục tiêu tối đa 800 ký tự, overlap khoảng 120. Một từ dài hơn giới hạn có thể khiến chunk vượt 800; đây không phải token count |
| Index | `chat_chunks`: ID, projectId, title, URL, content, hash, embeddingModel, vector, updatedAt |
| Đồng bộ | Trước semantic retrieval, so hash/model để embed chunk đổi; xóa nguồn không còn trong bộ mong muốn. Queue tuần tự theo đối tượng DB trong một tiến trình |
| Retrieval | Embed query có instruction; cosine distance `< 0.65` (similarity `> 0.35`), tối đa 5 nguồn |
| Generation | System guidance + tối đa 8 history turns + JSON nguồn và câu hỏi hiện tại |
| Kiểm output | Có ít nhất một `[n]`, mọi số trong khoảng nguồn; trả sources được dẫn. Chưa kiểm từng mệnh đề có được nguồn hỗ trợ |
| Không gọi model | Lời chào, danh mục công khai (tối đa 10 nguồn hiển thị và thông báo phần còn lại) |

Sources: [chat-knowledge.ts](../packages/domain/src/chat-knowledge.ts), [projects.repository.ts](../be/src/modules/projects/projects.repository.ts), [chat.retrieval.ts](../be/src/modules/chat/chat.retrieval.ts), [chat.service.ts](../be/src/modules/chat/chat.service.ts), [schema](../be/src/infrastructure/database/schema.ts). Đây là baseline, chưa có benchmark để gọi tối ưu; xem [ADR-002](adr/002-cited-rag.md).

Giới hạn: sync trong request tăng thời gian câu đầu khi nguồn đổi; chưa kiểm race nhiều tiến trình/thay đổi quyền đồng thời. Hỏi số tiền đã nhận có thể thiếu dữ kiện trong context dù có ở nghiệp vụ; model không được suy ra từ mục tiêu nhu cầu.

## 4. Hợp đồng chat và prompt management

Hiện `GET /api/chat/models` trả lựa chọn; `POST /api/chat` nhận `message`, `model`, `history`, trả `reply`, `sources`, `generatedByModel`. Zod kiểm message 1–1000 ký tự, tối đa 8 history turns, role user/assistant, nội dung turn 1–3000 ký tự. [chat.schema.ts](../be/src/modules/chat/chat.schema.ts), [chat.route.ts](../be/src/modules/chat/chat.route.ts).

Prompt chat là hằng `guidance` trong service; instruction query trong embedding source. Có Git history nhưng **chưa tách file/config prompt riêng**, chưa log version từng request.

Đích triển khai: mỗi prompt có ID/version, file/config trong Git, mục đích, biến đầu vào, quy tắc phạm vi/nguồn và hành vi lỗi. Khi đổi prompt, liên kết commit và chạy lại eval cố định trước/sau. Đường dẫn prompt mới chốt khi triển khai; chưa có file đó cho bản nộp.

## 5. Guardrails, privacy và fallback

| Rủi ro | Hiện có | Cần chứng minh/bổ sung |
| :-- | :-- | :-- |
| Injection câu hỏi/nguồn | System prompt coi input là dữ liệu, chỉ dùng nguồn; chat chưa có tools ghi | Eval instruction độc hại cả user input lẫn document, không chỉ câu hỏi |
| Ngoài phạm vi/thiếu dữ kiện | Ngưỡng retrieval, `NO_CHAT_EVIDENCE`, kiểm số citation | Retrieval vẫn có thể chọn nguồn không liên quan; đo từ chối và nội dung thật sự được hỗ trợ |
| Timeout/provider lỗi/empty/malformed | Adapter timeout 120 giây và mã lỗi; UI hiện lỗi, cho sửa câu hỏi | Demo lỗi dịch vụ/timeout/empty, invalid JSON/schema khi áp dụng; không retry thao tác ghi mù |
| Nguồn riêng tư | Chỉ đồng bộ dự án công khai, không lấy email/phone/password user | Test nguồn cũ, đổi trạng thái và request đồng thời ở môi trường thật |
| PII trong văn bản | Whitelist cột, chưa có redaction văn bản tự do | Kiểm/lọc goal/location/need label, câu hỏi/history; chưa tự động hạ địa chỉ tới phường |
| AI thực hiện thao tác | Service chat không gọi hành động nghiệp vụ | Nếu chọn tools: auth, xác nhận trước ghi, xử lý trùng request và audit |

**Dữ liệu gửi Gemini:** system prompt, history, câu hỏi và đoạn nguồn lấy được (citation/id/title/excerpt). Chọn Ollama gửi tới `OLLAMA_BASE_URL`; chỉ giữ local nếu endpoint thực tế local. Documents/query embedding cũng được gửi Ollama. API key không gửi frontend. Widget giữ hội thoại trong bộ nhớ trang, chưa lưu hội thoại vào DB. Không suy ra chính sách retention của provider từ thiết kế này.

Đích privacy: không gửi mật khẩu, token, key, giấy tờ định danh/thông tin người thụ hưởng không cần thiết; tối thiểu hóa context/log. Thêm loại dữ liệu cho capability mới cần cập nhật quyền, thông báo dữ liệu gửi provider và test.

Fallback hiện có là thông báo lỗi và các nhánh quy tắc; không có failover tự động Gemini → Ollama. Nghiệp vụ dự án/đóng góp không phụ thuộc model theo code; phải thử ngắt chat/embedding và chứng minh nghiệp vụ còn dùng được trên bản demo.

## 6. Thiết kế evaluation và telemetry cần bổ sung

Chưa có bộ eval 20 ca và kết quả trước/sau. [chat-retrieval.test.ts](../be/tests/integration/chat-retrieval.test.ts) dùng interface cũ; adapter tests có mock, không chứng minh chất lượng model thật. [llm-smoke-test.mjs](../scripts/llm-smoke-test.mjs) là thí nghiệm riêng. Lỗi kiểm tra được ghi ở [traceability §4](traceability.md#4-ranh-giới-kiểm-chứng).

Đề xuất tối thiểu 20 ca (chưa phải dataset/test đã viết/chạy):

| Nhóm | Số ca đề xuất | Kỳ vọng |
| :-- | :-- | :-- |
| Thường | 8 | Hướng dẫn, dự án cụ thể, nhu cầu, địa điểm/trạng thái; đúng dữ kiện và nguồn |
| Biên | 6 | Bỏ dấu, câu mơ hồ, nguồn đổi, dự án cũ, thiếu dữ kiện/nguồn; hỏi lại hoặc nói chưa đủ khi cần |
| An toàn/từ chối | 6 | Injection câu hỏi/nguồn, ngoài phạm vi, bản nháp, PII, provider hỏng; từ chối/giới hạn/fallback đúng |

Mỗi ca có ID, story/guardrail, snapshot dữ liệu, câu hỏi, expected facts/sources/refusal, pass rule, output thật và người đánh giá. Test mock lỗi adapter phải phân biệt với chất lượng model. Eval của capability thứ hai (schema đánh giá hồ sơ) có 20 ca riêng, xem §7.

Quy trình: cố định dataset/model/config → chạy baseline → đổi một yếu tố có lý do → chạy cùng ca → báo `pass / tổng ca` toàn bộ và từng nhóm, ghi ca lỗi hạ tầng. Chốt pass rule trước đo; citation validity, đúng dữ kiện và từ chối đúng là các tiêu chí riêng.

Telemetry cần: request ID, provider/model, prompt version, status/refused/error, tools (rỗng nếu không có), input/output tokens, latency và cost model/embedding. Không log secrets/raw history mặc định. Duration HTTP hiện có không phải latency riêng model.

Latency trung bình = tổng latency / số request có phép đo; chi phí dựa đơn giá được xác minh tại ngày chạy và đơn vị tiền thống nhất. Báo tổng request/thành công/thất bại/từ chối và mẫu số cho mỗi trung bình. Local: ghi không có hóa đơn API và phần chưa tính điện/phần cứng; không gán giá tiền bịa. Không gộp reply quy tắc thành số lần gọi LLM.

<a id="7-năng-lực-ai-thứ-hai-chưa-quyết-định"></a>
## 7. Năng lực AI thứ hai: C — Structured output (chốt 25/10/2026)

Khanh chốt **C — Structured output** ngày 25/10/2026 và phụ trách US-8 cả BE lẫn FE theo phân công nhóm. An xác nhận trong human review. Bảng dưới giữ phân tích lúc chọn:

| Phương án | Giá trị có thể mang lại | Điều kiện đề | Tận dụng hiện có / phần mới |
| :-- | :-- | :-- | :-- |
| B — Tool-using agent | Tra cứu, hỗ trợ thao tác dự án/đóng góp | LLM gọi ít nhất 3 tools trên dữ liệu thật; xác nhận trước mọi thay đổi | Có services; cần tool loop, quyền, xác nhận, audit và test lỗi |
| **C — Structured output (đã chọn)** | Gợi ý đánh giá hồ sơ cho người xác minh | LLM sinh JSON, validate schema, app dùng trong logic | Có assessment/UI/checklist; cần model/schema integration, nguồn đánh giá, eval |
| D — Multimodal | Trích dữ liệu hóa đơn ảnh/PDF | AI xử lý input đa phương thức, lưu và dùng kết quả | Có sổ chi; cần upload/storage, model, validation và privacy |
| E — Multi-agent | Một agent phân tích, agent khác kiểm tra | Ít nhất 2 vai, hand-off và log trong sản phẩm | Chưa có orchestration; cần hợp đồng bàn giao, giới hạn vòng lặp và eval |

Lý do chọn C: người gác cổng theo quy tắc chỉ bắt được lỗi hình thức (thiếu trường, ngày sai). Nó không đọc được nội dung như người thụ hưởng mơ hồ, kế hoạch phi thực tế hay lời kêu gọi chuyển tiền cá nhân. C dùng lại assessment, hàng chờ xác minh và hai adapter model sẵn có, nên rủi ro thấp nhất trước hạn nộp. B và E cần vòng lặp tool/hand-off mới; D cần US-5 xong trước.

| Thành phần | Hiện thực |
| :-- | :-- |
| Người dùng, giá trị | Người xác minh bấm "Đánh giá bằng AI" trên dự án chờ duyệt; nhận gợi ý điểm cần hỏi lại trước khi công khai |
| Endpoint | `POST /api/projects/:id/ai-assessment`, body `{ model: 'ollama' \| 'gemini' }`; chỉ người xác minh được duyệt dự án này |
| Input gửi model | Chỉ trường công khai của hồ sơ (tên, mục tiêu, nhóm thụ hưởng, địa điểm, ngày, nhu cầu) và tín hiệu của quy tắc. Không gửi email, id người dùng, thủ quỹ, đóng góp |
| Output | JSON `{ verdict, signals[] }`; Zod kiểm verdict, tối đa 6 signals, `code` trong 7 mã, `field` trong 6 trường hoặc null, message 5–300 ký tự |
| Ràng buộc khi sinh | JSON Schema sinh từ Zod (`z.toJSONSchema`) gửi kèm request: Ollama `format: <schema>`, `think: false`; Gemini `responseMimeType: 'application/json'` + `responseJsonSchema`. Chỉ bật JSON mode thì qwen3:4b hay chép lại hồ sơ đầu vào, phải hỏi lại |
| App dùng kết quả | `mergeAiAssessment`: AI chỉ **nâng** mức cảnh báo, không hạ verdict của quy tắc. `PERSONAL_DATA`, `POSSIBLE_SCAM` ép FLAG. Lưu thành assessment mới với `source='ai'`, signal có tiền tố `AI_` |
| Lỗi | Output sai schema → hỏi lại một lần kèm lý do; vẫn sai → 502 `AI_INVALID_OUTPUT`, assessment cũ giữ nguyên. Không có model → 503 `AI_MODEL_UNAVAILABLE` |
| Đồng thời | Gọi model ngoài transaction; trong transaction khóa lại dự án và kiểm lại quyền/trạng thái trước khi ghi |
| Prompt | File có version `be/src/modules/verification/prompts/assessment.v<n>.md`; hằng `ACTIVE_ASSESSMENT_PROMPT` chọn bản đang dùng, hiện là v2 theo kết quả eval |
| Telemetry | Mỗi lần gọi = 1 dòng bảng `ai_requests`: prompt version, provider, model, tools (rỗng), số lần gọi, token vào/ra lấy từ provider, latency, chi phí USD theo bảng giá ở `chat.pricing.ts` (Ollama 0; gemini-3.8-flash $0.75/$3.75 mỗi 1 triệu token), kết cục và mã lỗi. Ghi cả lần lỗi. Đánh giá AI trỏ tới dòng này nên người xác minh thấy model, prompt, thời gian, token, chi phí ngay trên khung. `npm run ai:usage` tính trung bình; dashboard admin (US-9) đọc cùng bảng. Không lưu nội dung hồ sơ hay câu trả lời |
| Eval | 20 ca cố định ở `be/evals/assessment/cases.json`, chạy `npm run eval:assessment`; chấm trên kết quả sau khi gộp |

AI không duyệt, không từ chối dự án và không gửi email. Người xác minh vẫn bấm Duyệt/Yêu cầu bổ sung như cũ. Kết quả của eval và human review ở [bằng chứng US-8](evidence/us8-verification.md); quyết định ghi ở [ADR-004](adr/004-structured-assessment.md).

Chunking + embeddings + vector search đều thuộc A — RAG, không phải ba capability. Rule checklist không được đổi nhãn thành structured LLM. Upload ảnh riêng lẻ chưa là multimodal. Ứng dụng gọi service theo if/else chưa chứng minh LLM gọi tools.

## 8. Demo và giới hạn

Demo: câu trả lời có nguồn và mở nguồn; câu thiếu dữ kiện; injection; lỗi dịch vụ nhưng non-AI còn chạy; người xác minh nhờ AI soát hồ sơ có PII/lừa đảo và thấy nhãn AI. Ghi cấu hình thật và video dự phòng. Không dùng lời chào/liệt kê theo quy tắc làm bằng chứng LLM.

Trước 27/10 cần sửa test RAG, hoàn thiện streaming, prompt/version, eval, telemetry/admin và runtime embeddings. Bộ doc chưa có số đo chi phí/latency hay xác nhận chất lượng AI.

## 9. Real-time là yêu cầu độc lập

[US-10](requirements.md#us-10) theo dõi riêng yêu cầu real-time của đề; [US-7](requirements.md#us-7) nghiệm thu nội dung RAG và nguồn. Streaming AI là phương án đề xuất, Q-05 chưa chốt transport/flow. Source hiện trả JSON một lần, chưa real-time. Thiết kế triển khai cần thống nhất hợp đồng partial/done/error/cancel, kiểm quyền và cách bảo vệ output/citation; không suy ra SSE hoặc endpoint stream đã tồn tại. Kiểm chứng qua proxy và môi trường demo, không dùng hiệu ứng gõ lại text đầy đủ làm bằng chứng streaming.
