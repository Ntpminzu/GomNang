# Truy vết và phân công kiểm chứng — GOM NẮNG

Cập nhật 25/10/2026. [Requirements](requirements.md) có 10 story theo luồng sản phẩm; mỗi story có task BE của An và FE của Khanh. US-8 là capability AI thứ hai (Structured output), chốt 25/10/2026.

## 1. Cách dùng

Cập nhật 26/10: **US7 đã đóng công việc theo nghiệm thu người dùng**, xác nhận 20/20 [manual-live-v1](evidence/us7-manual-evaluation.md), fallback và phục hồi Ollama đạt. Bộ [snapshot 20 câu](evaluation/us7-v1.md) vẫn chưa được chạy; số liệu baseline riêng và cách thử injection gián tiếp cụ thể chưa được cung cấp. Xem [kiểm chứng](evidence/us7-verification.md); không biến xác nhận thủ công thành kết quả do trợ lý chạy hoặc kết luận hồ sơ cuối kỳ đã đủ mọi minh chứng.

Quyết định mới: [chỉ Qwen/Ollama](chat-qwen-only.md), bỏ adapter/key/model selector cloud và milestone nghiệm thu hai provider. Mọi mốc lịch sử nhắc hai provider không còn là điều kiện nghiệm thu. Test fixtures/API đã sửa, chưa chạy automated checks.

[US7 giai đoạn 3](us7-phase3.md) đã code history theo câu nối tiếp, kiểm output secret/prompt, deadline request và body read, pool DB chat riêng, retry UI thủ công. Có source ca kiểm tra thời gian/body/output/topic switch; chưa thực thi, không ghi Ollama/Gemini nghiệm thu hoặc pass rate.

[US7 giai đoạn 2](us7-phase2.md) đã code `chat.guard.ts` dùng chung cho input/history/document/index cũ, thêm reasonCode từ chối và prompt v3. Có source tests `chat-guard.test.ts`, `chat-security.test.ts`, HTTP metadata và E2E từ chối → hỏi hợp lệ; chưa chạy, không ghi pass rate. Chưa nghiệm thu A4 đầy đủ hoặc toàn US7.

Điều chỉnh RAG ngày 26/10: [index thủ công](rag-manual-index.md), cho phép trả lời theo nội dung index cũ; không còn auto-sync hoặc kiểm content freshness trong chat. Vẫn SQL lọc trạng thái công khai trước topK. CLI/fixtures đã sửa nhưng chưa thực thi hoặc chạy automated checks cho thay đổi này.

Có source/test không đồng nghĩa đủ AC hoặc deploy đạt. Cột hiện trạng mô tả phần tìm thấy; các test cần bổ sung chưa được ghi như file đã tồn tại. Chi tiết BE/FE và điều kiện nghiệm thu nằm trong từng story; đây là bảng source/test thực tế.

Nguồn test dùng chung: [domain rules](../packages/domain/src/rules.test.ts), [API tests](../be/tests/integration/api.test.ts), [FE mock tests](../fe/tests/mock-api.test.ts), [E2E](../fe/e2e/project-flow.spec.ts). Task `US-n.BE` và `US-n.FE` không tăng số user stories.

## 2. Story → API/component → source → tests

