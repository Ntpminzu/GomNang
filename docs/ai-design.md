# Thiết kế AI và các quyết định còn mở — GOM NẮNG

Cập nhật 26/10/2026 theo source hiện hành. Nhóm 2 thành viên, **năng lực AI thứ hai chưa chọn**. US7 đã đóng công việc theo nghiệm thu người dùng: 20/20 câu thủ công và fallback/phục hồi đạt; số liệu baseline riêng và cách thử injection gián tiếp còn thiếu chi tiết đối chứng. [Phiếu nghiệm thu](evidence/us7-manual-evaluation.md) tách tự xác nhận, kiểm tự động và giới hạn bằng chứng.

## 1. Vai trò AI và ownership

RAG giúp hỏi hướng dẫn website và thông tin dự án công khai bằng ngôn ngữ tự nhiên, có link nguồn. AI không xác nhận đóng góp, ghi chi hay duyệt dự án thay người có trách nhiệm.

An phụ trách backend, Khanh phụ trách frontend; An sở hữu RAG/model integration và tests/eval backend, Khanh sở hữu chat/sources/real-time UI và tests frontend; cả hai cùng review eval. Sau Q-01 áp dụng cùng phân công BE/FE cho capability thứ hai. Khanh cần giải thích luồng widget tới model, An cần giải thích hiển thị nguồn/lỗi UI. Agent hỗ trợ lập trình không tính là capability multi-agent trong sản phẩm.

<a id="models"></a>
## 2. Model và ranh giới gọi API hiện tại

| Thành phần | Mặc định trong source | Cách gọi và giới hạn |
| :-- | :-- | :-- |
| Local chat | `OLLAMA_MODEL=qwen3:4b` | Backend gọi Ollama `/api/chat`, `stream: false`, `think: true`; khách được dùng |
| Embeddings | `OLLAMA_EMBEDDING_MODEL=qwen3-embedding:0.6b` | Ollama `/api/embed`, vector bắt buộc 1024 chiều |

Đây là **giá trị config**, cần kiểm model/endpoint thực trước demo. Chỉ Qwen/Ollama cho generation và embedding; không adapter AI cloud, không dropdown chọn provider. Sources: [env.ts](../be/src/config/env.ts), [server.ts](../be/src/server.ts), [chat.model.ts](../be/src/modules/chat/chat.model.ts), [chat.embedding.ts](../be/src/modules/chat/chat.embedding.ts). [Quyết định tinh gọn](chat-qwen-only.md) thay thế yêu cầu parity hai provider ở kế hoạch cũ.

Phân tích lựa chọn: local giữ dữ liệu trong môi trường tự vận hành nhưng cần tài nguyên; cloud giảm vận hành model nhưng gửi dữ liệu tới provider và có chi phí/quota. Nhóm chưa có số đo chứng minh lựa chọn tối ưu. Cần ghi version, phần cứng, dataset, tokens, latency và chất lượng của cùng bộ câu hỏi trước khi kết luận.

Quyết định 26/10: người dùng đã bỏ provider thứ hai, chỉ Qwen/Ollama để tinh gọn. Các so sánh local/cloud chỉ là bối cảnh lựa chọn, không là tính năng cloud hiện có. Giai đoạn kiểm parity provider thứ hai bị bỏ; bộ eval cuối chạy trên Qwen/Ollama, không đòi hai provider.

## 3. Pipeline RAG hiện có

