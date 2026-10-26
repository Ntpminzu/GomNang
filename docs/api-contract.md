# API contract hiện tại — GOM NẮNG

Đối chiếu source ngày 25/10/2026. Mô tả API hiện có, không phải các endpoint tương lai và không xác nhận test/deploy đang đạt. Nguồn: [app.ts](../be/src/app.ts), các [feature routes](../be/src/modules), [domain types](../packages/domain/src/types.ts), [HTTP adapter](../fe/src/libs/api/http).

Kết quả kiểm chứng phục vụ bản nộp ở [evidence](evidence/README.md); ví dụ minh họa trong contract không tự là output đã chạy. Shared types không thay validation runtime.

## 1. Quy ước chung

| Mục | Hành vi hiện tại |
| :-- | :-- |
| URL | Browser gọi cùng origin `/api/*`; Next rewrite tới `API_ORIGIN`. Backend local mặc định cổng 4000; `/health` gọi thẳng backend |
| Định dạng | JSON UTF-8, body Express giới hạn `100kb`, lỗi vượt giới hạn trả 413 |
| Phiên | Bearer JWT HS256, issuer gomnang-api, sid gắn phiên DB8giờ; logout thu hồi phiên hiện tại. Không có phiên bắt buộc đổi mật khẩu |
| Đăng nhập | Google cho user thường; email/password giữ lại. Admin/verifier chỉ mật khẩu; dev-login chỉ user ở môi trường cho phép |
| Quyền | Token mới xác nhận danh tính; service/domain tiếp tục kiểm vai, trạng thái và quyền trên dữ liệu |
| Ngày/thời điểm | Ngày nghiệp vụ `YYYY-MM-DD`; các timestamp trả theo DTO. Kiểm ngày nghiệp vụ theo ngày Việt Nam |
| Truy vết | `x-request-id` trong response và request log; không log token/key |
| ID | Path ID cần UUID theo middleware, ID không hợp lệ thường trả 404; UUID trong body sai định dạng trả 400 |

## 2. Lỗi và mã trạng thái

Lỗi từ error handler có dạng `{ "error": { "code": "...", "message": "...", "details": {} } }`; `details` có thể không có. Client rẽ nhánh theo `code`, không theo câu chữ. `/health` khi DB lỗi là ngoại lệ: `{ "status": "degraded", "db": "down" }`.

| HTTP | Ý nghĩa / ví dụ |
| :-- | :-- |
| 200 / 201 | Đọc/chuyển trạng thái hoặc tạo mới; tạo dự án kèm `Location` |
| 400 | `BAD_REQUEST`, `MALFORMED_JSON`: không đúng schema/JSON |
| 401 | `AUTH_REQUIRED`, `INVALID_TOKEN`, `INVALID_CREDENTIALS` |
| 403 | Đã xác thực nhưng sai quyền, tự xác nhận hoặc xung đột lợi ích |
| 404 | Không tồn tại, hoặc ẩn sự tồn tại bản nháp với người ngoài; dev-login bị tắt |
| 409 | Trạng thái không cho phép, chuyển sai trạng thái, email đã tồn tại |
| 413 / 422 | Body vượt giới hạn / đúng định dạng nhưng vi phạm business rules |
| 500 | `INTERNAL`, chỉ trả mã tra cứu; chi tiết nằm ở log |
| 502 / 503 / 504 | Provider trả dữ liệu lỗi / dịch vụ chưa có hoặc không kết nối / timeout; 503 cũng có ở health |

400 và 422 không hoán đổi: chuỗi thay số sai schema; số không dương có thể đúng kiểu nhưng sai nghiệp vụ. Source: [validation](../be/src/common/middleware/validation.ts), [error handler](../be/src/common/middleware/error-handler.ts), [rules](../packages/domain/src/rules.ts).

## 3. Danh sách endpoint hiện có

`{id}` trong bảng tương ứng `:id` trong Express. Quyền ghi trong bảng không miễn kiểm trạng thái/quy tắc nghiệp vụ.

