# Thiết kế AI và các quyết định còn mở — GOM NẮNG

Cập nhật 26/10/2026 sau US7 giai đoạn 3. Nhóm 2 thành viên, RAG có pipeline, **năng lực thứ hai chưa chọn**. Tài liệu tách hiện thực, giới hạn và đích thiết kế; không suy đoán kết quả eval hoặc khả dụng model. Giai đoạn 3 đã code, chờ người dùng tự thử; chưa chạy automated checks/model thật.

## 1. Vai trò AI và ownership

RAG giúp hỏi hướng dẫn website và thông tin dự án công khai bằng ngôn ngữ tự nhiên, có link nguồn. AI không xác nhận đóng góp, ghi chi hay duyệt dự án thay người có trách nhiệm.

An phụ trách backend, Khanh phụ trách frontend; An sở hữu RAG/model integration và tests/eval backend, Khanh sở hữu chat/sources/real-time UI và tests frontend; cả hai cùng review eval. Sau Q-01 áp dụng cùng phân công BE/FE cho capability thứ hai. Khanh cần giải thích luồng widget tới model, An cần giải thích hiển thị nguồn/lỗi UI. Agent hỗ trợ lập trình không tính là capability multi-agent trong sản phẩm.

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

Hiện `GET /api/chat/models` trả lựa chọn; `POST /api/chat` nhận `message`, `model`, `history`, trả `reply`, `sources`, `generatedByModel`, `status`, `reasonCode`, `requestId`, `promptVersion`. Zod kiểm message 1–1000 ký tự, tối đa 8 history turns, role user/assistant, nội dung 1–3000 ký tự. Model sinh JSON nội bộ, backend kiểm schema/citation trước publish; không sửa JSON bằng lượt gọi khác. [Contract](api-contract.md), [giai đoạn 1](us7-phase1.md).

Prompt chat và instruction query tập trung trong [chat.config.ts](../be/src/modules/chat/chat.config.ts): `gomnang-rag-v4` (chỉ dùng history cho câu nối tiếp và không trả kiến thức chung ngoài phạm vi), `gomnang-query-v1`; DB metadata ghi cả hai version. Các hàm history/query/messages/citation ở [chat.rag.ts](../be/src/modules/chat/chat.rag.ts); xem [cấu trúc RAG](rag-structure.md). Sửa nội dung phải tăng version tương ứng.

Chưa chạy eval trước/sau hoặc nghiệm thu model thật cho giai đoạn 1. Prompt yêu cầu chỉ liệt kê theo nguồn tìm được; top-k không chứng minh tổng số/toàn bộ danh mục. Streaming để US10, hiện trả nguyên câu sau kiểm.

## 5. Guardrails, privacy và fallback

| Rủi ro | Hiện có | Cần chứng minh/bổ sung |
| :-- | :-- | :-- |
| Injection câu hỏi/nguồn | Guard pattern chung cho current input/toàn history, full document trước chunking, chunks trước embedding và candidates từ index cũ; prompt không tin mệnh lệnh trong dữ liệu; không tools ghi | Guard không hiểu mọi cách lách, chưa eval provider thật. Bộ ca nguồn/history gián tiếp và direct để giai đoạn 6 |
| Ngoài phạm vi/thiếu dữ kiện | Ngưỡng retrieval, `NO_CHAT_EVIDENCE`, kiểm số citation | Retrieval vẫn có thể chọn nguồn không liên quan; đo từ chối và nội dung thật sự được hỗ trợ |
| Timeout/provider lỗi/empty/malformed | Ngân sách request 120 giây (115 xử lý/5 finalize), body read có abort/byte cap; PostgreSQL chat pool riêng và timeout SQL; UI thử lại/sửa do người dùng bấm | Chưa kiểm runtime; metadata có thể pending/hoàn tất muộn khi DB/request đứt. Không bảo đảm dừng compute remote |
| Nguồn riêng tư | Chỉ đồng bộ dự án công khai, không lấy email/phone/password user | Test nguồn cũ, đổi trạng thái và request đồng thời ở môi trường thật |
| Dữ liệu trong văn bản | Cho phép contact cố ý công khai của dự án; loại nguồn/input có credential/ID riêng hoặc yêu cầu dữ liệu riêng theo mẫu; không sửa bản ghi gốc | Không phát hiện mọi secret/PII, chưa có bằng chứng 100% trên văn bản tự do; không blanket-redact email/phone công khai |
| AI thực hiện thao tác | Service chat không gọi hành động nghiệp vụ | Nếu chọn tools: auth, xác nhận trước ghi, xử lý trùng request và audit |

**Dữ liệu gửi Qwen/Ollama:** system prompt, history được chọn, câu hỏi và đoạn nguồn lấy được (citation/id/title/excerpt) gửi tới `OLLAMA_BASE_URL`; chỉ local nếu endpoint thực tế local. Documents/query embedding cũng gửi Ollama. Widget giữ hội thoại trong bộ nhớ trang, chưa lưu hội thoại vào DB. Không suy ra retention của endpoint từ thiết kế này.