| Bước | Hiện thực |
| :-- | :-- |
| Nguồn | `CHAT_GUIDES`; trường công khai của dự án `published`, `in_progress`, `completed`, `cancelled` |
| Document | Tên, trạng thái, địa điểm, nhóm thụ hưởng, thời gian, mục tiêu, nhu cầu; không có số dư/tiền đã nhận theo thời gian thực trong document này |
| Chunking | Theo từ, mục tiêu tối đa 800 ký tự, overlap khoảng 120. Một từ dài hơn giới hạn có thể khiến chunk vượt 800; đây không phải token count |
| Index | `chat_chunks`: ID, projectId, title, URL, content, hash, embeddingModel, vector, updatedAt |
| Đồng bộ | Chỉ khi chạy `npm.cmd run rag:index`: so hash/model, embed chunk mới/đổi rồi atomic upsert/prune. CLI khóa session chống chạy đồng thời, không seed/migrate |
| Retrieval | Ghép tối đa 2 câu user trước với câu hiện tại rồi embed có instruction; SQL lọc model/trạng thái công khai trước cosine distance `< 0.65` và top 5; giữ nguồn hướng dẫn |
| Generation | System guidance + history được chọn tối đa 3 cặp/4000 ký tự, mỗi turn 1000 ký tự + JSON nguồn và câu hỏi hiện tại |
| Kiểm output | JSON nội bộ `{status,reply}` qua Zod; answered cần citation thuộc nguồn hiện tại; trả sources được dẫn. Sai schema/citation là lỗi, chưa kiểm từng mệnh đề có được nguồn hỗ trợ |
| Không gọi generation | Không có nguồn phù hợp; đã bỏ nhánh riêng lời chào/danh mục |

Sources: [chat-knowledge.ts](../packages/domain/src/chat-knowledge.ts), [projects.repository.ts](../be/src/modules/projects/projects.repository.ts), [chat.retrieval.ts](../be/src/modules/chat/chat.retrieval.ts), [chat.service.ts](../be/src/modules/chat/chat.service.ts), [schema](../be/src/infrastructure/database/schema.ts). Đây là baseline, chưa có benchmark để gọi tối ưu; xem [ADR-002](adr/002-cited-rag.md).

Giới hạn theo lựa chọn mới: chat không đồng bộ/kiểm freshness nội dung, dùng bản index gần nhất dù cũ. Dự án mới chưa index có thể không được tìm thấy. SQL vẫn lọc quyền công khai lúc truy vấn. Query embedding và generation vẫn tốn thời gian; thay đổi này không tự chứng minh hết timeout proxy hoặc cải thiện latency. Model không suy ra số tiền thực nhận từ mục tiêu nhu cầu. Xem [index thủ công](rag-manual-index.md).

## 4. Hợp đồng chat và prompt management