| Method | Endpoint | Xác thực / quyền | Thành công |
| :-- | :-- | :-- | :-- |
| GET | `/health` | Công khai; kiểm DB, không kiểm model | 200 health hoặc 503 degraded |
| POST | `/api/auth/register` | Công khai | 201 `{ token, user }` |
| POST | `/api/auth/login` | Email/mật khẩu | 200 `{ token, user }` |
| POST | `/api/auth/dev-login` | Chỉ môi trường cho phép | 200 `{ token, user }` |
| GET | `/api/auth/options` | Công khai | 200 `{googleEnabled,devLoginEnabled}`; không có secrets |
| GET | `/api/auth/google/start` | Công khai | 302 Google, cookie giao dịch HttpOnly |
| GET | `/api/auth/google/callback` | Cookie/state hợp lệ | 302 về frontend với status, không JWT URL |
| POST | `/api/auth/google/complete` | Cookie một lần và Origin đúng | 200 login hoặc `{status:"link_required"}` |
| POST | `/api/auth/google/link-confirm` | Cookie, Origin, mật khẩu cũ và confirm | 200 `{token,user,next}` |
| GET | `/api/auth/me` | JWT | 200 `{user:SessionUser}` |
| POST | `/api/auth/logout` | JWT | 204 sau revoke sid |
| POST | `/api/auth/change-password` | Verifier, phiên password hợp lệ | 200 `{token,user}` với sid mới; đổi tự nguyện |
| GET | `/api/admin/verifiers` | Phiên đầy đủ, role admin | 200 verifier DTO an toàn |
| POST | `/api/admin/verifiers` | Phiên đầy đủ, role admin | 201 verifier DTO, không trả mật khẩu |
| GET | `/api/users` | JWT | 200 `Member[]` |
| GET | `/api/projects?q=&status=&kind=&sort=&page=&pageSize=` | Công khai, chỉ trạng thái công khai; mặc định ẩn đã huỷ | 200 `ProjectPage` `{ items, total, page, pageSize, totalPages, stats }` |
| GET | `/api/projects/{id}` | Token tùy chọn; bản riêng chỉ người có quyền | 200 `ProjectDetail` |
| POST | `/api/projects` | JWT; actor là điều phối mới | 201 `ProjectDetail`, `Location` |
| PUT | `/api/projects/{id}` | Điều phối, còn bản nháp | 200 `ProjectDetail` |
| DELETE | `/api/projects/{id}` | Điều phối, còn bản nháp; xoá mềm, ghi sổ `draft → deleted` | 204; sau đó mọi đường đọc/sửa trả 404 |
| POST | `/api/projects/{id}/submit` | Điều phối, bản nháp hợp lệ | 200 `ProjectDetail` |
| GET | `/api/verification-queue` | Người xác minh | 200 `QueueItem[]` |
| POST | `/api/projects/{id}/review` | Xác minh, không xung đột lợi ích | 200 `ProjectDetail` |
| POST | `/api/projects/{id}/ai-assessment` | Xác minh, không xung đột lợi ích, dự án đang chờ xác minh | 200 `ProjectDetail` với `latestAssessment.source = "ai"` |
| POST | `/api/projects/{id}/start` | Điều phối, đang kêu gọi | 200 `ProjectDetail` |
| POST | `/api/projects/{id}/complete` | Điều phối, đang thực hiện, đủ điều kiện chốt | 200 `ProjectDetail` |
| POST | `/api/projects/{id}/cancel` | Điều phối, đang kêu gọi/thực hiện | 200 `ProjectDetail` |
| POST | `/api/projects/{id}/contributions` | JWT, dự án nhận đóng góp, số lượng/quyền hợp lệ | 201 `Contribution` |
| POST | `/api/contributions/{id}/transition` | Theo actor và loại đóng góp | 200 `Contribution` |
| POST | `/api/projects/{id}/updates` | Điều phối/tài chính, dự án đã công khai | 201 `ProjectUpdate` |
| POST | `/api/projects/{id}/expenses` | Tài chính, dự án đang nhận đóng góp | 201 `Expense` |
| POST | `/api/expenses/{id}/review` | Điều phối khác người ghi | 200 `Expense` |
| POST | `/api/projects/{id}/receipts` | Người phụ trách tài chính, dự án đang nhận đóng góp; body là nội dung file, tên ở header `x-file-name` | 201 `FileMeta` `{ id, name, mime, size }` |
| GET | `/api/files/{id}` | Theo quyền xem chứng từ; không có quyền trả 404 | 200 nội dung file, `nosniff`, CSP sandbox |
| GET | `/api/me/dashboard` | JWT, công việc cá nhân | 200 `Dashboard` |
| GET | `/api/users/{id}/profile` | Công khai, chỉ dữ kiện hồ sơ được công khai | 200 `Profile` |
| GET | `/api/chat/model` | Công khai | 200 `ChatModelInfo` |
| POST | `/api/chat` | Khách, Qwen/Ollama | 200 `ChatReply` |