| Story / hiện trạng | API và source BE — An | Component/source FE — Khanh | Kiểm chứng và phần cần bổ sung |
| :-- | :-- | :-- | :-- |
| [US-1](requirements.md#us-1) — Đã hiện thực, human review một phần | Auth Google/password/session/logout/change-password; `/api/admin/verifiers`; [auth](../be/src/modules/auth), [admin](../be/src/modules/admin), [migration](../be/drizzle/0010_us1_auth.sql) | Login/callback/optional password change/admin verifier UI; SessionProvider, role menu và safe redirect | [Auth API](../be/tests/integration/auth.test.ts), [migration](../be/tests/integration/auth-migration.test.ts), [FE session races](../fe/tests/auth-session.test.ts), [browser](../fe/e2e/auth-flow.spec.ts). [Evidence local và Supabase](evidence/us1-verification.md); Google user thường đã ghi nhận đăng nhập; human review chưa hoàn tất |
| [US-2](requirements.md#us-2) — Đã human review thao tác 26/10, chờ đọc source | `POST/PUT/GET/DELETE /api/projects...`; [service](../be/src/modules/projects/projects.service.ts), [schema](../be/src/modules/projects/projects.schema.ts), [validation](../packages/domain/src/validate-project.ts), `canDeleteProject` ở [rules.ts](../packages/domain/src/rules.ts), migration 0012 | [ProjectForm](../fe/src/presentation/modules/projects/components/ProjectForm.tsx), [EditProjectPage](../fe/src/presentation/modules/projects/pages/EditProjectPage.tsx), hộp thoại xoá ở [DraftPanel](../fe/src/presentation/modules/projects/components/DraftPanel.tsx) | [Validation tests](../packages/domain/src/validate-project.test.ts), API tạo/BR-002/BR-003/coordinatorId/xoá mềm, domain `canDeleteProject`, FE mock, [E2E](../fe/e2e/project-flow.spec.ts) tạo và xoá; [bằng chứng](evidence/us2-verification.md) |
| [US-3](requirements.md#us-3) — Đã human review thao tác 26/10, chờ đọc source | `GET /api/projects?q&status&kind&sort&page&pageSize`; `listQuery` ở [schema](../be/src/modules/projects/projects.schema.ts), `queryProjects` dùng chung ở [catalog.ts](../packages/domain/src/catalog.ts) | [ProjectListPage](../fe/src/presentation/modules/projects/pages/ProjectListPage.tsx): tìm có độ trễ, lọc, sắp xếp, nút trang, URL state | [catalog tests](../packages/domain/src/catalog.test.ts), API test US-3, mock test, [E2E](../fe/e2e/project-flow.spec.ts); "Mới đăng" nay sắp theo ngày tạo; [bằng chứng](evidence/us3-verification.md) |
| [US-4](requirements.md#us-4) — Đã human review thao tác 26/10, chờ đọc source | `/api/verification-queue`, `/api/projects/:id/submit`, `/review`; [service](../be/src/modules/verification/verification.service.ts), [assess](../packages/domain/src/assess.ts) | [Queue page](../fe/src/presentation/modules/verification/pages/VerificationQueuePage.tsx), [ReviewPanel](../fe/src/presentation/modules/verification/components/ReviewPanel.tsx) | Rules/Jaccard, không LLM. [Assess tests](../packages/domain/src/assess.test.ts), domain xung đột, API flow/review, API và E2E trả lại → gửi lại; [bằng chứng](evidence/us4-verification.md) |
| [US-5](requirements.md#us-5) — Đã human review phần lớn 26/10, chờ ảnh lớn/PDF và đọc source | `POST /api/projects/:id/receipts`, `GET /api/files/:id`; [transparency.service.ts](../be/src/modules/transparency/transparency.service.ts), [files.ts](../packages/domain/src/files.ts), migration 0013 | Chọn file, tự thu nhỏ ảnh, trạng thái tải/lỗi ở [ExpenseDialog](../fe/src/presentation/modules/transparency/components/ExpenseDialog.tsx); xem trước ở [ReceiptPreview](../fe/src/presentation/modules/transparency/components/ReceiptPreview.tsx) | [files tests](../packages/domain/src/files.test.ts), domain `canUploadReceipt`/`canViewReceipt`, API test US-5, mock test, [E2E](../fe/e2e/project-flow.spec.ts); [bằng chứng](evidence/us5-verification.md) |
| [US-6](requirements.md#us-6) — Đã human review thao tác 26/10, chờ đọc source | `/api/me/dashboard`, `/api/users/:id/profile`; [service](../be/src/modules/dashboard/dashboard.service.ts), [domain](../packages/domain/src/dashboard.ts) | [MyDashboardPage](../fe/src/presentation/modules/dashboard/pages/MyDashboardPage.tsx), [ProfilePage](../fe/src/presentation/modules/dashboard/pages/ProfilePage.tsx) | [Dashboard tests](../packages/domain/src/dashboard.test.ts), API việc theo vai/profile, API và E2E đổi tài khoản; [bằng chứng](evidence/us6-verification.md). Không phải AI analytics |
| [US-7](requirements.md#us-7) — Đã đóng theo nghiệm thu người dùng | Qwen/Ollama, RAG một pipeline/manual index, prompt v5/query v1, guard/output/citation, metadata request_id số; [service](../be/src/modules/chat/chat.service.ts), [telemetry](../be/src/modules/chat/chat.telemetry.ts), [output](../be/src/modules/chat/chat.output.ts) | [ChatWidget](../fe/src/presentation/modules/chat/ChatWidget.tsx): history/nguồn/loading/refused/error/retry, thông báo dữ liệu; không hiện ID log | [Manual-live-v1](evidence/us7-manual-evaluation.md): 20/20, fallback/phục hồi theo người dùng. [Schema evidence](evidence/chat-log-sequence-verification.md): 162 tests, typecheck/build, E2E 4/4; prompt v5 có 17 targeted tests. Baseline riêng và cách thử injection gián tiếp còn thiếu chi tiết đối chứng, không tuyên bố hồ sơ cuối kỳ đã đủ. Real-time riêng US10 |
| [US-8](requirements.md#us-8) — Đã human review và chạy tự động H1–H9 26/10, chờ đọc source | `POST /api/projects/:id/ai-assessment`: [verification.ai.ts](../be/src/modules/verification/verification.ai.ts), [service](../be/src/modules/verification/verification.service.ts), [prompts](../be/src/modules/verification/prompts/), `mergeAiAssessment` ở [assess.ts](../packages/domain/src/assess.ts) | Nút "Đánh giá bằng AI", chọn model, trạng thái chờ/lỗi, nhãn AI: [AssessmentPanel](../fe/src/presentation/modules/verification/components/AssessmentPanel.tsx) | [API tests](../be/tests/integration/api.test.ts), adapter gửi JSON Schema, domain merge, [E2E](../fe/e2e/project-flow.spec.ts), [mock](../fe/tests/mock-api.test.ts); eval 20 ca [eval-assessment.ts](../be/scripts/eval-assessment.ts); [bằng chứng](evidence/us8-verification.md) |
| [US-9](requirements.md#us-9) — Có code, chờ nghiệm thu người dùng | chat.embedding/service/telemetry, admin aggregate API (thêm phần `assessment` từ `ai_requests` cho người gác cổng); admin-ai-usage/chat-embedding-usage/chat-log-migration tests | /admin/ai-usage, ai-usage.spec.ts: quyền/filter/states/công thức/metadata | [Spec](us9-ai-usage.md), [evidence](evidence/us9-verification.md); tools N/A tới US-8, local không gán chi phí vận hành bịa |

| [US-10](requirements.md#us-10) — Có code, chờ human/deploy | [SSE/bus](../be/src/modules/contributions/contributions.events.ts), contributions/project services phát sau commit; [tests](../be/tests/integration/contributions-events.test.ts) quyền/rollback/cascade/thu hồi phiên/cleanup | [Client SSE](../fe/src/libs/api/contribution-events.ts), [hook bảng](../fe/src/presentation/modules/contributions/use-contribution-updates.ts), [ContributionsTable](../fe/src/presentation/modules/contributions/components/ContributionsTable.tsx); snapshot riêng, tự nối lại | [E2E](../fe/e2e/contributions-realtime.spec.ts): hai phiên, mất mạng/restart, snapshot chậm/lỗi, bảng rỗng, proxy >125 giây; [evidence](evidence/us10-verification.md), chưa nghiệm thu demo thật |

Các luồng đóng góp, vòng đời/bảng tin và thu chi không còn là US riêng; API/source/test tương ứng vẫn là chức năng hỗ trợ. Giữ kiểm hồi quy khi sửa nhu cầu, dashboard/profile, upload hoặc quyền; bỏ hàng US không có nghĩa xóa chức năng hay bằng chứng đã có.

## 3. Đề cuối kỳ → phạm vi BE/FE → đầu ra

| Mục đề | Story/yêu cầu | An — BE | Khanh — FE / phối hợp |
| :-- | :-- | :-- | :-- |
| §1–2: bài toán/người dùng | Requirements §1, US-2, US-7, US-8 | Dữ liệu và logic thật | Flow sử dụng có giá trị, demo |
| §3, §6: OAuth2/JWT/RBAC | US-1 | Provider/token/user/role/quyền | Login/session/menu/route, kiểm API trực tiếp cùng BE |
| §3, §6: CRUD/search/filter/sort/pagination | US-2, US-3 | API, validation, transaction/query | Form/list/detail/delete confirm/filter/pager |
| §3, §6: real-time | US-10 — SSE bảng đóng góp | Sự kiện sau commit, quyền và proxy | Bảng cập nhật live, trạng thái kết nối/đồng bộ, tự nối lại |
| §6: file upload | US-5 | Storage/metadata/quyền/limits | File input và bằng chứng trong flow |
| §4.1: ≥2 capability | US-7, US-8 | RAG + Structured output (ADR-004) | Chat/sources + nút đánh giá AI cho người xác minh |
| §4.2: prompt/model/guardrails/fallback/eval | AI-01…AI-06, US-7, US-8 | Prompt config, boundaries, model errors, eval runner/data | UI states, từ chối/nguồn, review expected/actual và quay demo |
| §4.2, §6: AI usage dashboard | US-9 | Tokens/cost/latency/status/aggregate | Admin dashboard thật |
| §5.1: 8–15 stories/traceability | DOC-01 | Mỗi story có task BE/source/tests | Mỗi story có task FE/source/tests; 10 parent stories, US-8 đã cụ thể hóa 25/10 |
| §5.2: diagram và ≥3 ADR | DOC-02 | Giải thích DB/vector/model/rules | Giải thích FE/request/data flow và trade-offs; [architecture](architecture.md), [ADR](adr/README.md) |
| §5.3–5.4: AI log/ownership/Git | DOC-03/04 | Rà module BE, prompt/output/tests/modifications | Rà module FE, review chéo; [AI_USAGE](../AI_USAGE.md), commit từng người |
| §7: responsive/privacy/security/persistence/testing | NFR-01…NFR-08 | Validation/quyền/dữ liệu/PII/DB/model | Responsive/accessibility/session/states, không đưa secret vào bundle; tích hợp và kiểm riêng từng môi trường |
| §8–9: mốc và deliverables | DOC-05…DOC-07 | API/model/runtime instructions, nội dung report | UI/demo/video; cùng PDF 10–20 trang, slide ≤15, video 3–5 phút, [backlog](backlog.md) |
| §10–11: defense/chấm điểm | DOC-08 | Trace/sửa trực tiếp module BE và giải thích chéo | Trace/sửa trực tiếp module FE và giải thích chéo; kiểm hiểu biết cá nhân riêng |

## 4. Ranh giới kiểm chứng

Các checks nền ngày 25/10/2026 được giữ tại [verification](evidence/verification.md). Lần triển khai US-1 có kết quả riêng ở [US-1 evidence](evidence/us1-verification.md); mock/fixture không chứng minh Google thật hoặc deploy.

Trong lần triển khai US-1, workspace tests/typecheck/build và E2E đã được chạy lại; xem [US-1 evidence](evidence/us1-verification.md) cho kết quả và giới hạn. Fixtures API/RAG đã được cập nhật đúng contract async; vector giả chỉ kiểm DB/contract, không chứng minh chất lượng semantic model.

Trước E2E đọc [config](../fe/playwright.config.ts), [server helper](../fe/e2e/local-servers.ts), [test-only backend](../fe/e2e/backend.ts). Helper mới không đọc be/.env, ép DATABASE_URL rỗng, tạo DATA_DIR tạm và chạy một worker để tránh tranh cổng. Chỉ dùng DB test được phép; Google thật và PostgreSQL/Supabase cần bằng chứng riêng.

## 5. Quy trình phối hợp và đóng story

1. Chốt contract và AC phụ thuộc trước; An/Khanh thống nhất DTO, mã lỗi và trạng thái UI. Đường dẫn endpoint mới chỉ ghi là đề xuất cho tới khi code có.
2. An làm BE/domain/API tests; Khanh làm FE và tests tầng mình theo cùng contract, có thể dùng mock để phát triển nhưng phải kiểm HTTP thật trước đóng.
3. Hai người ghép flow, thử AC đúng/sai quyền/lỗi và review chéo; ghi commit/môi trường/output/người kiểm.
4. Đóng story khi AC đạt; nếu chỉ BE hoặc FE xong thì ghi task tầng đó xong, parent story vẫn chưa nghiệm thu.
5. Cập nhật [backlog](backlog.md), [AI_USAGE](../AI_USAGE.md), ADR và evidence khi có thay đổi đáng kể; giữ tình trạng Q-01/Q-05 cùng các quyết định mở trung thực.
