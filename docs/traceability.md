# Requirement Traceability Matrix — GomNang

Cập nhật **27/10/2026**. Đối chiếu đề §5.1: **User story → API endpoint hoặc component → source → test case**. Phạm vi là 10 stories và 42 acceptance criteria trong [requirements](requirements.md); không thêm story hoặc thay đổi chức năng qua việc viết tài liệu.

## 1. Quy ước và kết luận rà soát

- `US-n.Am` là mã acceptance criterion; `TC-nn` là bí danh tài liệu cho **ca test có sẵn**, tên test và file gốc ở §4. Không có test mới được tạo chỉ để hoàn thiện bảng.
- Có source/test nghĩa là truy vết được, không tự tương đương Pass hoặc đã nghiệm thu. Kết quả thực thi phải dẫn evidence với ngày, môi trường và giới hạn.
- Test domain kiểm luật thuần; API dùng DB/fixtures cô lập; E2E dùng model/provider fixture trừ khi evidence nói rõ khác. Những loại này không thay thế model thật, Google thật hoặc bản Docker/deploy.
- An sở hữu BE, Khanh sở hữu FE theo mặc định; **US-8 do Khanh hiện thực BE/FE**, An review tích hợp. Hai người cùng kiểm chéo và phải giải thích được code.

**Đánh giá về tài liệu:** đủ 10 stories theo giới hạn 8–15, mỗi story có vai trò/nhu cầu/giá trị và tiêu chí quan sát được. Các bảng dưới cung cấp đường truy vết cho toàn bộ tiêu chí; hàng ghi “chưa đủ bằng chứng” vẫn là khoảng trống phải bổ sung trước khi khẳng định toàn bộ yêu cầu đã đạt.

## 2. User story → API/component → source

Các endpoint dưới đây đã đối chiếu route hiện tại; tên `:id` là tham số đường dẫn. Các file nguồn được chọn làm điểm bắt đầu truy vết, không phải liệt kê toàn bộ file phụ thuộc.