API chưa có: admin analytics AI, stream endpoint. Capability AI thứ hai (structured output) ở mục US-8 bên dưới. Google/auth/admin provisioning có ở bảng và phần US-1 bên dưới.

## 4. Request body và DTO

| Luồng | Body / nguồn schema |
| :-- | :-- |
| Danh sách công khai | Query: `q` ≤100 ký tự, tìm không phân biệt hoa thường và dấu trong tên/địa điểm/nhóm thụ hưởng; `status`, `kind`; `sort` = `soon` (gần ngày bắt đầu), `needed` (còn thiếu nhiều), `newest` (mới tạo); `page` ≥1; `pageSize` 1–48, mặc định 9. Dự án đã hoàn thành/huỷ luôn xếp cuối, khoá phụ là id nên thứ tự ổn định. Trang vượt quá trả trang cuối; `stats` tính trên mọi dự án công khai. [catalog.ts](../packages/domain/src/catalog.ts) |
| Đăng ký | `{ name, phone, email, password, confirmPassword }`; tên 2–100 ký tự, phone 10 số bắt đầu 0, password ≥8, hai mật khẩu khớp. [auth.schema.ts](../be/src/modules/auth/auth.schema.ts) |
| Login / dev-login | `{ email, password }` / `{ email }`; login mật khẩu trả lỗi thông tin xác thực chung khi sai |
| Tạo/sửa dự án | `ProjectInput`: name, goal, beneficiaryGroup, location, startDate/endDate, treasurerId nullable, needItems; item có label/unit/kind/targetQty/shift tùy chọn. [projects.schema.ts](../be/src/modules/projects/projects.schema.ts), [validate-project.ts](../packages/domain/src/validate-project.ts) |
| Submit / start | Không cần body nghiệp vụ |
| Review dự án/chi | `{ decision: "approve" hoặc "reject", reason? }`; từ chối/trả lại cần lý do theo rule |
| Đánh giá AI | `{ model?: "ollama" hoặc "gemini" }`, mặc định ollama. [verification.schema.ts](../be/src/modules/verification/verification.schema.ts) |
| Complete / cancel | `{ report }` tối thiểu 30 ký tự / `{ reason }` tối thiểu 10 sau trim |
| Cam kết | `{ needItemId, quantity }`; nguyên dương, không vượt phần còn thiếu |
| Chuyển đóng góp | `{ to: "delivered" hoặc "confirmed" hoặc "cancelled", note? }`, note tối đa 500 |
| Cập nhật | `{ body }`, 20–2000 ký tự theo schema/rule |
| Ghi chi | `{ needItemId, amount, description, receiptFileId?, receiptUrl? }`; amount nguyên dương trong giới hạn quỹ, description 10–500; `receiptFileId` là file vừa tải của chính người ghi, cùng dự án, chưa gắn khoản chi khác (sai → 422 `INVALID_RECEIPT_FILE`); `receiptUrl` giữ cho dữ liệu cũ |
| Tải chứng từ | Nội dung file thô (không multipart), JPEG/PNG/WebP/PDF ≤ 3 MB, loại nhận theo byte đầu file: rỗng 400 `EMPTY_FILE`, quá lớn 413 `FILE_TOO_LARGE`, sai loại 415 `UNSUPPORTED_FILE_TYPE` |

