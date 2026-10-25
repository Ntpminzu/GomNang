# Truy vết và phân công kiểm chứng — GOM NẮNG

Cập nhật 25/10/2026. [Requirements](requirements.md) có 12 story theo luồng sản phẩm; mỗi story có task BE của An và FE của Khanh. **US-11 đang mở** theo quyết định nhóm, chưa phải acceptance hoàn chỉnh cho capability thứ hai.

## 1. Cách dùng

Có source/test không đồng nghĩa đủ AC hoặc deploy đạt. Cột hiện trạng mô tả phần tìm thấy; các test cần bổ sung chưa được ghi như file đã tồn tại. Chi tiết BE/FE và điều kiện nghiệm thu nằm trong từng story; đây là bảng source/test thực tế.

Nguồn test dùng chung: [domain rules](../packages/domain/src/rules.test.ts), [API tests](../be/tests/integration/api.test.ts), [FE mock tests](../fe/tests/mock-api.test.ts), [E2E](../fe/e2e/project-flow.spec.ts). Task `US-n.BE` và `US-n.FE` không tăng số user stories.

## 2. Story → API/component → source → tests

| Story / hiện trạng | API và source BE — An | Component/source FE — Khanh | Kiểm chứng và phần cần bổ sung |
| :-- | :-- | :-- | :-- |
| [US-1](requirements.md#us-1) — Một phần | `/api/auth/register`, `/login`, `/dev-login`; [auth.service](../be/src/modules/auth/auth.service.ts), [middleware](../be/src/modules/auth/auth.middleware.ts), [rules](../packages/domain/src/rules.ts) | [LoginPage](../fe/src/presentation/modules/auth/pages/LoginPage.tsx), [SessionProvider](../fe/src/presentation/providers/SessionProvider.tsx), [redirect](../fe/src/libs/utils/redirect.ts) | JWT/password có, OAuth2/admin chưa có. API tests thiếu token/token giả/bản nháp; [redirect tests](../fe/tests/redirect.test.ts), auth smoke cô lập. Cần OAuth callback/quyền admin và browser integration |
| [US-2](requirements.md#us-2) — Một phần | `POST/PUT/GET /api/projects...`; [service](../be/src/modules/projects/projects.service.ts), [schema](../be/src/modules/projects/projects.schema.ts), [validation](../packages/domain/src/validate-project.ts) | [ProjectForm](../fe/src/presentation/modules/projects/components/ProjectForm.tsx), [EditProjectPage](../fe/src/presentation/modules/projects/pages/EditProjectPage.tsx) | Tạo/xem/sửa có, xóa chờ Q-03/chưa có. [Validation tests](../packages/domain/src/validate-project.test.ts), API tạo/BR-002/BR-003/coordinatorId, FE mock/E2E tạo; bổ sung delete/quyền/quan hệ/rollback |
| [US-3](requirements.md#us-3) — Một phần | `GET /api/projects`; [repository](../be/src/modules/projects/projects.repository.ts) | [ProjectListPage](../fe/src/presentation/modules/projects/pages/ProjectListPage.tsx) | Có client filter/sort, chưa pagination/contract query đầy đủ. Cần BE tests filter/page/total/order và FE URL/pager. Nhãn newest đang so startDate, cần kiểm đúng ý nghĩa |
| [US-4](requirements.md#us-4) — Có chức năng chính | `/api/verification-queue`, `/api/projects/:id/submit`, `/review`; [service](../be/src/modules/verification/verification.service.ts), [assess](../packages/domain/src/assess.ts) | [Queue page](../fe/src/presentation/modules/verification/pages/VerificationQueuePage.tsx), [ReviewPanel](../fe/src/presentation/modules/verification/components/ReviewPanel.tsx) | Rules/Jaccard, không LLM. [Assess tests](../packages/domain/src/assess.test.ts), domain xung đột, API flow/review, E2E role navigation; cần runtime bản nộp |
| [US-5](requirements.md#us-5) — Có chức năng chính | `/api/projects/:id/contributions`, `/api/contributions/:id/transition`; [service](../be/src/modules/contributions/contributions.service.ts), [repository](../be/src/modules/contributions/contributions.repository.ts) | [CommitDialog](../fe/src/presentation/modules/contributions/components/CommitDialog.tsx), [ContributionsTable](../fe/src/presentation/modules/contributions/components/ContributionsTable.tsx) | Domain vượt nhu cầu/tự xác nhận/SELF_PLEDGE, API flow, FE mock/E2E. Khóa có trong source; cần bằng chứng test cạnh tranh, không suy từ unit tests |
| [US-6](requirements.md#us-6) — Có chức năng chính | `/api/projects/:id/start`, `/complete`, `/cancel`, `/updates`; [projects service](../be/src/modules/projects/projects.service.ts), [transparency service](../be/src/modules/transparency/transparency.service.ts) | [ProjectSidebar](../fe/src/presentation/modules/projects/components/ProjectSidebar.tsx), [UpdatesFeed](../fe/src/presentation/modules/transparency/components/UpdatesFeed.tsx) | API vòng đời/bảng tin, domain báo cáo/chi treo/hủy, FE mock lifecycle; cần browser đúng trạng thái và runtime. Real-time tiến độ chỉ bổ sung nếu Q-05 chọn |
| [US-7](requirements.md#us-7) — Có chức năng chính | `/api/projects/:id/expenses`, `/api/expenses/:id/review`; [service](../be/src/modules/transparency/transparency.service.ts), [rules](../packages/domain/src/rules.ts) | [Ledger](../fe/src/presentation/modules/transparency/components/Ledger.tsx), [ExpenseDialog](../fe/src/presentation/modules/transparency/components/ExpenseDialog.tsx) | Domain balance/pending/self-review; API ledger/DB constraint; chỉ link hóa đơn, file upload ở US-8. Cần integration trên môi trường nộp |
| [US-8](requirements.md#us-8) — Chưa có upload | Hiện chỉ `receiptUrl` trong [schema](../be/src/modules/transparency/transparency.schema.ts), chưa có storage/metadata/upload route | [ExpenseDialog](../fe/src/presentation/modules/transparency/components/ExpenseDialog.tsx) nhập URL, chưa file flow | Q-04 mở; cần BE loại/kích thước/quyền/lỗi lưu và FE chọn/tải/mở file. Không gán API dự kiến là endpoint đã tồn tại |
| [US-9](requirements.md#us-9) — Có chức năng chính | `/api/me/dashboard`, `/api/users/:id/profile`; [service](../be/src/modules/dashboard/dashboard.service.ts), [domain](../packages/domain/src/dashboard.ts) | [MyDashboardPage](../fe/src/presentation/modules/dashboard/pages/MyDashboardPage.tsx), [ProfilePage](../fe/src/presentation/modules/dashboard/pages/ProfilePage.tsx) | [Dashboard tests](../packages/domain/src/dashboard.test.ts), API việc theo vai/profile; cần FE browser đổi user. Không phải AI analytics |
| [US-10](requirements.md#us-10) — RAG có, real-time/kiểm chứng chưa đủ | `/api/chat`, `/api/chat/models`; [service](../be/src/modules/chat/chat.service.ts), [retrieval](../be/src/modules/chat/chat.retrieval.ts), [embedding](../be/src/modules/chat/chat.embedding.ts) | [ChatWidget](../fe/src/presentation/modules/chat/ChatWidget.tsx), [client](../fe/src/libs/api/chat.ts) | [Retrieval tests](../be/tests/integration/chat-retrieval.test.ts) còn lệch; [Ollama](../be/tests/integration/chat-model.test.ts)/[Gemini](../be/tests/integration/gemini-model.test.ts) tests mock fetch. `stream:false`, chưa live; Q-05 mở. Cần eval, guardrails, stream/flow real-time và UI integration |
| [US-11](requirements.md#us-11) — Chờ Q-01 | Chưa chọn model/tools/schema/contract capability thứ hai | Chưa có UI theo phương án được chọn | [AI design](ai-design.md#7-năng-lực-ai-thứ-hai-chưa-quyết-định) là các phương án; rule assessment/smoke script không thay capability đã tích hợp. Chỉ lập tests sau khi đủ AC |
| [US-12](requirements.md#us-12) — Chưa có analytics AI | Có [HTTP request log](../be/src/common/middleware/request-log.ts), chưa telemetry/model-cost/admin aggregate API | Có dashboard cá nhân, chưa admin AI dashboard | Cần instrumentation thật, test công thức/quyền/status và FE filter/empty/error; không mock số liệu để nghiệm thu |

## 3. Đề cuối kỳ → phạm vi BE/FE → đầu ra

| Mục đề | Story/yêu cầu | An — BE | Khanh — FE / phối hợp |
| :-- | :-- | :-- | :-- |
| §1–2: bài toán/người dùng | Requirements §1, US-2/5/10/11 | Dữ liệu và logic thật | Flow sử dụng có giá trị, demo |
| §3, §6: OAuth2/JWT/RBAC | US-1 | Provider/token/user/role/quyền | Login/session/menu/route, kiểm API trực tiếp cùng BE |
| §3, §6: CRUD/search/filter/sort/pagination | US-2/3 | API, validation, transaction/query | Form/list/detail/delete confirm/filter/pager |
| §3, §6: real-time | US-10 hoặc US-6 sau Q-05 | Transport/events và proxy | Nhận dần/live, kết thúc/hủy/lỗi |
| §6: file upload | US-8 | Storage/metadata/quyền/limits | File input và bằng chứng trong flow |
| §4.1: ≥2 capability | US-10/11 | RAG + pipeline capability thứ hai sau Q-01 | Chat/sources + UI capability thứ hai; chưa thể đóng Q-01 bằng doc |
| §4.2: prompt/model/guardrails/fallback/eval | AI-01…AI-06, US-10/11 | Prompt config, boundaries, model errors, eval runner/data | UI states, từ chối/nguồn, review expected/actual và quay demo |
| §4.2, §6: AI usage dashboard | US-12 | Tokens/cost/latency/status/aggregate | Admin dashboard thật |
| §5.1: 8–15 stories/traceability | DOC-01 | Mỗi story có task BE/source/tests | Mỗi story có task FE/source/tests; 12 parent stories, US-11 chưa cụ thể hóa |
| §5.2: diagram và ≥3 ADR | DOC-02 | Giải thích DB/vector/model/rules | Giải thích FE/request/data flow và trade-offs; [architecture](architecture.md), [ADR](adr/README.md) |
| §5.3–5.4: AI log/ownership/Git | DOC-03/04 | Rà module BE, prompt/output/tests/modifications | Rà module FE, review chéo; [AI_USAGE](../AI_USAGE.md), commit từng người |
| §7: responsive/privacy/security/persistence/testing | NFR-01…NFR-08 | Validation/quyền/dữ liệu/PII/DB/model | Responsive/accessibility/session/states, không đưa secret vào bundle; tích hợp và kiểm riêng từng môi trường |
| §8–9: mốc và deliverables | DOC-05…DOC-07 | API/model/runtime instructions, nội dung report | UI/demo/video; cùng PDF 10–20 trang, slide ≤15, video 3–5 phút, [backlog](backlog.md) |
| §10–11: defense/chấm điểm | DOC-08 | Trace/sửa trực tiếp module BE và giải thích chéo | Trace/sửa trực tiếp module FE và giải thích chéo; kiểm hiểu biết cá nhân riêng |

## 4. Ranh giới kiểm chứng

Các checks ngày 25/10/2026: domain 41/41, FE 15/15, adapter/lock 6/6 và auth smoke cô lập đạt. [Evidence](evidence/verification.md) nêu lệnh/phạm vi; kết quả này không tự chứng minh tất cả AC của bộ 12 US hoặc khả năng sử dụng ở deploy.

Backend API/RAG/full workspace/typecheck/build/E2E chưa được kiểm lại toàn bộ trong lần tài liệu. Fixtures API thiếu chatEmbedder; retrieval tests dùng chữ ký/dependency/chunk ID không phù hợp. Bộ US mới không sửa các test đó hoặc đổi chức năng.

Trước E2E đọc [config](../fe/playwright.config.ts), [server helper](../fe/e2e/local-servers.ts), [tests](../fe/e2e/project-flow.spec.ts): helper đọc be/.env, DATA_DIR tạm không bảo đảm tách DATABASE_URL thật. Chỉ chạy môi trường thử nghiệm được phép, bảo toàn dữ liệu.

## 5. Quy trình phối hợp và đóng story

1. Chốt contract và AC phụ thuộc trước; An/Khanh thống nhất DTO, mã lỗi và trạng thái UI. Đường dẫn endpoint mới chỉ ghi là đề xuất cho tới khi code có.
2. An làm BE/domain/API tests; Khanh làm FE và tests tầng mình theo cùng contract, có thể dùng mock để phát triển nhưng phải kiểm HTTP thật trước đóng.
3. Hai người ghép flow, thử AC đúng/sai quyền/lỗi và review chéo; ghi commit/môi trường/output/người kiểm.
4. Đóng story khi AC đạt; nếu chỉ BE hoặc FE xong thì ghi task tầng đó xong, parent story vẫn chưa nghiệm thu.
5. Cập nhật [backlog](backlog.md), [AI_USAGE](../AI_USAGE.md), ADR và evidence khi có thay đổi đáng kể; giữ tình trạng Q-01/Q-05 cùng các quyết định mở trung thực.