| Story | API / giao diện | Source backend/domain | Source frontend |
| :-- | :-- | :-- | :-- |
| [US-1](requirements.md#us-1) | `/login`, `/auth/callback`, `/admin/verifiers`; `GET /api/auth/google/start`, `GET /api/auth/google/callback`, `POST /api/auth/google/complete`, `POST /api/auth/google/link-confirm`; `POST /api/auth/login`, `/register`, `/logout`, `/change-password`; `GET /api/auth/me`; `GET/POST /api/admin/verifiers` | [auth routes](../be/src/modules/auth/auth.route.ts), [Google controller](../be/src/modules/auth/auth.oauth.controller.ts), [auth service](../be/src/modules/auth/auth.service.ts), [admin routes](../be/src/modules/admin/admin.route.ts) | [LoginPage](../fe/src/presentation/modules/auth/pages/LoginPage.tsx), [GoogleCallbackPage](../fe/src/presentation/modules/auth/pages/GoogleCallbackPage.tsx), [session](../fe/src/libs/session/index.ts) |
| [US-2](requirements.md#us-2) | `POST /api/projects`, `GET/PUT/DELETE /api/projects/:id`; form tạo/sửa, chi tiết và xác nhận xóa | [routes](../be/src/modules/projects/projects.route.ts), [service](../be/src/modules/projects/projects.service.ts), [repository](../be/src/modules/projects/projects.repository.ts), [validation](../packages/domain/src/validate-project.ts), [rules](../packages/domain/src/rules.ts) | [ProjectForm](../fe/src/presentation/modules/projects/components/ProjectForm.tsx), [EditProjectPage](../fe/src/presentation/modules/projects/pages/EditProjectPage.tsx), [DraftPanel](../fe/src/presentation/modules/projects/components/DraftPanel.tsx) |
| [US-3](requirements.md#us-3) | `GET /api/projects?q=&status=&kind=&sort=&page=&pageSize=`; danh sách và bộ lọc URL | [schema](../be/src/modules/projects/projects.schema.ts), [service](../be/src/modules/projects/projects.service.ts), [catalog](../packages/domain/src/catalog.ts) | [ProjectListPage](../fe/src/presentation/modules/projects/pages/ProjectListPage.tsx) |
| [US-4](requirements.md#us-4) | `GET /api/verification-queue`; `POST /api/projects/:id/submit`, `/api/projects/:id/review`; `/verify` và khung review | [routes](../be/src/modules/verification/verification.route.ts), [service](../be/src/modules/verification/verification.service.ts), [rule assessment](../packages/domain/src/assess.ts), [rules](../packages/domain/src/rules.ts) | [VerificationQueuePage](../fe/src/presentation/modules/verification/pages/VerificationQueuePage.tsx), [ReviewPanel](../fe/src/presentation/modules/verification/components/ReviewPanel.tsx) |
| [US-5](requirements.md#us-5) | `POST /api/projects/:id/receipts`, `POST /api/projects/:id/expenses`, `GET /api/files/:id`; tải/xem chứng từ | [routes](../be/src/modules/transparency/transparency.route.ts), [service](../be/src/modules/transparency/transparency.service.ts), [upload middleware](../be/src/modules/transparency/transparency.middleware.ts), [file types/limits](../packages/domain/src/files.ts), [rules](../packages/domain/src/rules.ts) | [ExpenseDialog](../fe/src/presentation/modules/transparency/components/ExpenseDialog.tsx), [ReceiptPreview](../fe/src/presentation/modules/transparency/components/ReceiptPreview.tsx) |
| [US-6](requirements.md#us-6) | `GET /api/me/dashboard`, `GET /api/users/:id/profile`; `/me`, `/u/[id]` | [routes](../be/src/modules/dashboard/dashboard.route.ts), [service](../be/src/modules/dashboard/dashboard.service.ts), [domain](../packages/domain/src/dashboard.ts) | [MyDashboardPage](../fe/src/presentation/modules/dashboard/pages/MyDashboardPage.tsx), [ProfilePage](../fe/src/presentation/modules/dashboard/pages/ProfilePage.tsx) |
| [US-7](requirements.md#us-7) | `GET /api/chat/model`, `POST /api/chat`; widget chat và lệnh `npm.cmd run rag:index` | [route](../be/src/modules/chat/chat.route.ts), [service](../be/src/modules/chat/chat.service.ts), [retrieval](../be/src/modules/chat/chat.retrieval.ts), [repository](../be/src/modules/chat/chat.repository.ts), [config](../be/src/modules/chat/chat.config.ts), [guards](../be/src/modules/chat/chat.guard.ts), [output](../be/src/modules/chat/chat.output.ts), [index CLI](../be/scripts/index-chat.ts) | [ChatWidget](../fe/src/presentation/modules/chat/ChatWidget.tsx), [chat API client](../fe/src/libs/api/chat.ts) |
| [US-8](requirements.md#us-8) | `POST /api/projects/:id/ai-assessment`, body `{}`; nút “Đánh giá bằng AI” | [route](../be/src/modules/verification/verification.route.ts), [service](../be/src/modules/verification/verification.service.ts), [AI/schema](../be/src/modules/verification/verification.ai.ts), [prompts](../be/src/modules/verification/prompts/), [merge](../packages/domain/src/assess.ts), [eval runner](../be/scripts/eval-assessment.ts) | [AssessmentPanel](../fe/src/presentation/modules/verification/components/AssessmentPanel.tsx) |
| [US-9](requirements.md#us-9) | `GET /api/admin/ai-usage`; `/admin/ai-usage`, hai tab chatbot/assessment | [admin routes](../be/src/modules/admin/admin.route.ts), [aggregate](../be/src/modules/admin/admin.repository.ts), [service](../be/src/modules/admin/admin.service.ts), [chat telemetry](../be/src/modules/chat/chat.telemetry.ts), [usage contract](../packages/domain/src/ai-usage.ts) | [AiUsagePage](../fe/src/presentation/modules/admin/pages/AiUsagePage.tsx), [ChatUsageView](../fe/src/presentation/modules/admin/components/ChatUsageView.tsx), [AssessmentUsageView](../fe/src/presentation/modules/admin/components/AssessmentUsageView.tsx) |
| [US-10](requirements.md#us-10) | `GET /api/projects/:id/contributions/events`; snapshot `GET /api/projects/:id`; tab đóng góp | [routes](../be/src/modules/contributions/contributions.route.ts), [SSE/bus](../be/src/modules/contributions/contributions.events.ts), [contribution service](../be/src/modules/contributions/contributions.service.ts), [project service](../be/src/modules/projects/projects.service.ts) | [SSE client](../fe/src/libs/api/contribution-events.ts), [hook](../fe/src/presentation/modules/contributions/use-contribution-updates.ts), [ContributionsTable](../fe/src/presentation/modules/contributions/components/ContributionsTable.tsx) |

## 3. Acceptance criterion → test case → giới hạn bằng chứng

`Có ca tự động` là xác nhận test tồn tại và kiểm phần hành vi được ghi; không nói toàn bộ tiêu chí đã được chứng minh. Các bằng chứng H/M/E là mã đã có trong phiếu thủ công hoặc dataset, không phải test mới.

| Tiêu chí | Ca tự động / đánh giá liên quan | Phạm vi và phần còn cần kiểm |
| :-- | :-- | :-- |
| US-1.A1 | [TC-01](#tc-01), [TC-02](#tc-02), [TC-03](#tc-03) | Google qua client fixture và JWT/session; Google thật và liên kết email xem US-1 H1–H3, chưa đủ nghiệm thu toàn story. |
| US-1.A2 | [TC-02](#tc-02), [TC-04](#tc-04) | Role/escalation và privileged Google bị chặn; thêm domain rules kiểm admin không tự có quyền verifier. |
| US-1.A3 | [TC-03](#tc-03), [TC-05](#tc-05), [TC-18](#tc-18) | Token/401/5xx và UI role; cancellation/provider error có thêm test trong auth.test.ts; cần hoàn tất phiếu human review. |
| US-1.A4 | [TC-06](#tc-06) | Production dev-login có test; audit secrets trong frontend/repo/toàn lịch sử Git còn cần bằng chứng riêng. |
| US-1.A5 | [TC-07](#tc-07) | Browser fixture tạo verifier và đổi mật khẩu; bootstrap/session backend có test trong auth.test.ts; review người dùng xem US-1. |
| US-2.A1 | [TC-08](#tc-08), [TC-15](#tc-15) | Tạo và mở lại dự án trong luồng tích hợp; persistence có test riêng trong api.test.ts. |
| US-2.A2 | [TC-09](#tc-09), [TC-44](#tc-44), [TC-45](#tc-45) | BR-002/003 và actor chống mạo danh; audit/transaction được kiểm trong API flow. |
| US-2.A3 | [TC-10](#tc-10) | Test domain kiểm quyền/trạng thái; validation tests và FE form có source, cần review UI giữ form khi lỗi trong môi trường demo. |
| US-2.A4 | [TC-11](#tc-11), [TC-46](#tc-46) | API xóa mềm và E2E xác nhận xóa; human thao tác đã ghi, chờ đọc source/đóng phiếu US-2. |
| US-3.A1 | [TC-12](#tc-12) | Tìm/lọc/sort/public qua API; catalog.test.ts kiểm chi tiết từng quy tắc. |
| US-3.A2 | [TC-12](#tc-12), [TC-13](#tc-13) | Pagination/400 trong snapshot; stats có ca riêng trong catalog.test.ts. |
| US-3.A3 | [TC-14](#tc-14) | URL/reload/empty qua browser fixture; trạng thái lỗi và nghiệm thu đọc source vẫn cần review. |
| US-4.A1 | [TC-15](#tc-15) | Tạo → gửi → duyệt, trạng thái và audit qua API/DB test. |
| US-4.A2 | [TC-16](#tc-16), [TC-17](#tc-17) | Reject có lý do, gửi lại, quyền và xung đột; có browser tương ứng trong project-flow.spec.ts. |
| US-4.A3 | [TC-18](#tc-18), [TC-32](#tc-32) | UI theo role và assessment có source; việc giải thích phân biệt rule/AI cần review US-4/8. |
| US-5.A1 | [TC-19](#tc-19) | Byte/metadata/link khoản chi; không suy ca này là chứng minh UI PDF/ảnh lớn đã đạt. |
| US-5.A2 | [TC-19](#tc-19), [TC-20](#tc-20) | Quyền, loại file và API errors; test không thay audit quyền toàn hệ thống. |
| US-5.A3 | [TC-21](#tc-21) | E2E PNG nhỏ; US-5 H2 ảnh lớn/PDF và phần H3 còn thiếu kiểm thủ công. Không có multimodal AI. |
| US-6.A1 | [TC-22](#tc-22) | Đổi tài khoản và hồ sơ không lộ email/phone; dashboard.test.ts kiểm phép tổng hợp. |
| US-6.A2 | [TC-23](#tc-23) | Browser đổi người và profile; cần hoàn tất đọc source/review trạng thái UI trong phiếu US-6. |
| US-7.A1 | [TC-24](#tc-24) | Browser fixture mở nguồn; retrieval/index tests kiểm vector contract, manual M01–M12 kiểm câu trả lời thật. Chưa tự chứng minh entailment. |
| US-7.A2 | [TC-25](#tc-25) | Index cũ còn public được dùng, dự án chuyển riêng bị lọc; các case index/retrieval kiểm nguồn public. |
| US-7.A3 | [TC-26](#tc-26) | Metadata sau response; source config có prompt/query version. Best-effort không cam kết log mọi traffic. |
| US-7.A4 | [TC-27](#tc-27), [TC-28](#tc-28) | Fixture chặn input và nguồn đầu độc; manual M13–M18 và kiểm bổ sung §9. Injection gián tiếp model thật còn thiếu đối chứng cách thử. |
| US-7.A5 | [TC-29](#tc-29) | Fixture đổi chủ đề React; manual M19–M20 được người dùng xác nhận, chưa đính kèm output/log từng ca. |
| US-7.A6 | [TC-30](#tc-30), [TC-31](#tc-31), [TC-48](#tc-48) | Sai JSON/citation/secret và UI phục hồi câu hỏi; runtime/model tests có timeout/body/error. Demo lỗi thật ghi riêng. |
| US-7.A7 | Đánh giá/thủ công, xem §5 | Manual evaluation §9: người dùng xác nhận tắt/mở Ollama và non-AI vẫn hoạt động; chưa có ID/giờ đối chứng cụ thể. Không gán một unit test thành phép thử fallback toàn hệ thống. |
| US-7.A8 | Đánh giá/thủ công, xem §5 | Manual M01–M20 có expected và xác nhận sau cải tiến 20/20; bộ snapshot E01–E20 còn NOT_RUN; baseline riêng và đối chứng nguồn injection gián tiếp còn thiếu. |
| US-7.A9 | [TC-24](#tc-24), [TC-31](#tc-31) | History/nguồn/lỗi/retry qua fixture; thông báo dữ liệu đối chiếu ChatWidget và human review. |
| US-8.A1 | [TC-32](#tc-32) | API kiểm quyền/trạng thái; model/provider fixture. Body theo schema chỉ Ollama, không selector cloud. |
| US-8.A2 | [TC-33](#tc-33) | Retry một lần và giữ assessment khi JSON sai; telemetry lỗi có thể vẫn ghi, không ghi “không ghi DB gì”. |
| US-8.A3 | [TC-32](#tc-32), [TC-34](#tc-34) | Gộp/lưu, không hạ cảnh báo; domain có thêm ca PERSONAL_DATA/POSSIBLE_SCAM. Hàng chờ và UI xem US-8 H2/H8. |
| US-8.A4 | [TC-33](#tc-33) | Test schema không chứng minh nhận diện injection. US-8 H3/H4 có model thật, H6 có fallback. Eval mới nhất vẫn bỏ sót F03/F05/F06. |
| US-8.A5 | [TC-36](#tc-36) | Test aggregate cho assessment; eval runner/dataset và JSON kết quả là bằng chứng đo chất lượng, không phải test mock. Chi tiết tại §5. |
| US-9.A1 | [TC-26](#tc-26), [TC-35](#tc-35), [TC-36](#tc-36) | Metadata/usage và mẫu số; logging best-effort, thiếu log không tự bằng zero request. |
| US-9.A2 | [TC-35](#tc-35), [TC-36](#tc-36), [TC-47](#tc-47) | Hai vai AI và công thức; cần nghiệm thu dashboard trên DB/model thật theo US-9 H1–H3. |
| US-9.A3 | [TC-37](#tc-37), [TC-38](#tc-38), [TC-49](#tc-49) | Quyền API/UI và filter race; thêm guest/empty/error/retry trong ai-usage.spec.ts và admin-ai-usage.test.ts. US-9 H4/H5 chưa đóng. |
| US-10.A1 | [TC-39](#tc-39) | Commit/rollback và cascade bằng API/DB fixture. |
| US-10.A2 | [TC-39](#tc-39), [TC-40](#tc-40) | Phân tách dự án/quyền và hai phiên; không mang dữ liệu riêng trong event. |
| US-10.A3 | [TC-40](#tc-40), [TC-42](#tc-42) | Chỉ bảng cập nhật, chống response cũ; test public empty table có trong contributions-realtime.spec.ts. |
| US-10.A4 | [TC-41](#tc-41), [TC-42](#tc-42) | Mất mạng/restart/snapshot lỗi; auth revocation/cleanup thêm ở TC-39 và test stream lifecycle. |
| US-10.A5 | [TC-39](#tc-39), [TC-40](#tc-40), [TC-41](#tc-41), [TC-43](#tc-43) | E2E local qua Next proxy >125 giây đã có evidence; container/deploy hai phiên vẫn PENDING_DEPLOY ở US-10 H6. |

## 4. Danh mục ca kiểm tự động có thể mở từ code

Tên dưới đây là tên nguyên văn trong test source. Có thể tìm tên bằng IDE hoặc chạy test với `--test-name-pattern` (Node) / `--grep` (Playwright) theo runner phù hợp. Test chưa được chạy lại trong lượt chuẩn hóa tài liệu ngày 27/10; kết quả lịch sử nằm ở evidence §5.

| Mã | Loại | File và tên test |
| :-- | :-- | :-- |
| <a id="tc-01"></a>TC-01 | Backend/API fixture | [auth.test.ts](../be/tests/integration/auth.test.ts) — Google creates only ordinary user, same subject preserves ID, Origin/replay protections |
| <a id="tc-02"></a>TC-02 | Backend/API fixture | [auth.test.ts](../be/tests/integration/auth.test.ts) — Google email collision requires password proof and preserves old user; passwordless/privileged denied |
| <a id="tc-03"></a>TC-03 | Backend/API fixture | [auth.test.ts](../be/tests/integration/auth.test.ts) — logout revokes copied token only, other session survives; expired and malformed tokens fail |
| <a id="tc-04"></a>TC-04 | Backend/API fixture | [auth.test.ts](../be/tests/integration/auth.test.ts) — register fixes ordinary role; password/dev cannot escalate; current role comes from DB |
| <a id="tc-05"></a>TC-05 | FE unit | [auth-session.test.ts](../fe/tests/auth-session.test.ts) — 401 expires only the token actually sent; DB 5xx keeps session |
| <a id="tc-06"></a>TC-06 | Backend/API fixture | [auth.test.ts](../be/tests/integration/auth.test.ts) — flow TTL and atomic claim; partial Google config rejected; production dev login forced off |
| <a id="tc-07"></a>TC-07 | Browser/E2E fixture | [auth-flow.spec.ts](../fe/e2e/auth-flow.spec.ts) — admin creates verifier; reviewer can work immediately and optionally change password |
| <a id="tc-08"></a>TC-08 | Backend/API fixture | [api.test.ts](../be/tests/integration/api.test.ts) — HỢP LỆ: tạo dự án → 201, là bản nháp, có một dòng sổ ghi vết |
| <a id="tc-09"></a>TC-09 | Backend/API fixture | [api.test.ts](../be/tests/integration/api.test.ts) — KHÔNG HỢP LỆ: BR-003 người phụ trách tài chính trùng người điều phối → 422 |
| <a id="tc-10"></a>TC-10 | Domain unit | [rules.test.ts](../packages/domain/src/rules.test.ts) — chỉ người điều phối sửa được, và chỉ khi còn là bản nháp |
| <a id="tc-11"></a>TC-11 | Backend/API fixture | [api.test.ts](../be/tests/integration/api.test.ts) — Q-03 xoá bản nháp: chỉ người điều phối; xoá mềm, sổ ghi vết giữ một dòng, mọi đường đọc/sửa sau đó 404 |
| <a id="tc-12"></a>TC-12 | Backend/API fixture | [api.test.ts](../be/tests/integration/api.test.ts) — US-3 danh sách công khai: tìm không dấu, lọc, sắp xếp, phân trang ổn định; query sai → 400 |
| <a id="tc-13"></a>TC-13 | Domain unit | [catalog.test.ts](../packages/domain/src/catalog.test.ts) — phân trang: tổng số đúng, các trang ghép lại đủ và không trùng, trang vượt quá trả trang cuối |
| <a id="tc-14"></a>TC-14 | Browser/E2E fixture | [project-flow.spec.ts](../fe/e2e/project-flow.spec.ts) — US-3 danh sách: tìm không dấu, bộ lọc nằm trên URL, tải lại vẫn giữ, không khớp thì có nút xoá bộ lọc |
| <a id="tc-15"></a>TC-15 | Backend/API fixture | [api.test.ts](../be/tests/integration/api.test.ts) — luồng đầy đủ: tạo → gửi xác minh → duyệt → cam kết → bàn giao → xác nhận |
| <a id="tc-16"></a>TC-16 | Backend/API fixture | [api.test.ts](../be/tests/integration/api.test.ts) — US-4 trả lại có lý do: về bản nháp, rời hàng chờ, sửa rồi gửi lại |
| <a id="tc-17"></a>TC-17 | Domain unit | [rules.test.ts](../packages/domain/src/rules.test.ts) — duyệt dự án: phải là người xác minh, không xung đột lợi ích, dự án đang chờ, trả lại phải có lý do |
| <a id="tc-18"></a>TC-18 | Browser/E2E fixture | [project-flow.spec.ts](../fe/e2e/project-flow.spec.ts) — verification navigation and direct access follow the session role |
| <a id="tc-19"></a>TC-19 | Backend/API fixture | [api.test.ts](../be/tests/integration/api.test.ts) — US-5 chứng từ: thủ quỹ tải ảnh/PDF thật rồi gắn vào khoản chi; ai xem được tuỳ trạng thái khoản chi |
| <a id="tc-20"></a>TC-20 | Domain unit | [files.test.ts](../packages/domain/src/files.test.ts) — nhận loại chứng từ theo byte đầu file, không theo tên hay Content-Type |
| <a id="tc-21"></a>TC-21 | Browser/E2E fixture | [project-flow.spec.ts](../fe/e2e/project-flow.spec.ts) — US-5 chứng từ: thủ quỹ tải ảnh rồi ghi chi; chờ duyệt thì khách không xem được, duyệt xong thì công khai |
| <a id="tc-22"></a>TC-22 | Backend/API fixture | [api.test.ts](../be/tests/integration/api.test.ts) — US-6 đổi tài khoản thì dự án và đóng góp đổi theo người; hồ sơ công khai không lộ email, số điện thoại |
| <a id="tc-23"></a>TC-23 | Browser/E2E fixture | [project-flow.spec.ts](../fe/e2e/project-flow.spec.ts) — US-6 việc của tôi đổi theo tài khoản; hồ sơ công khai không có email |
| <a id="tc-24"></a>TC-24 | Browser/E2E fixture | [chat-flow.spec.ts](../fe/e2e/chat-flow.spec.ts) — chat passes through Next proxy, supports follow-up history and opens cited source |
| <a id="tc-25"></a>TC-25 | Backend/API fixture | [chat-manual-index.test.ts](../be/tests/integration/chat-manual-index.test.ts) — chat reads old indexed public content without rebuilding it, and excludes a project made private |
| <a id="tc-26"></a>TC-26 | Backend/API fixture | [chat-telemetry.test.ts](../be/tests/integration/chat-telemetry.test.ts) — chat writes no pending row and saves one metadata summary after response close |
| <a id="tc-27"></a>TC-27 | Backend/API fixture | [chat-security.test.ts](../be/tests/integration/chat-security.test.ts) — input security refusals precede index/provider access and never echo credentials |
| <a id="tc-28"></a>TC-28 | Backend/API fixture | [chat-security.test.ts](../be/tests/integration/chat-security.test.ts) — old poisoned vectors are refused or excluded from model context without automatic reindexing |
| <a id="tc-29"></a>TC-29 | Browser/E2E fixture | [chat-flow.spec.ts](../fe/e2e/chat-flow.spec.ts) — switching from project guidance to React code remains a no-evidence refusal |
| <a id="tc-30"></a>TC-30 | Backend/API fixture | [chat-output.test.ts](../be/tests/integration/chat-output.test.ts) — model output accepts the strict envelope and rejects untrusted extra fields or broken JSON |
| <a id="tc-31"></a>TC-31 | Browser/E2E fixture | [chat-flow.spec.ts](../fe/e2e/chat-flow.spec.ts) — chat provider error restores the question and allows editing and resubmission |
| <a id="tc-32"></a>TC-32 | Backend/API fixture | [api.test.ts](../be/tests/integration/api.test.ts) — đánh giá AI: chỉ người xác minh, chỉ khi chờ xác minh; kết quả JSON đúng schema được gộp và lưu |
| <a id="tc-33"></a>TC-33 | Backend/API fixture | [api.test.ts](../be/tests/integration/api.test.ts) — đánh giá AI: sai schema thì hỏi lại một lần; sai hai lần → 502 và giữ nguyên đánh giá cũ |
| <a id="tc-34"></a>TC-34 | Domain unit | [assess.test.ts](../packages/domain/src/assess.test.ts) — đánh giá AI: chỉ nâng mức cảnh báo, không hạ được cờ do quy tắc tìm ra |
| <a id="tc-35"></a>TC-35 | Backend/API fixture | [admin-ai-usage.test.ts](../be/tests/integration/admin-ai-usage.test.ts) — known totals, null/zero tokens, status/origin counts and call counts use their own denominators |
| <a id="tc-36"></a>TC-36 | Backend/API fixture | [admin-ai-usage.test.ts](../be/tests/integration/admin-ai-usage.test.ts) — gatekeeper usage counts only real assessments in range, splits outcomes, versions and eval runs |
| <a id="tc-37"></a>TC-37 | Browser/E2E fixture | [ai-usage.spec.ts](../fe/e2e/ai-usage.spec.ts) — ordinary user and verifier cannot see dashboard or call admin API |
| <a id="tc-38"></a>TC-38 | Browser/E2E fixture | [ai-usage.spec.ts](../fe/e2e/ai-usage.spec.ts) — an old filter response cannot overwrite a newer filter and loading is announced |
| <a id="tc-39"></a>TC-39 | Backend/API fixture | [contributions-events.test.ts](../be/tests/integration/contributions-events.test.ts) — SSE HTTP: rights, post-commit transitions, rollback, project isolation, revocation and cancellation cascade |
| <a id="tc-40"></a>TC-40 | Browser/E2E fixture | [contributions-realtime.spec.ts](../fe/e2e/contributions-realtime.spec.ts) — two sessions: only table updates for creation/delivery/confirmation/cancel, notes and no navigation |
| <a id="tc-41"></a>TC-41 | Browser/E2E fixture | [contributions-realtime.spec.ts](../fe/e2e/contributions-realtime.spec.ts) — offline/remount resync and backend restart preserve latest table |
| <a id="tc-42"></a>TC-42 | Browser/E2E fixture | [contributions-realtime.spec.ts](../fe/e2e/contributions-realtime.spec.ts) — snapshot error retries and invalidation during an old snapshot triggers a fresh read |
| <a id="tc-43"></a>TC-43 | Browser/E2E fixture | [contributions-realtime.spec.ts](../fe/e2e/contributions-realtime.spec.ts) — Next proxy remains live after multiple rotations beyond 125 seconds |
| <a id="tc-44"></a>TC-44 | Backend/API fixture | [api.test.ts](../be/tests/integration/api.test.ts) — KHÔNG HỢP LỆ: BR-002 người phụ trách tài chính chưa xác minh → 422 |
| <a id="tc-45"></a>TC-45 | Backend/API fixture | [api.test.ts](../be/tests/integration/api.test.ts) — không mạo danh được người điều phối bằng cách tự gửi coordinatorId |
| <a id="tc-46"></a>TC-46 | Browser/E2E fixture | [project-flow.spec.ts](../fe/e2e/project-flow.spec.ts) — Q-03 xoá bản nháp: phải xác nhận, xoá xong về Việc của tôi và không mở lại được |
| <a id="tc-47"></a>TC-47 | Browser/E2E fixture | [ai-usage.spec.ts](../fe/e2e/ai-usage.spec.ts) — two AI roles: role cards and gatekeeper tab with outcomes and recent assessments |
| <a id="tc-48"></a>TC-48 | Backend/API fixture | [chat-output.test.ts](../be/tests/integration/chat-output.test.ts) — accepted model answers still cannot publish secrets, prompt instructions or bad citations |
| <a id="tc-49"></a>TC-49 | Backend/API fixture | [admin-ai-usage.test.ts](../be/tests/integration/admin-ai-usage.test.ts) — API requires admin, returns no-store and JSON numbers/null |

## 5. Bằng chứng thực thi và nghiệm thu theo story

Các trạng thái dưới đây tổng hợp **evidence đã có**, không ghi nhận lần thực thi mới. Mỗi phiếu có ngày/môi trường/kết quả và ca chưa kiểm. Không lấy tổng test của một lần chạy cũ để bảo đảm working tree hiện tại.

| Story | Evidence | Trạng thái và việc còn lại |
| :-- | :-- | :-- |
| US-1 | [US-1 verification](evidence/us1-verification.md) | Có code/checks và Google user thật đã được ghi nhận; human review một phần, chưa đủ ký xác nhận toàn story |
| US-2 | [US-2 verification](evidence/us2-verification.md) | Human review thao tác đã ghi ngày 26/10; còn đọc source/xác nhận chung |
| US-3 | [US-3 verification](evidence/us3-verification.md) | Human review thao tác đã ghi; còn đọc source/xác nhận chung; query hiện lọc trong bộ nhớ, không tuyên bố tối ưu quy mô lớn |
| US-4 | [US-4 verification](evidence/us4-verification.md) | Có review thao tác; còn đọc source/xác nhận chung; người xác minh là người ra quyết định |
| US-5 | [US-5 verification](evidence/us5-verification.md) | Phần lớn thao tác đã kiểm; H2 ảnh lớn/PDF, phần H3 và H7 còn chờ; không đánh dấu toàn story đạt |
| US-6 | [US-6 verification](evidence/us6-verification.md) | Có review thao tác; còn đọc source/xác nhận chung |
| US-7 | [US-7 verification](evidence/us7-verification.md), [manual M01–M20 và §9](evidence/us7-manual-evaluation.md), [snapshot E01–E20](evaluation/us7-v1.md) | Đã đóng theo nghiệm thu người dùng: 20/20 sau cải tiến, fallback/phục hồi đạt. Baseline riêng/output-log từng ca và mô tả kiểm injection gián tiếp chưa đủ; bộ snapshot vẫn NOT_RUN |
| US-8 | [US-8 verification](evidence/us8-verification.md), [cases](../be/evals/assessment/cases.json), [baseline v1 JSON Schema](../be/evals/assessment/results/assessment.v1-ollama-202610251359.json), [v2 cùng ngày](../be/evals/assessment/results/assessment.v2-ollama-202610251403.json), [v2 mới nhất](../be/evals/assessment/results/assessment.v2-ollama-202610261615.json) | Có 20 ca: 13/20 → 15/20 khi đổi prompt v1 → v2 cùng JSON Schema ngày 25/10. Lượt 26/10 đạt 17/20, nhóm gắn cờ 3/6; bỏ sót F03/F05/F06. H1–H9 có kết quả, gồm ca tự động và ca N/A; chưa đồng nghĩa mọi ca do con người tự thao tác hoặc model đạt hoàn hảo. Còn đọc source/xác nhận |
| US-9 | [US-9 verification](evidence/us9-verification.md), [AI_USAGE §19–20](../AI_USAGE.md) | Có code/tests, số liệu hai vai AI và ảnh responsive; bảng human review H1–H5 chưa hoàn tất |
| US-10 | [US-10 verification](evidence/us10-verification.md) | Có checks local/fixture qua Next proxy; human H1–H5 và bản container/deploy H6 chưa được điền |

Phiếu evidence cũ có thể còn ghi migration hoặc giới hạn từ giai đoạn trước; khi mâu thuẫn, cần đọc phần cập nhật mới và đối chiếu source/journal. Bảng truy vết không dùng số migration lịch sử làm đường dẫn hiện thực. Không sửa lại kết quả đo lịch sử để làm hồ sơ trông đã hoàn thành.

## 6. Đề cuối kỳ → yêu cầu và đầu ra

Các mã AI/NFR/DOC được định nghĩa trong requirements §4–6. Đây là yêu cầu dùng chung, không cộng vào số lượng user stories.

| Mục đề | Yêu cầu / story | Tài liệu hoặc evidence cần dùng |
| :-- | :-- | :-- |
| §1–2: bài toán, người dùng, AI có ích | US-2/4/7/8, requirements §1 | [Requirements](requirements.md), flow demo và dữ liệu ứng dụng |
| §3, §6: frontend/backend/CRUD/OAuth/JWT/RBAC | US-1/2 | Bảng source §2, ca test §4; Google thật và demo đúng môi trường |
| §6: search/filter/sort/pagination/upload/real-time | US-3/5/10 | AC §3 và evidence §5; SSE đáp ứng real-time, không đòi chat streaming |
| §4.1: ≥2 capability cho nhóm 2 người | US-7 = A, US-8 = C | RAG và JSON Schema/Zod được app dùng; không tính upload thành multimodal |
| §4.2: model/prompt/3 guardrails/eval/log/cost/fallback | AI-01…AI-06, US-7/8/9 | [ADR-002](adr/002-llm-selection.md), [ADR-003](adr/003-rag-pipeline.md), [AI design](ai-design.md), eval và bảng số liệu thực; còn thiếu RAG baseline/đối chứng nêu tại §5 |
| §5.1: 8–15 stories, AC, traceability | DOC-01 | 10 stories, 42 AC; bảng source, mapping AC→TC và test catalog trong tài liệu này |
| §5.2: architecture và ≥3 ADR | DOC-02 | [Architecture](architecture.md), [3 ADR](adr/README.md); người sở hữu cần giải thích được |
| §5.3–5.4: AI usage, ownership, commits | DOC-03/04 | [AI_USAGE](../AI_USAGE.md), phân công requirements §1 và Git history; hiểu biết cá nhân phải kiểm riêng |
| §7: responsive/persistence/security/privacy/tests | NFR-01…NFR-05, NFR-07 | Unit/API/E2E/eval, ảnh browser và audit secrets lịch sử riêng; test mock không thay toàn bộ bằng chứng |
| §3, §7, §9: container/deploy và modern frontend | NFR-06/08, DOC-05 | [README](../README.md), [deployment](deployment.md), kiểm Docker có model/embeddings, Google và SSE; output build SSR/SSG phải giải thích đúng nội dung render |
| §8–9: milestones và bản nộp | DOC-05…DOC-07 | README/tài khoản demo, PDF 10–20 trang, slide ≤15, video 3–5 phút; Markdown không thay PDF/slide/video, lịch sử milestone cần bằng chứng riêng |
| §10–11: demo/live change/Q&A | DOC-08 | Diễn tập 8/10/12 phút, mỗi thành viên trace một story, sửa module và giải thích chéo |

## 7. Cách cập nhật và dùng khi bảo vệ

1. Chọn story trong requirements và đọc tiêu chí `US-n.Am`.
2. Mở API/component và file nguồn ở §2, lần theo route → controller → service → repository/domain hoặc state/API client ở FE.
3. Tra §3 sang TC, mở đúng tên test ở §4; phân biệt phần test thực sự assert với phần còn cần đánh giá/human review.
4. Dẫn evidence §5 có ngày/môi trường/output; nếu chưa có thì ghi rõ chưa đủ bằng chứng, không tự gán Pass.
5. Khi đổi code/contract/AC, cập nhật cả requirements, đường truy vết, test liên quan và evidence; An/Khanh kiểm chéo trước khi đóng story.

Trước khi chạy E2E, đọc [config](../fe/playwright.config.ts), [local server helper](../fe/e2e/local-servers.ts) và [backend fixture](../fe/e2e/backend.ts). Dùng DB test cô lập; không reset/migrate/seed dữ liệu đang sử dụng để hoàn thiện bảng tài liệu.