Quyền và constraints chi tiết ở [rules.ts](../packages/domain/src/rules.ts), các schema [verification](../be/src/modules/verification/verification.schema.ts), [contributions](../be/src/modules/contributions/contributions.schema.ts), [transparency](../be/src/modules/transparency/transparency.schema.ts). Tham chiếu [types.ts](../packages/domain/src/types.ts) cho DTO đầy đủ, không nhân bản toàn bộ types trong doc.

## 5. Trạng thái và bất biến

- Project: `draft → pending_verification → published → in_progress → completed`; trả lại từ pending về draft; hủy chỉ ở trạng thái được domain cho phép. Đăng công khai không tự có nghĩa đủ điều kiện chuyển tiếp.
- Contribution tạo mới hiện là `committed`; có chuyển delivered/confirmed/cancelled đúng luật. `proposed` có trong enum nhưng chưa có endpoint tạo, không mô tả một flow proposed đã chạy.
- Số lượng/số dư tính từ dữ liệu nguồn; tiền giữ tách người ghi/người xác nhận, không tự xác nhận; chi chờ duyệt giữ chỗ, audit không sửa/xóa.
- Submit gọi checklist quy tắc/Jaccard. Đánh giá bằng LLM chỉ chạy khi người xác minh bấm, xem mục US-8.

## 6. Chat RAG hiện tại

Body: `{ message, history? }`; message 1–1000 ký tự. Tối đa 8 history turns user/assistant, mỗi nội dung 1–3000. Zod strict không nhận trường ngoài hợp đồng, kể cả `model`, hoặc role system. Chat không yêu cầu JWT; backend luôn dùng Qwen qua Ollama đã cấu hình.

`ChatReply` là `{ reply, sources, generatedByModel, status, reasonCode, promptVersion }`. HTTP 200 có `status=answered|refused`; reasonCode gồm `RAG_ANSWERED`, `NO_EVIDENCE`, `MODEL_REFUSED`, `PROMPT_INJECTION`, `PRIVATE_DATA_REQUEST`, `SECRET_INPUT`, `UNSAFE_SOURCES`. Mỗi source gồm citation/id/title/url/excerpt; không trả projectId nội bộ. URL tới `/help#...` hoặc `/projects/{id}` đúng canonical. `GET /api/chat/model` trả `{ name, available }`; available là có client cấu hình, không phải health probe model.

Backend chọn history nội bộ: bỏ lượt lẻ, tối đa 3 cặp user/assistant, 1000 ký tự/turn, tổng 4000; bỏ citation cũ. Chỉ câu nối tiếp theo heuristic mới dùng history và ghép tối đa 2 câu user vào query; câu mới độc lập không gửi history cũ cho model. HTTP schema không bắt cặp, không nhận role system. Guard vẫn kiểm toàn raw history nhận được. Chi tiết [cấu trúc RAG](rag-structure.md).

Semantic retrieval dùng pgvector lưu bền: chunk mục tiêu 800 ký tự, overlap khoảng 120, embeddings 1024 chiều qua Ollama, tối đa 5 nguồn với similarity lớn hơn 0,35. Index chỉ cập nhật khi chạy `npm.cmd run rag:index`, không trong request hoặc startup. Chat dùng nội dung đã index dù cũ, vẫn SQL lọc model/trạng thái công khai trước LIMIT; không đọc lại nội dung/needs để kiểm freshness. Thiếu index cho model hiện tại → 503 `failed/CHAT_INDEX_NOT_READY`; không match trong index đúng model → `refused/NO_EVIDENCE`. Chat chỉ Qwen qua Ollama và cần Ollama query embedding. Xem [index thủ công](rag-manual-index.md).

Không còn nhánh lời chào/danh mục riêng. Không nguồn → `refused/NO_EVIDENCE`, không gọi generation. Model trả JSON nội bộ `{status,reply}`; backend validate schema/citation trước publish. Model từ chối → lời từ chối backend, không sources, `generatedByModel=false` dù đã gọi model. Sai JSON/schema hoặc thiếu/sai citation → HTTP 502 `failed`, không hiện output. Lỗi có `{error:{code,message,details?,status,reasonCode,promptVersion}}`; provider/config unavailable 503, timeout 504. History giả system/developer/admin → 400, metadata `refused/HISTORY_ROLE_FORBIDDEN`; input khác sai → 400 `failed/BAD_REQUEST`. Chat không yêu cầu auth và không có quota cloud.

