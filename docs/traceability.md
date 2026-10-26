# Truy vết và phân công kiểm chứng — GOM NẮNG

Cập nhật 25/10/2026. [Requirements](requirements.md) có 10 story theo luồng sản phẩm; mỗi story có task BE của An và FE của Khanh. **US-8 đang mở** theo quyết định nhóm, chưa phải acceptance hoàn chỉnh cho capability thứ hai.

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
| [US-2](requirements.md#us-2) — Một phần | `POST/PUT/GET /api/projects...`; [service](../be/src/modules/projects/projects.service.ts), [schema](../be/src/modules/projects/projects.schema.ts), [validation](../packages/domain/src/validate-project.ts) | [ProjectForm](../fe/src/presentation/modules/projects/components/ProjectForm.tsx), [EditProjectPage](../fe/src/presentation/modules/projects/pages/EditProjectPage.tsx) | Tạo/xem/sửa có, xóa chờ Q-03/chưa có. [Validation tests](../packages/domain/src/validate-project.test.ts), API tạo/BR-002/BR-003/coordinatorId, FE mock/E2E tạo; bổ sung delete/quyền/quan hệ/rollback |
| [US-3](requirements.md#us-3) — Một phần | `GET /api/projects`; [repository](../be/src/modules/projects/projects.repository.ts) | [ProjectListPage](../fe/src/presentation/modules/projects/pages/ProjectListPage.tsx) | Có client filter/sort, chưa pagination/contract query đầy đủ. Cần BE tests filter/page/total/order và FE URL/pager. Nhãn newest đang so startDate, cần kiểm đúng ý nghĩa |
| [US-4](requirements.md#us-4) — Có chức năng chính | `/api/verification-queue`, `/api/projects/:id/submit`, `/review`; [service](../be/src/modules/verification/verification.service.ts), [assess](../packages/domain/src/assess.ts) | [Queue page](../fe/src/presentation/modules/verification/pages/VerificationQueuePage.tsx), [ReviewPanel](../fe/src/presentation/modules/verification/components/ReviewPanel.tsx) | Rules/Jaccard, không LLM. [Assess tests](../packages/domain/src/assess.test.ts), domain xung đột, API flow/review, E2E role navigation; cần runtime bản nộp |
| [US-5](requirements.md#us-5) — Chưa có upload | Hiện chỉ `receiptUrl` trong [schema](../be/src/modules/transparency/transparency.schema.ts), chưa có storage/metadata/upload route | [ExpenseDialog](../fe/src/presentation/modules/transparency/components/ExpenseDialog.tsx) nhập URL, chưa file flow | Q-04 mở; cần BE loại/kích thước/quyền/lỗi lưu và FE chọn/tải/mở file. Không gán API dự kiến là endpoint đã tồn tại |
| [US-6](requirements.md#us-6) — Có chức năng chính | `/api/me/dashboard`, `/api/users/:id/profile`; [service](../be/src/modules/dashboard/dashboard.service.ts), [domain](../packages/domain/src/dashboard.ts) | [MyDashboardPage](../fe/src/presentation/modules/dashboard/pages/MyDashboardPage.tsx), [ProfilePage](../fe/src/presentation/modules/dashboard/pages/ProfilePage.tsx) | [Dashboard tests](../packages/domain/src/dashboard.test.ts), API việc theo vai/profile; cần FE browser đổi user. Không phải AI analytics |
| [US-7](requirements.md#us-7) — Đã đóng theo nghiệm thu người dùng | Qwen/Ollama, RAG một pipeline/manual index, prompt v5/query v1, guard/output/citation, metadata request_id số; [service](../be/src/modules/chat/chat.service.ts), [telemetry](../be/src/modules/chat/chat.telemetry.ts), [output](../be/src/modules/chat/chat.output.ts) | [ChatWidget](../fe/src/presentation/modules/chat/ChatWidget.tsx): history/nguồn/loading/refused/error/retry, thông báo dữ liệu; không hiện ID log | [Manual-live-v1](evidence/us7-manual-evaluation.md): 20/20, fallback/phục hồi theo người dùng. [Schema evidence](evidence/chat-log-sequence-verification.md): 162 tests, typecheck/build, E2E 4/4; prompt v5 có 17 targeted tests. Baseline riêng và cách thử injection gián tiếp còn thiếu chi tiết đối chứng, không tuyên bố hồ sơ cuối kỳ đã đủ. Real-time riêng US10 |
| [US-8](requirements.md#us-8) — Chờ Q-01 | Chưa chọn model/tools/schema/contract capability thứ hai | Chưa có UI theo phương án được chọn | [AI design](ai-design.md#7-năng-lực-ai-thứ-hai-chưa-quyết-định) là các phương án; rule assessment/smoke script không thay capability đã tích hợp. Chỉ lập tests sau khi đủ AC |
| [US-9](requirements.md#us-9) — Có code, chờ nghiệm thu người dùng | chat.embedding/service/telemetry, admin aggregate API; admin-ai-usage/chat-embedding-usage/chat-log-migration tests | /admin/ai-usage, ai-usage.spec.ts: quyền/filter/states/công thức/metadata | [Spec](us9-ai-usage.md), [evidence](evidence/us9-verification.md); tools N/A tới US-8, local không gán chi phí vận hành bịa |

| [US-10](requirements.md#us-10) — Chưa có real-time | Hiện [chat.model.ts](../be/src/modules/chat/chat.model.ts) đặt `stream: false`; [route](../be/src/modules/chat/chat.route.ts) trả JSON một lần, chưa có transport real-time được chọn | [ChatWidget](../fe/src/presentation/modules/chat/ChatWidget.tsx), [chat client](../fe/src/libs/api/chat.ts) hiện chờ reply đầy đủ | Q-05 chốt flow/transport; cần test nhận dữ liệu trước completion/live event, thứ tự, quyền, hủy/ngắt/lỗi, Next proxy và demo container/deploy |

Các luồng đóng góp, vòng đời/bảng tin và thu chi không còn là US riêng; API/source/test tương ứng vẫn là chức năng hỗ trợ. Giữ kiểm hồi quy khi sửa nhu cầu, dashboard/profile, upload hoặc quyền; bỏ hàng US không có nghĩa xóa chức năng hay bằng chứng đã có.

## 3. Đề cuối kỳ → phạm vi BE/FE → đầu ra

| Mục đề | Story/yêu cầu | An — BE | Khanh — FE / phối hợp |
| :-- | :-- | :-- | :-- |
| §1–2: bài toán/người dùng | Requirements §1, US-2, US-7, US-8 | Dữ liệu và logic thật | Flow sử dụng có giá trị, demo |
| §3, §6: OAuth2/JWT/RBAC | US-1 | Provider/token/user/role/quyền | Login/session/menu/route, kiểm API trực tiếp cùng BE |
| §3, §6: CRUD/search/filter/sort/pagination | US-2, US-3 | API, validation, transaction/query | Form/list/detail/delete confirm/filter/pager |
| §3, §6: real-time | US-10, tích hợp US-7 nếu chọn streaming | Transport/events và proxy | Nhận dần/live, kết thúc/hủy/lỗi |
| §6: file upload | US-5 | Storage/metadata/quyền/limits | File input và bằng chứng trong flow |
| §4.1: ≥2 capability | US-7, US-8 | RAG + pipeline capability thứ hai sau Q-01 | Chat/sources + UI capability thứ hai; chưa thể đóng Q-01 bằng doc |
| §4.2: prompt/model/guardrails/fallback/eval | AI-01…AI-06, US-7, US-8 | Prompt config, boundaries, model errors, eval runner/data | UI states, từ chối/nguồn, review expected/actual và quay demo |
| §4.2, §6: AI usage dashboard | US-9 | Tokens/cost/latency/status/aggregate | Admin dashboard thật |
| §5.1: 8–15 stories/traceability | DOC-01 | Mỗi story có task BE/source/tests | Mỗi story có task FE/source/tests; 10 parent stories, US-8 chưa cụ thể hóa |
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