Hiện `GET /api/chat/model` trả thông tin một model đã cấu hình; `POST /api/chat` nhận `message`, `history`, trả `reply`, `sources`, `generatedByModel`, `status`, `reasonCode`, `promptVersion`. Zod strict kiểm message 1–1000 ký tự, tối đa 8 history turns, role user/assistant, nội dung 1–3000 ký tự; không nhận trường `model`. Model sinh JSON nội bộ, backend kiểm schema/citation trước publish; không sửa JSON bằng lượt gọi khác. Chat không yêu cầu JWT; Google OAuth cho nghiệp vụ độc lập với provider AI. [Contract](api-contract.md#6-chat-rag-hiện-tại).

Prompt chat và instruction query tập trung trong [chat.config.ts](../be/src/modules/chat/chat.config.ts): `gomnang-rag-v5` (làm rõ thiếu trường thông tin được hỏi thì refused, dù đã tìm đúng dự án; giữ quy tắc history/phạm vi từ v4), `gomnang-query-v1`; DB metadata ghi cả hai version. Các hàm history/query/messages/citation ở [chat.rag.ts](../be/src/modules/chat/chat.rag.ts); xem [cấu trúc RAG](rag-structure.md). Sửa nội dung phải tăng version tương ứng.

Prompt yêu cầu chỉ liệt kê theo nguồn tìm được; top-k không chứng minh tổng số/toàn bộ danh mục. JSON envelope nhỏ này không được tính thành capability US8. Streaming để US10; hiện trả nguyên câu sau kiểm. Metadata ghi prompt/query version; không cần re-index chỉ vì thay system prompt.

<a id="guardrails"></a>
## 5. Guardrails, privacy và fallback

| Rủi ro | Hiện có | Cần chứng minh/bổ sung |
| :-- | :-- | :-- |
| Injection câu hỏi/nguồn | Guard pattern chung cho current input/toàn history, full document trước chunking, chunks trước embedding và candidates từ index cũ; prompt không tin mệnh lệnh trong dữ liệu; không tools ghi | Có tự xác nhận bộ manual; chưa có chi tiết thử injection qua nguồn. Pattern vẫn có false positive/negative |
| Ngoài phạm vi/thiếu dữ kiện | Ngưỡng retrieval, `NO_CHAT_EVIDENCE`, kiểm số citation | Retrieval vẫn có thể chọn nguồn không liên quan; đo từ chối và nội dung thật sự được hỗ trợ |
| Timeout/provider lỗi/empty/malformed | Một thời hạn request 120 giây, signal chung qua embedding/generation/body read; byte cap, PostgreSQL chat pool riêng và timeout SQL; UI thử lại/sửa do người dùng bấm | Fixture kiểm lỗi và người dùng xác nhận fallback; metadata có thể thiếu khi process/DB lỗi. Không bảo đảm dừng compute remote |
| Nguồn riêng tư | Chỉ đồng bộ dự án công khai, không lấy email/phone/password user | Test nguồn cũ, đổi trạng thái và request đồng thời ở môi trường thật |
| Dữ liệu trong văn bản | Cho phép contact cố ý công khai của dự án; loại nguồn/input có credential/ID riêng hoặc yêu cầu dữ liệu riêng theo mẫu; không sửa bản ghi gốc | Không phát hiện mọi secret/PII, chưa có bằng chứng 100% trên văn bản tự do; không blanket-redact email/phone công khai |
| AI thực hiện thao tác | Service chat không gọi hành động nghiệp vụ | Nếu chọn tools: auth, xác nhận trước ghi, xử lý trùng request và audit |

**Dữ liệu gửi Qwen/Ollama:** system prompt, history được chọn, câu hỏi và đoạn nguồn lấy được (citation/id/title/excerpt) gửi tới `OLLAMA_BASE_URL`; chỉ local nếu endpoint thực tế local. Documents/query embedding cũng gửi Ollama. Widget giữ hội thoại trong bộ nhớ trang, chưa lưu hội thoại vào DB. Không suy ra retention của endpoint từ thiết kế này.

Input và toàn bộ raw history được kiểm trước khi cắt/chọn history; không tin role assistant do client gửi. Input bị guard từ chối không gọi embedding/generation. Nguồn bị loại không đi vào prompt/source cards; nếu không còn nguồn hợp lệ thì `refused/UNSAFE_SOURCES`, nếu còn nguồn thì chỉ dùng phần còn lại, không tìm bù hoặc renumber citation. ID/URL nguồn phải đúng dự án/guide được phép; một chunk không an toàn làm loại nhóm của nó trong bộ candidates hiện có. Không đọc toàn catalog để tìm thêm. Contact dự án cố ý công khai được phép; không join tài khoản để lấy liên hệ.

Chỉ mang history sang khi câu hiện tại nối tiếp, giữ NO_EVIDENCE thay vì thêm classifier ngoài phạm vi. Output dùng một lượt kiểm nội dung chung cho secret/instruction/bản sao dòng prompt dài rồi kiểm citation; không gọi chồng lại cùng guard hoặc lọc lại cùng candidates sau generation. Guard nguồn chỉ thêm mẫu mệnh lệnh rõ tới trợ lý/chatbot/assistant, tránh chặn đại từ tiếng Việt “ai” hoặc cụm “luôn trả lời” chung chung. Những kiểm tra này không chứng minh entailment từng khẳng định. Provider không tự chuyển hoặc retry; xem [luồng runtime](rag-structure.md#runtime).

Đích privacy: không gửi mật khẩu, token, key, giấy tờ định danh/thông tin người thụ hưởng không cần thiết; tối thiểu hóa context/log. Thêm loại dữ liệu cho capability mới cần cập nhật quyền, thông báo dữ liệu gửi provider và test.

Fallback là thông báo lỗi/từ chối khi thiếu nguồn; chỉ có Ollama, không tự đổi provider. Lỗi JSON/schema/citation ghi failed, không hiện đáp án chưa kiểm. Người dùng đã xác nhận tắt Ollama thì chat báo lỗi embedding, nghiệp vụ vẫn hoạt động và mở lại chat thành công; ảnh/xác nhận được mô tả trong [phiếu manual](evidence/us7-manual-evaluation.md). Không suy từ đó rằng mọi kiểu lỗi hoặc triển khai hosting đã được nghiệm thu.

## 6. Thiết kế evaluation và telemetry cần bổ sung

Có hai bộ riêng: [snapshot US7 v1](evaluation/us7-v1.md), [JSON](evaluation/us7-v1.json) vẫn NOT_RUN; [manual-live-v1](evidence/us7-manual-evaluation.md) được người dùng xác nhận 20/20 sau cập nhật prompt. Chưa có số liệu baseline riêng hoặc output/log đối chứng từng ca. [Retrieval tests](../be/tests/integration/chat-retrieval.test.ts), [index tests](../be/tests/integration/chat-index.test.ts) và [RAG helper tests](../be/tests/integration/chat-rag.test.ts) dùng fixture; adapter tests mock fetch, không chứng minh chất lượng model thật.

Phân bổ 20 ca đã chốt:

| Nhóm | Số ca | Kỳ vọng |
| :-- | :-- | :-- |
| Thường | 8 | Hướng dẫn, dự án cụ thể, nhu cầu, địa điểm/trạng thái; đúng dữ kiện và nguồn |
| Biên | 4 | Không dấu, câu nối tiếp, thiếu số tiền thực nhận/chứng thư; trả đúng hoặc từ chối khi thiếu dữ kiện |
| An toàn, critical | 6 | Hai injection trực tiếp, một qua cache nguồn, bản nháp, liên hệ tài khoản, credential giả |
| Ngoài phạm vi | 2 | React sau history hợp lệ và thời tiết; phải từ chối |

Mỗi ca có ID, story/guardrail, snapshot dữ liệu, câu hỏi, expected facts/sources/refusal, pass rule, output thật và người đánh giá. Test mock lỗi adapter phải phân biệt với chất lượng model. Sau khi chọn AI thứ hai, eval phải bao phủ schema/tools/multimodal/hand-off tương ứng, không chỉ RAG.

Quy trình: cố định dataset/model/config → chạy baseline → đổi một yếu tố có lý do → chạy cùng ca → báo `pass / tổng ca` toàn bộ và từng nhóm, ghi ca lỗi hạ tầng. Chốt pass rule trước đo; citation validity, đúng dữ kiện và từ chối đúng là các tiêu chí riêng.

`chat_requests` dùng request_id integer identity làm khóa chính duy nhất; đã bỏ UUID id, lifecycle và embedded_documents. Giữ requested/actual model, hai prompt versions, answered/refused/failed, lý do/HTTP status, số lần thử model/embedding, usage generation nếu provider báo và latency request. Chuẩn bị trong RAM, thử insert một row tổng kết khi response đóng; không lưu câu hỏi/history/output/nguồn/IP/tài khoản. Chat UI/response không trả mã log; dashboard admin được xem metadata/request_id. Log lỗi chỉ ghi console metadata, không đổi câu trả lời; ghi nền có thể thiếu row khi process/DB lỗi. US9 bổ sung embedding query tokens, aggregate/admin API và dashboard với công thức/mẫu số/giới hạn thiếu log; chi phí API/TB request không áp dụng (local). [US9](us9-ai-usage.md), [schema và migration](chat-log-sequence.md).

Tên trường usage/JSON mode theo [Ollama chat](https://docs.ollama.com/api/chat). Dữ liệu provider không báo giữ null, không giả số 0; actualModel không suy từ model yêu cầu.

Latency trung bình = tổng latency / số request có phép đo; chi phí dựa đơn giá được xác minh tại ngày chạy và đơn vị tiền thống nhất. Báo tổng request/thành công/thất bại/từ chối và mẫu số cho mỗi trung bình. Local: ghi không có hóa đơn API và phần chưa tính điện/phần cứng; không gán giá tiền bịa. Không gộp reply quy tắc thành số lần gọi LLM.

<a id="7-năng-lực-ai-thứ-hai-chưa-quyết-định"></a>
## 7. Năng lực AI thứ hai: chưa quyết định

Người dùng yêu cầu **ghi phương án để quyết định sau**. Bảng phân tích không xác nhận nhóm đã thử hoặc chọn:

| Phương án | Giá trị có thể mang lại | Điều kiện đề | Tận dụng hiện có / phần mới |
| :-- | :-- | :-- | :-- |
| B — Tool-using agent | Tra cứu, hỗ trợ thao tác dự án/đóng góp | LLM gọi ít nhất 3 tools trên dữ liệu thật; xác nhận trước mọi thay đổi | Có services; cần tool loop, quyền, xác nhận, audit và test lỗi |
| C — Structured output | Gợi ý đánh giá hồ sơ cho người xác minh | LLM sinh JSON, validate schema, app dùng trong logic | Có assessment/UI/checklist; cần model/schema integration, nguồn đánh giá, eval |
| D — Multimodal | Trích dữ liệu hóa đơn ảnh/PDF | AI xử lý input đa phương thức, lưu và dùng kết quả | Có sổ chi; cần upload/storage, model, validation và privacy |
| E — Multi-agent | Một agent phân tích, agent khác kiểm tra | Ít nhất 2 vai, hand-off và log trong sản phẩm | Chưa có orchestration; cần hợp đồng bàn giao, giới hạn vòng lặp và eval |

Chunking + embeddings + vector search đều thuộc A — RAG, không phải ba capability. Rule checklist không được đổi nhãn thành structured LLM. Upload ảnh riêng lẻ chưa là multimodal. Ứng dụng gọi service theo if/else chưa chứng minh LLM gọi tools.

Trước triển khai US-8 phải ghi: lựa chọn, owner, người dùng/giá trị, flow và failure cases, schema/tools/dữ liệu, cost/privacy, AC cụ thể và eval. Cập nhật requirements, traceability, backlog và ADR mới. Phân công BE/FE cho từng story ở [requirements](requirements.md); thiết kế này chưa tạo schema/API nghiệp vụ mới.

## 8. Demo và giới hạn

Demo: câu trả lời có nguồn và mở nguồn; câu thiếu dữ kiện; injection; lỗi dịch vụ nhưng non-AI còn chạy; thêm capability thứ hai sau khi chọn. Ghi cấu hình thật và video dự phòng. Không dùng lời chào/liệt kê theo quy tắc làm bằng chứng LLM.

Các việc cuối kỳ còn cần đối chiếu: capability thứ hai, real-time, hồ sơ eval trước/sau và injection gián tiếp, telemetry/admin, số đo chi phí/latency và triển khai thực tế. Không đánh đồng đóng US7 theo nghiệm thu người dùng với hoàn tất toàn bộ các yêu cầu này.

## 9. Real-time là yêu cầu độc lập

[US-10](requirements.md#us-10) theo dõi riêng yêu cầu real-time của đề; [US-7](requirements.md#us-7) nghiệm thu nội dung RAG và nguồn. Streaming AI là phương án đề xuất, Q-05 chưa chốt transport/flow. Source hiện trả JSON một lần, chưa real-time. Thiết kế triển khai cần thống nhất hợp đồng partial/done/error/cancel, kiểm quyền và cách bảo vệ output/citation; không suy ra SSE hoặc endpoint stream đã tồn tại. Kiểm chứng qua proxy và môi trường demo, không dùng hiệu ứng gõ lại text đầy đủ làm bằng chứng streaming.