Metadata được chuẩn bị trong RAM trước validation và ghi một bản tổng kết vào DB khi response đóng. Log ghi nền; lỗi log chỉ ghi console mã `CHAT_LOG_UNAVAILABLE` kèm metadata, không đổi HTTP/status câu trả lời. `chat_requests.request_id` là integer identity do DB cấp, khóa chính duy nhất; đã bỏ UUID id, lifecycle và embedded_documents. Chat response/error payload và UI không có requestId/mã tra cứu; HTTP logger/header x-request-id chung vẫn giữ để phục vụ toàn ứng dụng, không lưu vào bảng chat. JSON hỏng/quá lớn bị chặn trước route chỉ có HTTP log. Widget giữ hội thoại; bảng chỉ metadata, không câu hỏi/history/output/nguồn. Khi process tắt đột ngột hoặc DB lỗi, có thể thiếu row; xem [schema log tinh gọn](chat-log-sequence.md).

Top 5 là chunk, không phải toàn bộ danh mục hoặc 5 dự án khác nhau. Không suy ra tổng số/không có dự án từ retrieval. Citation hợp lệ chưa chứng minh nội dung đúng nguồn. Express trả JSON một lần, chưa streaming. UI chỉ gửi lại cặp hỏi–đáp answered; backend vẫn coi history là dữ liệu không đáng tin.

Giai đoạn 2: guard toàn bộ input/history trước cắt history và gọi AI; phát hiện injection/private request/credential → 200 refused, sources rỗng, generatedByModel=false, counts AI bằng 0. Lượt trộn hợp lệ với injection bị từ chối toàn bộ. Nguồn trong index cũ cũng phải qua guard title/excerpt/ID/URL; hết nguồn vì guard → `UNSAFE_SOURCES` (đã query embedding nhưng chưa generation). Nếu còn nguồn hợp lệ chỉ dùng nguồn đó, không tìm bù/renumber. Contact dự án công khai không bị chặn chỉ vì có email/phone. Guard theo mẫu, chưa là bảo đảm chống mọi injection; [chi tiết](us7-phase2.md).

`CHAT_TIMEOUT` HTTP 504 cho thời hạn chung 120 giây từ feature middleware qua retrieval/embedding/generation/kiểm output. Dùng một AbortController và timer; bỏ phân chia 115+5, ghi metadata nền không nằm trong thời hạn trả lời. Client ngắt kết nối thì hủy signal và ghi failed/CHAT_CANCELLED/499 nếu còn ghi được log. Dấu hiệu secret/prompt trong đáp án → 502 `CHAT_OUTPUT_UNSAFE`; provider body vượt giới hạn → 502 `CHAT_RESPONSE_TOO_LARGE`. Timeout DB 504 `CHAT_DATABASE_TIMEOUT`, kết nối DB chat không khả dụng 503 `CHAT_DATABASE_UNAVAILABLE`. Pool DB chat vẫn giới hạn thời gian kết nối/truy vấn; SQL đã gửi có thể hoàn tất muộn. UI chỉ retry do click/gửi lại, giữ draft và requestId. Không tự chuyển provider hoặc gọi model sửa JSON. Các kiểm output là structural/pattern, chưa kiểm chứng factual support. [Chi tiết và giới hạn](rag-simplification.md).

Provider error và scope/privacy/eval xem [ai-design](ai-design.md); source [chat.route.ts](../be/src/modules/chat/chat.route.ts), [chat.service.ts](../be/src/modules/chat/chat.service.ts), [chat.retrieval.ts](../be/src/modules/chat/chat.retrieval.ts).

## 7. Kiểm chứng

[Traceability](traceability.md) liên kết tới test cụ thể và khoảng trống. Fixtures/tests theo pipeline mới; kết quả thực thi và giới hạn ở [RAG evidence](evidence/rag-refactor-verification.md). Test model/vector giả không chứng minh provider thật hoặc chất lượng semantic.

## US-1: tài khoản, credentials và lỗi phiên