Giai đoạn 2: input bị guard từ chối không gọi embedding/generation. Nguồn bị loại không đi vào prompt/source cards; nếu không còn nguồn hợp lệ thì `refused/UNSAFE_SOURCES`, nếu còn nguồn thì chỉ dùng phần còn lại và giữ citation. URL nguồn phải đúng dự án/guide được phép. Xem [luồng và checklist](us7-phase2.md). Không auto-index hoặc kiểm freshness nội dung.

[Giai đoạn 3](us7-phase3.md): chỉ mang history sang khi câu hiện tại nối tiếp, giữ NO_EVIDENCE thay vì thêm classifier chặn câu React đã từ chối đúng. Output kiểm thêm dấu hiệu secret/role instruction và một số đoạn prompt nội bộ trước publish, nhưng không chứng minh entailment từng khẳng định. Provider không được tự chuyển hoặc retry.

Đích privacy: không gửi mật khẩu, token, key, giấy tờ định danh/thông tin người thụ hưởng không cần thiết; tối thiểu hóa context/log. Thêm loại dữ liệu cho capability mới cần cập nhật quyền, thông báo dữ liệu gửi provider và test.

Fallback là thông báo lỗi/từ chối khi thiếu nguồn; chỉ có Ollama, không tự đổi provider. Lỗi JSON/schema/citation ghi failed, không hiện đáp án chưa kiểm. Nghiệp vụ không gọi model; còn cần kiểm lỗi bằng harness cô lập ở giai đoạn cuối, không tắt dịch vụ dùng chung để thử.

## 6. Thiết kế evaluation và telemetry cần bổ sung

Chưa có bộ eval 20 ca và kết quả trước/sau. [Retrieval tests](../be/tests/integration/chat-retrieval.test.ts), [index tests](../be/tests/integration/chat-index.test.ts) và [RAG helper tests](../be/tests/integration/chat-rag.test.ts) dùng contract hiện tại và fixture; adapter tests mock fetch, không chứng minh chất lượng model thật. [llm-smoke-test.mjs](../scripts/llm-smoke-test.mjs) là thí nghiệm riêng. Kết quả refactor ở [evidence](evidence/rag-refactor-verification.md).

Đề xuất tối thiểu 20 ca (chưa phải dataset/test đã viết/chạy):

| Nhóm | Số ca đề xuất | Kỳ vọng |
| :-- | :-- | :-- |
| Thường | 8 | Hướng dẫn, dự án cụ thể, nhu cầu, địa điểm/trạng thái; đúng dữ kiện và nguồn |
| Biên | 6 | Bỏ dấu, câu mơ hồ, nguồn đổi, dự án cũ, thiếu dữ kiện/nguồn; hỏi lại hoặc nói chưa đủ khi cần |
| An toàn/từ chối | 6 | Injection câu hỏi/nguồn, ngoài phạm vi, bản nháp, PII, provider hỏng; từ chối/giới hạn/fallback đúng |

Mỗi ca có ID, story/guardrail, snapshot dữ liệu, câu hỏi, expected facts/sources/refusal, pass rule, output thật và người đánh giá. Test mock lỗi adapter phải phân biệt với chất lượng model. Sau khi chọn AI thứ hai, eval phải bao phủ schema/tools/multimodal/hand-off tương ứng, không chỉ RAG.

Quy trình: cố định dataset/model/config → chạy baseline → đổi một yếu tố có lý do → chạy cùng ca → báo `pass / tổng ca` toàn bộ và từng nhóm, ghi ca lỗi hạ tầng. Chốt pass rule trước đo; citation validity, đúng dữ kiện và từ chối đúng là các tiêu chí riêng.

Giai đoạn 1 có `chat_requests`: UUID nội bộ, correlation request ID không unique, requested/actual model, hai prompt versions, pending/completed và answered/refused/failed, lý do/HTTP status, số lần thử model/embedding, usage generation nếu provider báo, latency request. Không lưu câu hỏi/history/output/nguồn/IP/tài khoản. Log lỗi → 503 chat; pending có thể chưa hoàn chỉnh khi process/DB lỗi. US9 còn cần tokens/cost embedding, công thức chi phí, aggregate/admin API/dashboard. Chưa nghiệm thu telemetry qua model thật.

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

Trước 27/10 cần chốt capability thứ hai, hoàn thiện real-time, prompt version, guardrails, eval, telemetry/admin và runtime embeddings. Test RAG đã theo cấu trúc mới; bộ doc chưa có số đo chi phí/latency hay xác nhận chất lượng AI.

## 9. Real-time là yêu cầu độc lập

[US-10](requirements.md#us-10) theo dõi riêng yêu cầu real-time của đề; [US-7](requirements.md#us-7) nghiệm thu nội dung RAG và nguồn. Streaming AI là phương án đề xuất, Q-05 chưa chốt transport/flow. Source hiện trả JSON một lần, chưa real-time. Thiết kế triển khai cần thống nhất hợp đồng partial/done/error/cancel, kiểm quyền và cách bảo vệ output/citation; không suy ra SSE hoặc endpoint stream đã tồn tại. Kiểm chứng qua proxy và môi trường demo, không dùng hiệu ứng gõ lại text đầy đủ làm bằng chứng streaming.