`SessionUser` riêng cho chủ phiên gồm id/name/email/role/identityVerified. Member/profile công khai không có passwordHash hoặc session method. Danh sách admin trả id/name/email/createdAt; không có trạng thái bắt buộc đổi mật khẩu.

- Tạo verifier: `{name,email,password,confirmPassword,phone?}`; strict schema không nhận role/identity flags. Server đặt role=verifier, identityVerified=false. Mật khẩu dùng được ngay.
- Verifier tự chọn đổi mật khẩu: `{currentPassword,newPassword,confirmPassword}`. Sai mật khẩu hiện tại trả422 CURRENT_PASSWORD_INVALID, giữ phiên; trùng mật khẩu422 PASSWORD_REUSED; schema/confirm sai400.
- Sau đổi: khóa/recheck user/session, đổi hash, revoke mọi sid cũ, cấp full sid mới trong transaction. Logout chỉ revoke sid hiện tại. Không refresh.
- Token limited cũ bị từ chối 401; token/phiên hết hạn hoặc revoked trả 401; lỗi DB trả 5xx.
- Google lookup identity bằng provider+sub; trùng email user cần mật khẩu cũ và `{password,confirm:true}`. Tài khoản chưa có password hoặc role admin/verifier không được liên kết. Google email_verified không tự cấp identityVerified.
- complete/link-confirm phải cùng Origin cấu hình và cookie flow; không nhận userId đích từ client. Flow một lần, TTL 5 phút, tối đa 5 lần thử mật khẩu, một backend process; restart yêu cầu đăng nhập lại.
- Mọi email collision so chữ thường bị 409; không cập nhật/promote tài khoản cũ. Công cụ bootstrap tạo admin riêng, không có public HTTP bootstrap.
- Request nhạy cảm no-store, log không chứa query OAuth, mật khẩu/hash, SQL parameters hoặc token. FE không retry tự động thao tác ghi có kết quả chưa rõ.

Xem [hướng dẫn local](us1-local.md) và [bằng chứng](evidence/us1-verification.md).

## US-8: đánh giá hồ sơ bằng AI (structured output)

- Model phải trả JSON `{ verdict, signals[] }`. Zod kiểm verdict `PASS`/`NEEDS_INFO`/`FLAG`, tối đa 6 signals; mỗi signal có `code` trong 7 mã (`UNCLEAR_BENEFICIARY`, `UNREALISTIC_PLAN`, `MONEY_NOT_EXPLAINED`, `SCHEDULE_UNCLEAR`, `PERSONAL_DATA`, `POSSIBLE_SCAM`, `OTHER`), `field` là một trường hồ sơ hoặc null, `message` 5–300 ký tự.
- Backend gộp với kết quả quy tắc: verdict lấy mức nặng nhất; `PERSONAL_DATA`, `POSSIBLE_SCAM` luôn thành FLAG. Signal của AI có tiền tố `AI_` trong `latestAssessment.signals`. Trạng thái dự án không đổi.
- Lỗi: 401 chưa đăng nhập; 403 không phải verifier hoặc xung đột lợi ích; 404 không thấy dự án; 409 `PROJECT_NOT_PENDING`; 502 `AI_INVALID_OUTPUT` sau 2 lần sai schema (không ghi gì); 503 `AI_MODEL_UNAVAILABLE` khi model chưa cấu hình; lỗi/timeout của provider theo mã chat hiện có.
- `latestAssessment.ai` (chỉ với đánh giá AI): `{ provider, model, promptVersion, attempts, latencyMs, inputTokens, outputTokens, costUsd }`, lấy từ bảng `ai_requests`.
- Chỉ gửi trường công khai của hồ sơ và tín hiệu quy tắc cho model. Frontend chờ tối đa 150 giây; proxy Next.js nâng `proxyTimeout` tương ứng.

Xem [AI design §7](ai-design.md#7-năng-lực-ai-thứ-hai-chưa-quyết-định) và [bằng chứng US-8](evidence/us8-verification.md).

## US-9: mức sử dụng AI (admin)

`GET /api/admin/ai-usage?period=7d` hoặc `?from=2026-10-01&to=2026-10-26`. Mặc định 7d, preset 24h/7d/30d; ngày tự chọn theo Việt Nam, tối đa 92 ngày gồm hai đầu trước clipping tại now. Schema strict; query lặp/rỗng/lạ, ngày sai hoặc kết hợp preset/ngày trả 400 BAD_REQUEST có details. Chưa đăng nhập 401, không phải admin 403, DB lỗi 500; success no-store.

Response gồm `period`, `totals`, `latency`, `tokens`, `cost`, `tools`, `byReason`, `recent`. [Contract TypeScript](../packages/domain/src/ai-usage.ts) và [công thức/NULL/0, ví dụ và triển khai](us9-ai-usage.md). Recent tối đa 50 metadata rows, không chứa nội dung chat/PII. Chi phí API và chi phí TB/request không áp dụng (local), không gán số tiền 0.

Từ 26/10/2026 response có thêm `assessment` cho vai thứ hai (người gác cổng US-8), đọc bảng `ai_requests` với `feature = assessment`: `totals { requests, ok, invalidOutput, failed, modelCalls, evalRuns }`, `latency { avgMs, p95Ms }`, `tokens { input, output, avgPerRequest }`, `byVersion`, `byOutcome`, `recent` (tối đa 50, kèm tên dự án). Lần chạy eval ghi `feature = assessment_eval`, chỉ đếm ở `evalRuns`. Trang `/admin/ai-usage` hiện hai thẻ vai AI và hai tab "Trợ lý hỏi đáp", "Người gác cổng".

## US-10 — SSE bảng đóng góp

`GET /api/projects/:id/contributions/events` trả `text/event-stream; charset=utf-8`, không cache hoặc buffer. Khách xem được dự án công khai; người đăng nhập gửi `Authorization: Bearer <token>` như API lấy dự án. Token không nằm trong URL. Dự án không tồn tại/không được xem trả 404; token sai/hết hạn trả 401 trước khi mở stream.

Mỗi frame gồm `event: <name>` và `data: {"projectId":"<uuid>"}`, kết thúc bằng dòng trống:

| Event | Client xử lý |
| --- | --- |
| `ready` | Đã đăng ký listener; lấy snapshot mới qua GET dự án |
| `contributions-changed` | Lấy snapshot mới; chỉ áp dụng vào bảng đóng góp |
| `heartbeat` | Kết nối còn hoạt động; không thay thế snapshot |
| `reconnect` | Mở lại kết nối và lấy snapshot mới |
| `auth-required` | Dừng stream, bỏ bảng của phiên cũ; xử lý hết phiên hiện tại |
| `access-lost` | Dừng stream, bỏ bảng; không đăng xuất toàn phiên |

Sự kiện thay đổi được phát sau commit tạo/chuyển trạng thái đóng góp và start/complete/cancel dự án (bao gồm hủy cam kết dây chuyền). Rollback không phát. Stream không chứa nội dung đóng góp hoặc token; GET snapshot tiếp tục kiểm quyền. Backend kiểm lại phiên/quyền trước sự kiện thay đổi và heartbeat 15 giây; chủ động quay vòng stream 60 giây. Sau headers, lỗi quyền được báo bằng control event, lỗi DB tạm thời đóng stream để thử lại; không ghi JSON giữa stream.

FE dùng fetch streaming cho Bearer header; một snapshot request tại một thời điểm, sự kiện trong lúc tải gây thêm lượt tải. Mất mạng tự nối lại với thời gian chờ tối đa 10 giây; watchdog 45 giây phát hiện stream im lặng. Mount/nối lại luôn lấy snapshot nên không cần event ID/replay log. Tab đóng góp đóng thì dọn stream/request/timer. Snapshot chỉ tác động bảng, ghi chú và ngữ cảnh quyền của bảng; các phần khác/nhãn tab giữ nguyên. Thao tác cục bộ giữ luồng reload hiện có.

Giới hạn: một BE instance, bộ phát trong RAM; nhiều instance cần broker chung. Không migration database. Bằng chứng tự động/local và phần nghiệm thu còn chờ xem [US10 verification](evidence/us10-verification.md).
