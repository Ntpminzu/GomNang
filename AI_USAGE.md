# AI Usage Log — GOM NẮNG

Nhật ký phục vụ yêu cầu cuối kỳ (DOC-03), ghi những phần AI hỗ trợ đáng kể trong lập trình, kiểm tra và tài liệu. Phần A tóm tắt theo module, phần B ghi từng đợt việc theo thời gian; không ghi mọi prompt hay toàn bộ hội thoại.

**Cách đọc:** mỗi mục có cùng 7 trường. `AI Tool` là công cụ đã dùng; `Prompt key` tóm lược yêu cầu quan trọng, không phải transcript nguyên văn; `AI Output` là phần AI sinh hoặc sửa; `Verification` là cách đã kiểm, phân biệt kiểm source, kiểm tự động và chạy thật; `Modifications` là chỗ người hoặc AI phải sửa lại, gồm các **trường hợp AI chưa đủ tốt**; `Human review` là xác nhận của thành viên. "Entry gốc không ghi" nghĩa là mục lúc viết không có trường đó, không tự điền thêm.

**Quy ước:** chỉ thêm mục mới, không sửa nội dung mục cũ. Ngày 27/10/2026 nhật ký được sắp lại theo thời gian và thống nhất tên trường (xem mục 42); liên kết tới tài liệu đã gỡ được trỏ sang tài liệu thay thế.

## Trường hợp AI chưa đủ tốt

| # | Mục | Tóm tắt |
| :-- | :-- | :-- |
| #1 | 3 | Luồng cho điều phối tự cam kết mà không có người độc lập xác nhận, dự án bị kẹt |
| #2 | 5 | Bộ lọc redirect còn nhận đường dẫn `/.//host` |
| #3 | 6 | Mở DB thiếu tạo thư mục cha; test lock dùng `spawnSync` chặn event loop |
| #4 | 12 | Chỉ bật JSON mode, `qwen3:4b` chép lại hồ sơ đầu vào, phải hỏi lại 1,42 lần mỗi ca |
| #5 | 12 | Proxy Next.js cắt request sau 30 giây |
| #6 | 12 | Prompt v3 do AI đề xuất làm eval giảm còn 13/20 |
| #7 | 13 | Gọi `DELETE` qua client HTTP mà kiểu phương thức không cho phép |
| #8 | 14 | Hai effect đọc/ghi URL xoá bộ lọc của link chia sẻ |
| #9 | 14 | Effect đồng bộ trang kéo người dùng về trang 1 |
| #10 | 15 | Hộp thoại ghi chi tràn ngang ở 375 px |
| #11 | 15 | Test API đọc `Response.json()` không khai kiểu, typecheck lỗi |
| #12 | 17 | Dò số điện thoại bằng mẫu `0` + 9 chữ số khớp nhầm id người dùng mẫu |
| #13 | 30 | Log US-8 bản đầu chỉ in console, thiếu token và chi phí |
| #14 | 30 | `NativeSelect` sinh từ shadcn thấp hơn ô nhập cạnh nó |
| #15 | 31 | Script human review dừng 4 lần do chọn sai phần tử, chụp ảnh lúc trang đang tải |
| #16 | 34 | Vercel build lỗi; AI đoán sai nguyên nhân cho tới khi có log Vercel |
| #17 | 41 | Đặt `signals` trước `verdict` trong schema làm eval tụt còn 12/20 |
| #18 | 42 | Mục 35–39 (Codex) trỏ tới 3 file chưa từng được tạo; sau khi xoá tài liệu còn 97 liên kết hỏng |

## Phần A — Tổng hợp theo module

Tóm tắt các module có AI hỗ trợ đáng kể từ đầu dự án tới 25/10/2026, không ghi ngày cụ thể.

### 1. Authentication Module

- **AI Tool:** Claude Code, Codex.
- **Task:** Xây dựng/rà soát password/JWT, triển khai US-1 theo quyết định nhóm: Google user, role user/admin/verifier, admin tạo verifier với mật khẩu dùng ngay, verifier tự đổi khi muốn.
- **Prompt key:** `Khảo sát US-1, chốt role và xác minh danh tính riêng, lập kế hoạch có phản biện rồi triển khai trên DB test local.`
- **AI Output:** Auth session/revocation/Google state-PKCE-nonce, admin provisioning, optional password change, migration bảo toàn dữ liệu, frontend và kiểm thử. Source: [auth](be/src/modules/auth), [admin](be/src/modules/admin), [schema](be/src/infrastructure/database/schema.ts), [US-1 guide](README.md).
- **Verification:** [US-1 local và Supabase evidence](docs/evidence/us1-verification.md) phân biệt HTTP/DB/JOSE, frontend session races, browser provider giả và giới hạn Google thật. Smoke cô lập cũ ở [verification](docs/evidence/verification.md) được giữ như bằng chứng nền.
- **Modifications:** Dùng role thay isVerifier; đổi verified thành identityVerified; chặn self-escalation, Google/dev-login đặc quyền. Giữ quyền theo dự án/BR-002, sửa 401/5xx boundary và che log nhạy cảm. Test fixtures RAG được cập nhật contract async, không đổi pipeline hoặc coi vector giả là đánh giá chất lượng AI.
- **Human review:** An/Khanh cần tự đọc, chạy Google thật và giải thích source; kiểm tự động không thay xác nhận con người.

### 2. Project and Shared Domain Module

- **AI Tool:** Claude Code, Codex.
- **Task:** Hỗ trợ form dự án, validation, tách quyền và checklist xác minh dùng chung FE/BE.
- **Prompt key:** `Tạo luồng dự án có nhu cầu định lượng; kiểm người phụ trách tài chính khác điều phối và tách các quy tắc dùng chung giữa frontend và backend.`
- **AI Output:** Form, service/repository, schema Zod và pure rules ở [validate-project.ts](packages/domain/src/validate-project.ts), [rules.ts](packages/domain/src/rules.ts), [projects.service.ts](be/src/modules/projects/projects.service.ts), [ProjectForm.tsx](fe/src/presentation/modules/projects/components/ProjectForm.tsx).
- **Verification:** Domain suite đạt 41/41, gồm dữ liệu sai, BR-002/BR-003, quyền sửa/duyệt và trạng thái. Đối chiếu backend lấy actor từ JWT và ghi project/needs/audit trong transaction; kiểm source này không thay cho runtime DB.
- **Modifications:** Chuẩn hóa validation và quyền trong shared domain, backend vẫn kiểm lại; giữ lỗi schema 400 riêng lỗi nghiệp vụ 422. Checklist [assess.ts](packages/domain/src/assess.ts) là rules/Jaccard, chưa phải structured output từ LLM.
- **Human review:** Entry gốc không ghi.

### 3. Contribution and Project Lifecycle Module

- **AI Tool:** Claude Code.
- **Task:** Hỗ trợ cam kết, bàn giao/xác nhận và kết thúc/hủy dự án có tách quyền.
- **Prompt key:** `Hoàn thiện luồng đóng góp và vòng đời dự án; chặn vượt nhu cầu, tự xác nhận và các trường hợp làm dự án không thể chốt.`
- **AI Output:** Luồng contribution, lifecycle rules, khóa dữ liệu và audit tại [contributions.service.ts](be/src/modules/contributions/contributions.service.ts), [contributions.repository.ts](be/src/modules/contributions/contributions.repository.ts), [rules.ts](packages/domain/src/rules.ts).
- **Verification:** Domain tests kiểm vượt nhu cầu, tự xác nhận, hủy và chốt sổ; suite 41/41 đạt. Repository có khóa theo source, chưa có phép thử tải đồng thời trong lần kiểm này.
- **Modifications:** **Trường hợp AI chưa đủ tốt #1:** luồng cho điều phối tự cam kết khoản mà không có người độc lập xác nhận khiến dự án kẹt. Sau review bổ sung `SELF_PLEDGE`; test `người điều phối chỉ tự cam kết khi có người thứ hai xác nhận được` kiểm trực tiếp lỗi này. Bổ sung khóa dự án khi thay đổi trạng thái và giữ audit từng thay đổi.
- **Human review:** Entry gốc không ghi.

### 4. Transparency and Dashboard Module

- **AI Tool:** Claude Code.
- **Task:** Hỗ trợ sổ thu chi có duyệt, bảng cập nhật và dashboard công việc theo vai.
- **Prompt key:** `Xây dựng sổ thu chi minh bạch: người giữ quỹ ghi chi, người khác duyệt, không chi vượt số dư; hiện việc cần làm theo từng vai.`
- **AI Output:** [transparency.service.ts](be/src/modules/transparency/transparency.service.ts), [dashboard.service.ts](be/src/modules/dashboard/dashboard.service.ts), [dashboard.ts](packages/domain/src/dashboard.ts), UI ledger và dashboard cá nhân.
- **Verification:** Domain tests đạt cho số dư, khoản chờ duyệt, cấm tự duyệt và công việc theo vai. Có ca API cho thu chi/profile trong [api.test.ts](be/tests/integration/api.test.ts), nhưng chưa chạy lại toàn file trong lần kiểm này.
- **Modifications:** Số dư và công việc được suy ra từ dữ liệu/rules thay vì lưu bản sao; khoản chi chờ duyệt giữ chỗ. Dashboard cá nhân và link hóa đơn không được trình bày như admin AI analytics hoặc upload đã hoàn tất.
- **Human review:** Entry gốc không ghi.

### 5. Frontend and Session Integration Module

- **AI Tool:** Claude Code, Codex.
- **Task:** Hỗ trợ giao diện Next.js, form, UI states, HTTP adapter và session.
- **Prompt key:** `Nối frontend với backend thật, giữ form khi request lỗi, cập nhật session đúng khi đổi tài khoản và bảo đảm giao diện dùng được trên màn hình nhỏ.`
- **AI Output:** UI trong presentation, adapter tại [libs/api](fe/src/libs/api), [SessionProvider.tsx](fe/src/presentation/providers/SessionProvider.tsx) và [redirect.ts](fe/src/libs/utils/redirect.ts).
- **Verification:** Frontend suite đạt 15/15, gồm mock flow, lỗi validation/quyền và redirect. Đây là test logic/mock, chưa phải kiểm lại browser/mobile thật.
- **Modifications:** Sửa session sau hydration và giữ dữ liệu form khi lỗi. **Trường hợp AI chưa đủ tốt #2:** bộ lọc redirect còn nhận đường dẫn dạng `/.//host`; sửa `safeNext` và thêm ca trong [redirect.test.ts](fe/tests/redirect.test.ts). Test hiện kiểm cả URL ngoài, protocol-relative và đường dẫn có ký tự bất thường.
- **Human review:** Entry gốc không ghi.

### 6. Database and Persistence Module

- **AI Tool:** Claude Code, Codex.
- **Task:** Hỗ trợ driver PostgreSQL/PGlite, persistence, transaction và khóa tránh mở trùng DB.
- **Prompt key:** `Giữ dữ liệu bền vững, xử lý lỗi khởi động PGlite và ngăn backend/SQL CLI cùng mở một thư mục dữ liệu.`
- **AI Output:** [client.ts](be/src/infrastructure/database/client.ts), [pglite.ts](be/src/infrastructure/database/pglite.ts), schema/migrations và test lock.
- **Verification:** [database-lock.test.ts](be/tests/integration/database-lock.test.ts) đạt khi chạy cùng nhóm backend checks; test dùng thư mục tạm, kiểm tiến trình thứ hai bị chặn và mở lại sau đóng. Không chạm dữ liệu thật.
- **Modifications:** **Trường hợp AI chưa đủ tốt #3:** code mở DB thiếu tạo thư mục cha, test tạm bỏ sót nhưng chạy server mới lỗi; bổ sung tạo thư mục trong luồng mở DB. Test lock từng dùng `spawnSync` gây chặn event loop và khóa không được làm mới; đổi thành spawn bất đồng bộ. Giữ constraints/audit khi thao tác dữ liệu.
- **Human review:** Entry gốc không ghi.

### 7. RAG Chatbot Module

- **AI Tool:** Codex.
- **Task:** Hỗ trợ chatbot hỏi dữ liệu ứng dụng, semantic retrieval bằng Ollama/pgvector và trả nguồn.
- **Prompt key:** `Tạo chatbot trả lời từ dữ liệu dự án công khai bằng chunking, embeddings và vector search; có trích dẫn và nói chưa đủ thông tin khi thiếu nguồn.`
- **AI Output:** [chat.retrieval.ts](be/src/modules/chat/chat.retrieval.ts), [chat.embedding.ts](be/src/modules/chat/chat.embedding.ts), [chat.service.ts](be/src/modules/chat/chat.service.ts), adapter model và [ChatWidget.tsx](fe/src/presentation/modules/chat/ChatWidget.tsx).
- **Verification:** Adapter Ollama/Gemini dùng mock fetch, không chứng minh provider thật hoặc chất lượng câu trả lời. Retrieval tests đã cập nhật contract async và chạy với fixture vectors/PGlite; không đổi pipeline. Chưa có eval ≥20 ca trước/sau cải tiến; xem kết quả checks mới ở [US-1 local và Supabase evidence](docs/evidence/us1-verification.md).
- **Modifications:** Thay retrieval theo từ bằng semantic retrieval; đồng bộ chunk theo hash/model, loại nguồn không còn công khai và kiểm kích thước vector/citation. Rà soát để không coi citation đúng số là chứng minh câu trả lời đúng; giữ lịch sử chat tách khỏi nguồn chứng cứ. Lời chào/liệt kê theo quy tắc không tính là lần LLM trả lời.
- **Human review:** Entry gốc không ghi.

### 8. Deployment and Configuration Module

- **AI Tool:** Claude Code, Codex.
- **Task:** Hỗ trợ Docker, rewrite FE–BE, cấu hình môi trường và chẩn đoán DB/model khi demo.
- **Prompt key:** `Đóng gói frontend/backend/database, cấu hình biến môi trường đúng và kiểm tra luồng từ trình duyệt tới database và model.`
- **AI Output:** [Compose](docker-compose.yml), [BE Dockerfile](be/Dockerfile), [FE Dockerfile](fe/Dockerfile), [Next config](fe/next.config.mjs), [deployment guide](docs/deployment.md).
- **Verification:** Rà config xác định container cần pgvector và endpoint embeddings reachable; `/health` chỉ kiểm DB. Chưa chạy lại Docker, hosting hoặc model thật để xác nhận bản nộp.
- **Modifications:** Đồng bộ hướng dẫn với be/fe/workspaces, loại chỉ dẫn bật dev-login trên hosting công khai; ghi rõ thiếu DATABASE_URL có thể làm backend dùng PGlite, Gemini vẫn cần Ollama embeddings. Không tự ghi deploy đã đạt chỉ vì có Dockerfile.
- **Human review:** Entry gốc không ghi.

### 9. Final Project Documentation

- **AI Tool:** Codex.
- **Task:** Hỗ trợ đối chiếu đề, truy vết yêu cầu và tổ chức tài liệu cuối kỳ.
- **Prompt key:** `Đối chiếu yêu cầu cuối kỳ với code, đồng bộ tài liệu và chỉ ghi các lần AI hỗ trợ quan trọng cùng phần kiểm tra/chỉnh sửa.`
- **AI Output:** [requirements](docs/requirements.md), [traceability](docs/traceability.md), [architecture](docs/architecture.md), [AI design](docs/ai-design.md), [ADR](docs/adr/README.md), backlog và nhật ký này.
- **Verification:** Đối chiếu 10 stories có phân công BE/FE, 3 ADR và API contract với source routes; kiểm local links/anchors và Markdown. Những kết quả ứng dụng được phân biệt với kiểm tài liệu ở [verification](docs/evidence/verification.md).
- **Modifications:** Tổ chức theo sản phẩm/module, giữ 9 US nhóm chọn và tách Real-time thành US-10 bắt buộc, mỗi US có phần BE của An và FE của Khanh, chọn lọc prompt quan trọng; bỏ nhật ký hội thoại và thông tin không phục vụ bản nộp. Các module đóng góp/vòng đời/thu chi vẫn ghi nhận việc AI đã hỗ trợ, dù không còn là US riêng. Giữ riêng phần đã có/chưa có; năng lực AI thứ hai vẫn chưa chốt. OAuth2/admin có source và local checks theo US-1, chưa chứng minh Google thật; streaming, upload và analytics vẫn chưa hiện thực.
- **Human review:** Entry gốc không ghi.

## Phần B — Nhật ký theo thời gian

Mỗi mục ứng với một đợt việc có thay đổi đáng kể, xếp theo ngày.

### 10. US-1 đăng nhập Google, vai và human review — 25/10/2026

- **AI Tool:** Codex.
- **Task:** Hoàn thiện US-1 trên local/Supabase, gộp bằng chứng và rà soát kết quả human review do người dùng ghi.
- **Prompt key:** `Triển khai US-1, cập nhật Supabase trực tiếp, gộp hai file bằng chứng và kiểm tra các ca human review đã điền.`
- **AI Output:** Auth Google/session/role, admin cấp verifier, đổi mật khẩu tự nguyện, migrations 0010–0011 và [bằng chứng US-1](docs/evidence/us1-verification.md) có bảng H1–H8.
- **Verification:** 130 tests, typecheck/build và E2E 5/5 đạt trên môi trường test; Supabase đã áp migration và đối chiếu dữ liệu. Người dùng ghi nhận Google thật đăng nhập với role user, admin tạo verifier, verifier đăng nhập, thông báo lỗi đổi mật khẩu và từ chối quyền ở một số ca. H2 chưa ghi kết quả liên kết tài khoản user cũ, H3 còn trống; H1/H5–H8 còn thiếu kết quả của một số bước. E2E Google dùng provider giả.
- **Modifications:** Gộp bằng chứng local và Supabase vào một file, thêm mẫu human review và ghi rõ các kết quả còn thiếu. Không tự chuyển US-1 sang trạng thái đã nghiệm thu.
- **Human review:** Mới có ghi nhận thao tác một phần trong [bảng H1–H8](docs/evidence/us1-verification.md); chưa có tên/ngày, kết luận và xác nhận đọc/giải thích source của An/Khanh.

### 11. US-7 tái cấu trúc RAG — 25/10/2026

- **AI Tool:** Codex.
- **Task:** US-7 tái cấu trúc RAG
- **Prompt key:** `Đổi cấu trúc, hàm và luồng gọi RAG theo AI_assistant_chatbot_rag; giữ pgvector và tiếp tục tự đồng bộ trước khi hỏi.`
- **AI Output:** `answerQuestion` điều phối helper `selectHistory`, `buildRetrievalQuestion`, `buildMessages`, `citationWarnings`; tách config/prompt, controller và repository SQL. Giữ provider/API/DB schema, chunk IDs và thuật toán 800/120 ký tự; query pgvector kiểm public status trước LIMIT. Không copy Lumen Section 11, index JSON, debug payload hoặc cách chỉ cảnh báo citation sai.
- **Verification:** Unit/helper, PGlite index/retrieval, HTTP và browser/proxy fixture; kết quả cụ thể tại [RAG evidence](docs/evidence/rag-refactor-verification.md). Các kiểm tra tự động không chứng minh chất lượng model thật hoặc human acceptance.
- **Modifications:** History chỉ làm ngữ cảnh, không làm chứng cứ; ghép câu hỏi cũ có thể nhiễu khi đổi chủ đề/ngoài phạm vi. Chưa thực hiện bộ eval ≥20 ca trước/sau, guardrails đầy đủ, promptVersion, telemetry hay streaming. Đây là bước nền trước US-7.
- **Human review:** Entry gốc không ghi.

### 12. US-8 người gác cổng bằng Structured output — 25/10/2026

- **AI Tool:** Claude Code.
- **Task:** Chốt capability AI thứ hai là Structured output và làm US-8 cả BE lẫn FE (phân công Khanh): người xác minh nhờ AI soát hồ sơ chờ duyệt, có eval 20 ca trước/sau.
- **Prompt key:** `Làm năng lực AI thứ hai cho người xác minh: LLM trả JSON theo schema, app gộp với quy tắc; mỗi US xong thì kiểm tra, ghi evidence, lên kịch bản human review và bổ sung AI_USAGE, không sửa lịch sử.`
- **AI Output:** [verification.ai.ts](be/src/modules/verification/verification.ai.ts), endpoint `POST /api/projects/:id/ai-assessment`, [prompts v1–v3](be/src/modules/verification/prompts/), `mergeAiAssessment` trong [assess.ts](packages/domain/src/assess.ts), [AssessmentPanel](fe/src/presentation/modules/verification/components/AssessmentPanel.tsx), [eval runner](be/scripts/eval-assessment.ts) và [20 ca](be/evals/assessment/cases.json), [Thiết kế Structured assessment](docs/implementation-decisions.md#structured-assessment), [bằng chứng US-8](docs/evidence/us8-verification.md).
- **Verification:** 139 tests (45 domain, 70 backend, 24 frontend), typecheck, build và E2E 6/6 đạt; E2E dùng model giả. Tạm bỏ luật gắn cờ hoặc lần hỏi lại thì test đỏ. Eval `qwen3:4b` từ 13/20 lên 15/20, latency trung bình từ 29,1 xuống 11,4 giây. Chạy thật trên app một lần: 1 lần gọi, 16 giây. Gemini chưa kiểm được vì Google trả 503 lúc kiểm.
- **Modifications:** **Trường hợp AI chưa đủ tốt #4:** bản đầu chỉ bật JSON mode; eval thật cho thấy model chép lại hồ sơ đầu vào và phải hỏi lại trung bình 1,42 lần mỗi ca. Đã đổi sang gửi JSON Schema sinh từ Zod, không còn phải hỏi lại. **Trường hợp #5:** proxy Next.js cắt request sau 30 giây trong khi model chạy hơn một phút, gây lỗi kết nối; đã nâng `proxyTimeout` lên 150 giây. **Trường hợp #6:** prompt v3 do AI đề xuất làm điểm giảm còn 13/20, nên không dùng và giữ v2. Model nhỏ vẫn chỉ bắt 1/6 ca nguy hiểm; giới hạn này ghi rõ trong bằng chứng.
- **Human review:** Chờ người kiểm điền bảng H1–H10 trong [bằng chứng US-8](docs/evidence/us8-verification.md#3-human-review); chưa có tên, ngày và xác nhận đọc source của An/Khanh.

### 13. US-2 xoá dự án (Q-03) — 25/10/2026

- **AI Tool:** Claude Code.
- **Task:** Hoàn thiện CRUD của US-2 bằng chức năng xoá dự án, chốt Q-03 và giữ hồi quy tạo/xem/sửa.
- **Prompt key:** `Làm tiếp US được phân công: bổ sung xoá dự án theo chính sách phù hợp, có xác nhận, bảo vệ dữ liệu liên quan và sổ ghi vết; kiểm tra, ghi evidence, kịch bản human review, bổ sung AI_USAGE.`
- **AI Output:** `canDeleteProject` trong [rules.ts](packages/domain/src/rules.ts), `DELETE /api/projects/:id` và `deleteProject` trong [projects.service.ts](be/src/modules/projects/projects.service.ts), migration [0012](be/drizzle/0015_khanh_us2_us5_us8.sql), lọc ở [projects.repository.ts](be/src/modules/projects/projects.repository.ts) và [dashboard.repository.ts](be/src/modules/dashboard/dashboard.repository.ts), hộp thoại xoá trong [DraftPanel](fe/src/presentation/modules/projects/components/DraftPanel.tsx), [Quyết định xóa mềm](docs/implementation-decisions.md#project-soft-delete), [bằng chứng US-2](docs/evidence/us2-verification.md).
- **Verification:** 142 tests (46 domain, 71 backend, 25 frontend), typecheck, build và E2E 7/7 đạt. Tạm bỏ từng điều kiện lọc dự án đã xoá thì test API đỏ. Chạy thật trên app: xoá bản nháp thử, về Việc của tôi, link cũ trả 404.
- **Modifications:** AI đề xuất xoá mềm sau khi đọc schema: sổ ghi vết có trigger chỉ ghi thêm và khoá ngoại tới dự án, nên xoá cứng không làm được. Giới hạn chỉ bản nháp để dự án đã công khai vẫn dùng Huỷ và giữ lịch sử cho người góp. **Trường hợp AI chưa đủ tốt #7:** bản đầu gọi `DELETE` qua client HTTP mà kiểu phương thức chỉ cho GET/POST/PUT; E2E vẫn qua nhưng typecheck báo lỗi, đã bổ sung `DELETE` vào kiểu. Câu chữ kịch bản human review được đối chiếu lại với form thật: danh sách người giữ tiền chỉ có thành viên đã xác minh.
- **Human review:** Chờ người kiểm điền bảng H1–H8 trong [bằng chứng US-2](docs/evidence/us2-verification.md#3-human-review).

### 14. US-3 tìm, lọc, sắp xếp, phân trang — 25/10/2026

- **AI Tool:** Claude Code.
- **Task:** Chuyển tìm, lọc, sắp xếp của danh sách công khai lên máy chủ, thêm phân trang có tổng số và giữ điều kiện trên URL.
- **Prompt key:** `Làm US-3: contract query/page/total, validate query, lọc/sắp xếp/phân trang ở máy chủ, FE có nút trang và URL state; kiểm tra, ghi evidence, kịch bản human review, bổ sung AI_USAGE.`
- **AI Output:** `queryProjects`, `catalogStats`, `fold` trong [catalog.ts](packages/domain/src/catalog.ts); `listQuery` trong [projects.schema.ts](be/src/modules/projects/projects.schema.ts) và `validateQuery`; [ProjectListPage](fe/src/presentation/modules/projects/pages/ProjectListPage.tsx) có tìm trễ 300 ms, nút trang, giữ kết quả cũ khi đang tải; [bằng chứng US-3](docs/evidence/us3-verification.md).
- **Verification:** 149 tests (51 domain, 72 backend, 26 frontend), typecheck, build và E2E 8/8 đạt. Chạy thật với 19 dự án công khai: 3 trang 9 + 9 + 1 không trùng, link `?page=99` về trang cuối, quay lại từ trang dự án giữ trang và bộ lọc.
- **Modifications:** **Trường hợp AI chưa đủ tốt #8:** bản đầu của trang danh sách đọc URL và ghi URL trong hai effect; khi React dev chạy effect hai lần, link chia sẻ bị xoá bộ lọc. Lỗi này có từ trang cũ và chỉ lộ ra khi kiểm trên trình duyệt; đã thêm điều kiện "đã đọc URL" và một E2E giữ lỗi không quay lại. **Trường hợp #9:** effect đồng bộ số trang kéo người dùng về trang 1 mỗi lần bấm "Trang sau"; đã sửa để chỉ chạy khi có dữ liệu mới. "Mới đăng" trước đây so ngày bắt đầu, nay so ngày tạo. Logic lọc dùng chung trong `packages/domain` để backend và bản chạy thử trả cùng kết quả.
- **Human review:** Chờ người kiểm điền bảng H1–H8 trong [bằng chứng US-3](docs/evidence/us3-verification.md#3-human-review).

### 15. US-5 tải chứng từ (Q-04) — 25/10/2026

- **AI Tool:** Claude Code.
- **Task:** Thay ô dán link hoá đơn bằng upload chứng từ thật, chốt Q-04 (lưu ở đâu, loại/kích thước, ai tải, ai xem).
- **Prompt key:** `Làm US-5: upload file thật, lưu metadata, gắn vào nghiệp vụ, kiểm quyền/loại/kích thước, người ngoài không mở được file riêng; kiểm tra, ghi evidence, kịch bản human review, bổ sung AI_USAGE.`
- **AI Output:** [files.ts](packages/domain/src/files.ts) (nhận loại theo byte đầu, làm sạch tên), `canUploadReceipt`/`canViewReceipt` trong [rules.ts](packages/domain/src/rules.ts), bảng `files` và migration [0013](be/drizzle/0015_khanh_us2_us5_us8.sql), upload/đọc file trong [transparency.service.ts](be/src/modules/transparency/transparency.service.ts), [ExpenseDialog](fe/src/presentation/modules/transparency/components/ExpenseDialog.tsx) có thu nhỏ ảnh, [ReceiptPreview](fe/src/presentation/modules/transparency/components/ReceiptPreview.tsx), [Quyết định lưu chứng từ](docs/implementation-decisions.md#receipt-storage), [bằng chứng US-5](docs/evidence/us5-verification.md).
- **Verification:** 154 tests (54 domain, 73 backend, 27 frontend), typecheck, build và E2E 9/9 đạt. Chạy thật: ảnh 16,5 MB thu về JPEG 1005 KB, tải trong khoảng 2 giây, xem trước đúng ảnh; file HTML khai là PNG bị từ chối 415.
- **Modifications:** AI chọn lưu file trong PostgreSQL vì Render xoá ổ đĩa khi deploy lại và nhóm chưa có khoá dịch vụ lưu file; giữ `receipt_url` cho khoản chi cũ. **Trường hợp AI chưa đủ tốt #10:** hộp thoại ghi chi bị tràn ngang ở màn 375 px khi tên file dài; test tự động không bắt được, chỉ lộ ra khi đo trên trình duyệt; đã sửa bằng `min-w-0` cho form và tên file. **Trường hợp #11:** test API mới đọc `Response.json()` không khai kiểu nên typecheck backend báo lỗi dù test chạy qua; đã khai kiểu. Bổ sung lời nhắc che số tài khoản, số điện thoại vì chứng từ đã duyệt sẽ công khai.
- **Human review:** Chờ người kiểm điền bảng H1–H7 trong [bằng chứng US-5](docs/evidence/us5-verification.md#3-human-review).

### 16. US-4 kiểm hồi quy xác minh — 25/10/2026

- **AI Tool:** Claude Code.
- **Task:** Kiểm hồi quy luồng gửi xác minh, duyệt, trả lại sau các thay đổi US-8, US-2, US-3; bù test còn thiếu.
- **Prompt key:** `Kiểm tra US-4 và US-6 được phân công: chạy lại, bổ sung test cho tiêu chí chưa có bằng chứng, ghi evidence và kịch bản human review, bổ sung AI_USAGE.`
- **AI Output:** API test và E2E "trả lại có lý do → người điều phối thấy lý do → gửi lại"; hàm `createDraft` dùng chung trong [project-flow.spec.ts](fe/e2e/project-flow.spec.ts) thay 3 đoạn tạo bản nháp lặp lại; [bằng chứng US-4](docs/evidence/us4-verification.md).
- **Verification:** 156 tests, typecheck, build; E2E 11/11 ở hai lần chạy liền, lần đầu 10/11 do một ca hết thời gian chờ khi máy tải nặng. Tạm bỏ kiểm xung đột lợi ích thì test API đỏ.
- **Modifications:** AI viết thêm một đoạn kiểm xung đột lợi ích trong test mới; khi kiểm "test đỏ" thì thấy đã có test cũ cho đúng việc đó, nên bỏ đoạn trùng.
- **Human review:** Chờ người kiểm điền bảng H1–H6 trong [bằng chứng US-4](docs/evidence/us4-verification.md#2-human-review).

### 17. US-6 kiểm hồi quy Việc của tôi và hồ sơ — 25/10/2026

- **AI Tool:** Claude Code.
- **Task:** Kiểm hồi quy "Việc của tôi" và hồ sơ công khai, thêm bằng chứng đổi tài khoản và không lộ dữ liệu riêng.
- **Prompt key:** `Kiểm tra US-4 và US-6 được phân công: chạy lại, bổ sung test cho tiêu chí chưa có bằng chứng, ghi evidence và kịch bản human review, bổ sung AI_USAGE.`
- **AI Output:** API test "US-6 đổi tài khoản" và E2E ba tài khoản với cùng dự án; [bằng chứng US-6](docs/evidence/us6-verification.md).
- **Verification:** Test API so vai Khanh/Mai/An với dự án Hoa Mai, đếm đóng góp của An khớp DB, hồ sơ Mai không chứa email và số điện thoại thật. Chạy thật trên app với tài khoản mẫu Mai.
- **Modifications:** **Trường hợp AI chưa đủ tốt #12:** bản đầu dò số điện thoại trong hồ sơ bằng mẫu `0` + 9 chữ số và test đỏ nhầm, vì id người dùng mẫu dạng `00000000-…` cũng khớp. Đã đổi sang so đúng email và số điện thoại của Mai lấy từ DB test, và đặt số điện thoại thử cho Mai để phép kiểm có ý nghĩa.
- **Human review:** Chờ người kiểm điền bảng H1–H5 trong [bằng chứng US-6](docs/evidence/us6-verification.md#2-human-review).

### 18. US-7 giai đoạn 1: một pipeline RAG, version prompt, metadata — 26/10/2026

- **AI Tool:** Codex.
- **Task:** US-7 giai đoạn 1: một pipeline RAG, version prompt, metadata
- **Prompt key:** triển khai giai đoạn 1 theo kế hoạch đã chốt, chỉ chạy kiểm tra tự động ở giai đoạn cuối, người dùng tự thử các giai đoạn nhỏ trên DB thật.
- **AI Output:** bỏ nhánh lời chào/danh mục cứng; một pipeline RAG; version chat/query; JSON nội bộ và Zod/citation validation; trạng thái answered/refused/failed; metadata DB không lưu câu hỏi/history/output/nguồn; UI trạng thái/mã tra cứu/thông báo provider. Fixtures theo interface mới đã cập nhật nhưng chưa chạy. DB: runner riêng áp dụng 0012 trên Supabase sau preflight và backup public+drizzle; RLS/quyền/cột/index đã kiểm, checksum 11 bảng cũ không đổi. PostgreSQL startup chuyển sang kiểm journal/hash, không tự apply; PGlite vẫn tự migrate. Chưa diễn tập restore archive.
- **Verification:** chỉ đọc đối chiếu source/callers, sinh migration, kiểm an toàn deploy và cập nhật Graphify; không test/typecheck/build/E2E/eval hoặc gọi model nghiệm thu. Checklist và giới hạn ở [US7 giai đoạn 1](docs/evidence/us7-verification.md). Human review và model thật chờ người dùng; không ghi toàn US7 hoàn thành.
- **Modifications:** Entry gốc không ghi.
- **Human review:** Entry gốc không ghi.

### 19. US-7 lập chỉ mục RAG thủ công — 26/10/2026

- **AI Tool:** Codex.
- **Task:** US-7 lập chỉ mục RAG thủ công
- **Prompt key:** người dùng yêu cầu thực hiện ngay, bỏ tranh luận bổ sung, chạy lệnh incremental để index và chấp nhận nguồn cũ nhằm giữ luồng đơn giản.
- **AI Output:** thêm `npm.cmd run rag:index`; bỏ đọc toàn nguồn/build/index khỏi request; chỉ query embedding + pgvector + kiểm output/log. SQL vẫn lọc public status. CLI PostgreSQL có session lock, snapshot nhất quán, embedding phần đổi trước atomic save/prune, không seed/reset/DDL. Bỏ phương án kiểm freshness từng nhóm nguồn theo quyết định mới. Prompt/UI: chat version tăng lên `gomnang-rag-v2` để nhắc nguồn có thể cũ; query version giữ nguyên. Widget nhắc kiểm tra trang dự án. Cập nhật fixtures/tests chuẩn bị index tường minh, thêm ca nguồn cũ nhưng còn công khai và index chưa sẵn sàng.
- **Verification:** chỉ đối chiếu source/callers, kiểm diff và cập nhật Graphify. Không chạy tests/typecheck/build/E2E/eval, không chạy CLI/ghi DB thật hoặc gọi model trong lượt này. [Cách dùng](docs/adr/003-rag-pipeline.md); runtime và human acceptance chờ người dùng tự thử.
- **Modifications:** Entry gốc không ghi.
- **Human review:** Entry gốc không ghi.

### 20. US-7 giai đoạn 2: guard input, nguồn và chỉ mục — 26/10/2026

- **AI Tool:** Codex.
- **Task:** US-7 giai đoạn 2: guard input, nguồn và chỉ mục
- **Prompt key:** người dùng yêu cầu bắt đầu code giai đoạn 2 của kế hoạch đã chốt, giữ manual index/chấp nhận nguồn cũ và chỉ chạy automated checks ở giai đoạn cuối.
- **AI Output:** guard pattern chung cho current input/toàn history trước AI, full public document trước chunking, chunk/URL trước embedding và candidates từ index cũ trước prompt/publish. Từ chối toàn lượt trộn hợp lệ/injection; bảo toàn public contact, không thêm join tài khoản. Thêm reasonCode cho injection/private/secret/unsafe sources; metadata dùng bảng hiện có, không raw content/migration. Prompt/UI: version chat `gomnang-rag-v3`, query vẫn v1; dùng UI refused/history từ giai đoạn 1 để không gửi lại lượt từ chối. Không thêm provider/classifier hoặc streaming.
- **Verification:** Kiểm chứng/giới hạn: chỉ đối chiếu source/callers, kiểm diff và Graphify; không chạy tests/typecheck/build/E2E/eval, gọi model, index hoặc ghi DB thật. Chuẩn bị unit/isolated integration/HTTP/E2E cases để giai đoạn 6. Pattern có thể bỏ sót/chặn nhầm; chưa chứng minh an toàn hoặc semantic correctness với model thật. [Checklist tự thử](docs/evidence/us7-verification.md).
- **Modifications:** Entry gốc không ghi.
- **Human review:** Entry gốc không ghi.

### 21. US-7 giai đoạn 3: history, kiểm output, deadline — 26/10/2026

- **AI Tool:** Codex.
- **Task:** US-7 giai đoạn 3: history, kiểm output, deadline
- **Prompt key:** tiếp tục giai đoạn 3, sau đó người dùng chỉ ra câu React đã bị từ chối đúng. Giữ NO_EVIDENCE, không thêm classifier/từ khóa để chặn lại câu đó; chỉ sửa history làm nhiễu chủ đề mới.
- **AI Output:** history chỉ cho câu nối tiếp; validate output thêm secret/instruction/một số đoạn prompt theo mẫu; deadline 120 giây gồm 115 xử lý/5 finalize; truyền abort tới model/embedding/body read với byte cap. PostgreSQL chat pool riêng, session statement timeout và query/connect bounds, không giữ transaction/connection xuyên model, không đổi pool nghiệp vụ. UI có Thử lại thủ công và giữ draft. Prompt/config: chat `gomnang-rag-v4`, query vẫn v1. Giữ manual index/nguồn cũ, JWT Gemini và hai providers; không migration, auto retry/failover/classifier hoặc streaming. Không đổi `fe/next.config.mjs` do người dùng đã cấu hình.
- **Verification:** chỉ đọc source/callers, kiểm diff và Graphify; chuẩn bị ca deadline/body timeout/output/topic switch/HTTP/UI nhưng chưa chạy tests/typecheck/build/E2E/eval. Không tool gọi model/index hoặc ghi DB thật. Runtime/quality và human acceptance còn mở; [chi tiết](docs/evidence/us7-verification.md).
- **Modifications:** Entry gốc không ghi.
- **Human review:** Entry gốc không ghi.

### 22. Chỉ dùng Qwen qua Ollama, bỏ Gemini — 26/10/2026

- **AI Tool:** Codex.
- **Task:** Chỉ dùng Qwen qua Ollama, bỏ Gemini
- **Prompt key:** người dùng yêu cầu bỏ hoàn toàn Gemini để tinh gọn, chỉ dùng Qwen. Tiếp tục trực tiếp công việc tinh gọn chatbot, không chạy lại vòng tranh luận.
- **AI Output:** xóa adapter/test cloud, cấu hình/key env; API chỉ nhận ollama, bỏ nhánh auth chat cloud, widget bỏ selector và phụ thuộc phiên đăng nhập. Script smoke riêng cũng chỉ Qwen/Ollama; không sửa Google OAuth nghiệp vụ. Giữ guards/RAG/manual index/output/deadline/log; không migration/xóa dữ liệu log cũ.
- **Verification:** rà source/callers/env mà không in key, cập nhật fixtures/API và docs, kiểm diff/Graphify. Chưa tests/typecheck/build/E2E/eval, model/index hoặc DB thật. [Chi tiết](docs/adr/002-llm-selection.md).
- **Modifications:** Kế hoạch: bỏ milestone parity và điều kiện nghiệm thu cả hai provider; evaluation US7 chỉ Qwen nhưng vẫn cần bộ ca/pass rate/cải tiến trước-sau đã chốt. Evidence và mục AI_USAGE lịch sử giữ nguyên, không mô tả khả năng hiện tại.
- **Human review:** Entry gốc không ghi.

### 23. US-7 tinh gọn RAG — 26/10/2026

- **AI Tool:** Codex.
- **Task:** US-7 tinh gọn RAG
- **Prompt key:** người dùng yêu cầu triển khai các phần dọn đã review: kiểm tra lặp, cấu trúc nhiều provider, kiểm output chồng nhau và guardrail dễ chặn nhầm.
- **AI Output:** cấu hình/client đơn Qwen/Ollama; API thông tin model chuyển sang `/api/chat/model`, body chat bỏ `model`; cập nhật UI và fixtures. Bỏ lọc lại cùng candidates sau generation; output dùng một lượt kiểm nội dung chung; kiểm sao chép prompt không phụ thuộc tiền tố câu. Thu hẹp mẫu chỉ dẫn trong nguồn, không chặn đại từ “ai” hoặc “luôn trả lời” đơn lẻ. Không sửa timeout/log lifecycle/DB/index. Prompt: không đổi nội dung system/query prompt, giữ version v4/v1. Guard thay đổi được quản lý trong Git; không coi đó là một phiên bản system prompt mới.
- **Verification:** đọc source/callers và kiểm diff; chuẩn bị test nhưng chưa chạy tests/typecheck/build/E2E/eval/model/index/DB thật. Checklist và giới hạn: [RAG tinh gọn](docs/adr/003-rag-pipeline.md).
- **Modifications:** Entry gốc không ghi.
- **Human review:** Entry gốc không ghi.

### 24. US-7 tinh gọn logging và timeout — 26/10/2026

- **AI Tool:** Codex.
- **Task:** US-7 tinh gọn logging và timeout
- **Prompt key:** người dùng yêu cầu làm hai phần còn lại từ review: đơn giản hóa ghi log và quản lý timeout.
- **AI Output:** middleware chuẩn bị metadata trong RAM, callback response close insert một row completed; bỏ insert pending/update và cờ vòng đời. Ghi nền best effort, lỗi log chỉ console metadata, không đổi câu trả lời. Bỏ lớp ChatDeadline/115+5/two signals; một timer 120 giây và AbortSignal chung qua pipeline/embedding/model/body. Giữ DB timeout/body cap, schema và dữ liệu cũ; không đổi prompt/version/index.
- **Verification:** cập nhật nguồn test timeout/disconnect/one summary/log failure và API fixture chờ log nền, chưa chạy tests/typecheck/build/E2E/eval/model/DB/index theo thống nhất. Có thể thiếu log khi process hoặc DB lỗi; không coi source/test đã chuẩn bị là bằng chứng nghiệm thu. [Thiết kế và tự thử](docs/adr/003-rag-pipeline.md).
- **Modifications:** Entry gốc không ghi.
- **Human review:** Entry gốc không ghi.

### 25. US-7 kiểm tra tự động và chốt bộ evaluation — 26/10/2026

- **AI Tool:** Codex.
- **Task:** US-7 kiểm tra tự động và chốt bộ evaluation
- **Prompt key:** người dùng cho chạy tests và chốt bộ evaluation 20 câu sau các đợt tinh gọn.
- **AI Output:** tạo dataset `gomnang-us7-eval-v1` gồm 8 thường/4 biên/6 an toàn critical/2 ngoài phạm vi, snapshot giả, expected facts/sources/status, history, payload cache và quy tắc trước/sau. Không thêm eval runner hoặc gọi model thật; không thay nguồn DB thật.
- **Verification:** workspace 160/160 (domain 42, backend 95, frontend 23), typecheck và build exit 0. Dataset qua kiểm cấu trúc 20 ID riêng biệt/phân nhóm/6 critical. E2E và giới hạn được ghi tại [evidence US7](docs/evidence/us7-verification.md). Không lấy test fixture làm pass rate AI; 20 ca Qwen thật vẫn NOT_RUN.
- **Modifications:** Entry gốc không ghi.
- **Human review:** Entry gốc không ghi.

### 26. US-7 phiếu test thủ công trên DB thật — 26/10/2026

- **AI Tool:** Codex.
- **Task:** US-7 phiếu test thủ công trên DB thật
- **Prompt key:** người dùng muốn 20 câu dựa trên DB thật và bảng điền kết quả, tự thử thủ công.
- **AI Output:** đọc hai dự án công khai và các guide/chunk hiện có trong transaction PostgreSQL READ ONLY, không đọc tài khoản/không ghi DB hoặc index. Tạo bộ riêng `gomnang-us7-manual-live-v1`, ghi expected theo index và mốc dữ liệu, 20 câu, bảng trước/sau, tổng hợp, hướng dẫn tra metadata. Giữ bộ snapshot cũ; nêu rõ bộ UI chưa bao phủ injection gián tiếp trong nguồn.
- **Verification:** chỉ đối chiếu dữ kiện nguồn và cấu trúc/liên kết tài liệu; không chạy 20 câu, model, index hoặc sửa code ứng dụng. Các kết quả người dùng đều Chưa thử; không coi việc chuẩn bị phiếu là nghiệm thu. [Phiếu điền](docs/evidence/us7-manual-evaluation.md).
- **Modifications:** Entry gốc không ghi.
- **Human review:** Entry gốc không ghi.

### 27. Chat log dùng request_id tự tăng — 26/10/2026

- **AI Tool:** Codex.
- **Task:** Chat log dùng request_id tự tăng
- **Prompt key:** người dùng yêu cầu bỏ embedded_documents/lifecycle, chỉ giữ request_id tự tăng làm khóa chính, không hiện ID trên UI và vẫn ghi nền. Sau auto-review chặn thao tác DB thật, người dùng xác nhận cho apply sau backup.
- **AI Output:** migration 0013 bảo toàn metadata log cũ, DB cấp integer identity, bỏ UUID id/correlation UUID và các cột thừa; response/UI bỏ mã tra cứu. Không đổi HTTP request logger chung. Runner preview/apply có archive+mapping, kiểm metadata/11 bảng nghiệp vụ/journal/RLS; phiếu manual đổi sang tra ID số theo thời gian, giữ các bằng chứng đã điền.
- **Verification:** 162/162 workspace tests, typecheck/build exit 0, E2E chat 4/4. Supabase commit 0013, giữ 38/38 log, số 1..38, metadata còn lại và dữ liệu nghiệp vụ không đổi. Backup public+drizzle và mapping ở be/.data, mục lục archive đã kiểm, chưa diễn tập restore. Không chạy Qwen evaluation hoặc ghi log giả trên DB thật. [Evidence](docs/evidence/chat-log-sequence-verification.md).
- **Modifications:** Entry gốc không ghi.
- **Human review:** Entry gốc không ghi.

### 28. Chat prompt v5: từ chối khi thiếu dữ kiện (M12) — 26/10/2026

- **AI Tool:** Codex.
- **Task:** Chat prompt v5: từ chối khi thiếu dữ kiện (M12)
- **Prompt key:** người dùng báo M12 không có liên hệ nhưng đôi lúc status answered, đôi lúc refused, rồi yêu cầu cập nhật prompt theo hướng đã đề xuất.
- **AI Output:** system prompt v4 → v5: tìm đúng dự án không đủ để answered nếu thiếu thông tin được hỏi; thêm ví dụ JSON refused cho email/phone thiếu và giới hạn phát biểu trong nguồn tìm được. Vẫn cho trả liên hệ công khai thực sự có trong nguồn. Query prompt v1, retrieval/index/schema/output validator không đổi; không dùng regex nội dung để sửa status.
- **Verification:** 17/17 test hiện có liên quan RAG/output/retrieval/security đạt, exit 0; [raw log](docs/evidence/prompt-v5-tests.txt). Fixture tests không chứng minh Qwen sẽ luôn chọn đúng status. Không gọi model/index hoặc ghi DB thật; giữ expected và các kết quả manual đã điền, sau v5 chờ chạy lại bằng Qwen thật.
- **Modifications:** Entry gốc không ghi.
- **Human review:** Entry gốc không ghi.

### 29. Đóng US-7 theo nghiệm thu người dùng — 26/10/2026

- **AI Tool:** Codex.
- **Task:** Đóng US-7 theo nghiệm thu người dùng
- **Prompt key:** người dùng xác nhận 20 câu thủ công đều đạt, fallback/non-AI và mở lại Ollama đạt, yêu cầu cập nhật bảng và đóng US7.
- **AI Output:** ghi 20/20 (100%) và 6/6 critical theo tự nghiệm thu vào bảng sau cải tiến; cập nhật fallback/phục hồi và trạng thái công việc ở requirements/backlog/traceability/evidence. Không đổi expected, bảng baseline hoặc tự điền output, ID log, call counts.
- **Verification:** Ranh giới bằng chứng: người dùng nói đã kiểm đủ trước/sau và injection gián tiếp, nhưng khi hỏi chi tiết chỉ xác nhận hỏi bộ 20 câu. Không tự ghi số baseline, payload/cách cài nguồn hoặc kết quả gián tiếp đã được xác minh. Công việc đóng theo quyết định chủ dự án; các chi tiết hồ sơ A4/A8 vẫn chờ bổ sung, không miễn yêu cầu cuối kỳ. chỉ sửa/kiểm cấu trúc và liên kết tài liệu; không gọi model, chạy lại tests, index hoặc sửa DB. [Biên bản](docs/evidence/us7-manual-evaluation.md).
- **Modifications:** Entry gốc không ghi.
- **Human review:** Entry gốc không ghi.

### 30. US-8 telemetry AI, người xác minh quyết định, thống nhất giao diện — 26/10/2026

- **AI Tool:** Claude Code.
- **Task:** Bổ sung log token/latency/chi phí theo đề mục 4.2 cho US-8; đặt người xác minh làm người quyết định, người gác cổng chỉ là công cụ hỗ trợ; sửa các lỗi giao diện người dùng phát hiện khi review (dropdown thấp hơn ô nhập, lời cảnh báo làm lệch hàng, font thiếu độ đậm, thẻ dự án đơn điệu).
- **Prompt key:** `Kiểm tra dữ liệu tôi đã test; US-8 cần cho biết system prompt, latency, token, cost theo yêu cầu AI của thầy và lưu ở đâu; AI chỉ hỗ trợ người xác minh; tạo doc hướng dẫn đọc source; cải tiến giao diện thống nhất.`
- **AI Output:** bảng `ai_requests` (migration 0014), `onUsage` trong hai adapter, `chat.pricing.ts`, `runAiAssessment` ghi mọi kết cục, `npm run ai:usage`; [ReviewPanel](fe/src/presentation/modules/verification/components/ReviewPanel.tsx) có hồ sơ người điều phối và danh mục tự kiểm; [ProjectCover](fe/src/presentation/modules/projects/components/ProjectCover.tsx); sửa `Field`, `NativeSelect`, font Be Vietnam Pro đủ 4 độ đậm.
- **Verification:** 156 tests, typecheck và E2E 11/11 (chạy bằng Chrome). Chạy thật một lần đánh giá AI: 835/67 token, 63,7 giây, 0 USD, hiện đúng trên khung. Chụp màn hình form có lỗi: các ô cùng hàng thẳng nhau.
- **Modifications:** **Trường hợp AI chưa đủ tốt #13:** bản US-8 đầu chỉ in log ra console, thiếu token và chi phí, không lưu lại; đề yêu cầu log token và chi phí trung bình nên đã bổ sung bảng và lấy token từ chính provider. **Trường hợp #14:** `NativeSelect` sinh sẵn từ shadcn gắn chiều cao vào wrapper nhưng ô select bên trong cố định 32 px, nên mọi dropdown thấp hơn ô nhập cạnh nó; đã cho select lấp đầy wrapper. Gợi ý và lỗi chuyển xuống dưới ô nhập để không làm lệch hàng.
- **Human review:** Người dùng ghi đã kiểm US-2, US-3, US-4 và một phần US-8 ngày 26/10/2026; xem nhận xét về các ô còn trống trong file bằng chứng từng US.

### 31. Gộp An_Newtech, migration Supabase, human review có hướng dẫn — 26/10/2026

- **AI Tool:** Claude Code.
- **Task:** Gộp nhánh của An vào Khanh_Newtech, đưa thay đổi DB của Khanh lên Supabase của An, chạy human review có hướng dẫn cho US-2, 3, 4, 5, 6, 8 và ghi kết quả vào bằng chứng.
- **Prompt key:** `Lưu sang database của An; chạy lại human review bằng Playwright (hiện lên cho tôi xem), tôi sẽ valid từng bước; tiếp tục review và cập nhật file evidence.`
- **AI Output:** merge `86b214f` (US-8 dùng `ChatCompletion` của An, bỏ ô chọn model); migration `0015_khanh_us2_us5_us8` + `npm run db:deploy:khanh` (xem trước, `--apply` trong một transaction); [human-review.mjs](fe/scripts/human-review.mjs) có `--from` và cho người kiểm tự bấm; bảng human review trong [US-2](docs/evidence/us2-verification.md), [US-3](docs/evidence/us3-verification.md), [US-4](docs/evidence/us4-verification.md), [US-5](docs/evidence/us5-verification.md), [US-6](docs/evidence/us6-verification.md), [US-8](docs/evidence/us8-verification.md).
- **Verification:** 198 unit test và E2E 19/19 sau merge. Migration 0015 áp lên DB An: số dòng mọi bảng trước và sau bằng nhau, bản sao lưu JSON chụp trước. Review: 42 ảnh ở `docs/evidence/human-review/2026-10-26/`; `ai_requests` có 6 lần đánh giá, đều `ok`, trung bình 16,4 giây, 775/70 token, 0 USD; US8-H3, H4 ra FLAG đúng mã. US6-H2, US5-H6 kiểm thêm bằng API vì ảnh không đủ.
- **Modifications:** **Trường hợp AI chưa đủ tốt #15:** script review do AI viết dừng 4 lần: chọn loại nhu cầu bằng vai trò `button` thay vì `radio`; hàm bỏ qua nút dùng `isVisible()` không chờ nên bỏ qua bước gửi lại; ở "Việc của tôi" bấm vào chữ đầu tiên không phải link; ảnh US5-H6 chụp lúc trang đang tải. Lần dừng thứ tư do người kiểm sửa `status` bằng Supabase Table Editor (tìm ra qua `pg_stat_statements`), không phải lỗi app. AI cũng phát hiện migration mới làm checkout cũ của An dừng ở `DATABASE_MIGRATION_AHEAD` nên đã báo trước khi áp.
- **Human review:** Khanh xem trực tiếp từng ca ngày 26/10/2026, xác nhận US4-H4a/H4b; các ca đọc source, US5-H2, US8-H5/H6/H9 còn chưa kiểm, ghi trong từng file bằng chứng.

### 32. Trang admin mức dùng AI cho hai vai, kiểm tự động US-8 — 26/10/2026

- **AI Tool:** Claude Code.
- **Task:** Chạy tự động các ca US-8 còn thiếu (H5, H6, H9) và lưu thật trên DB; bổ sung trang admin "Mức sử dụng AI" để hiện hai vai AI (trợ lý hỏi đáp và người gác cổng), thiết kế lại trang.
- **Prompt key:** `Chạy tự động đi, nhớ lưu thật trên database và bổ sung luôn vào màn admin - mức sử dụng AI: cần hiện ra 2 vai trò AI (chat bot và người kiểm duyệt), có thể thiết kế lại màn này cho chuẩn.`
- **AI Output:** phần `assessment` trong `GET /api/admin/ai-usage` ([admin.repository.ts](be/src/modules/admin/admin.repository.ts), [ai-usage.ts](packages/domain/src/ai-usage.ts)); [AiUsagePage](fe/src/presentation/modules/admin/pages/AiUsagePage.tsx) với hai thẻ vai AI và hai tab, [AssessmentUsageView](fe/src/presentation/modules/admin/components/AssessmentUsageView.tsx); `eval:assessment -- --record` ghi `assessment_eval`; `human-review.mjs us8auto --auto`.
- **Verification:** 199 unit test (thêm test tổng hợp người gác cổng, đỏ khi bỏ lọc `feature`), E2E 20/20 (thêm ca hai vai AI, không cuộn ngang ở 375 px). Trên DB An: H5, H6 PASS do script tự kiểm qua API; eval 17/20 ghi 20 dòng `assessment_eval`.
- **Modifications:** AI giữ nguyên phần số liệu và chữ của An cho trợ lý hỏi đáp (E2E của An dựa vào), chỉ chuyển vào tab. Ảnh chụp đầu tiên cho thấy ô "Khoảng đo" chiếm cả hàng đẩy nút "Áp dụng" xuống và thời gian dưới 1 giây hiện "0 giây"; đã sửa. Chi phí ở khung người gác cổng đổi từ "0 USD" sang "Không áp dụng" cho khớp quy ước của An. Hai E2E hết thời gian chờ khi chạy song song với eval, chạy lại lúc máy rảnh thì đạt.
- **Human review:** Người kiểm đăng nhập người xác minh một lần cho lượt chạy tự động; chưa xem trang admin trên DB An (cần tài khoản admin).

### 33. Thống nhất bố cục hai tab mức dùng AI — 26/10/2026

- **AI Tool:** Claude Code.
- **Task:** Đổi tab "Trợ lý hỏi đáp" (phần US-9 của An) sang cùng bố cục với tab "Người gác cổng" mà không bỏ số đo nào.
- **Prompt key:** `Đổi thiết kế của An lại cho đồng bộ luôn nhưng vẫn đầy đủ các thông tin của anh ấy.`
- **AI Output:** [ChatUsageView](fe/src/presentation/modules/admin/components/ChatUsageView.tsx) và [UsageParts](fe/src/presentation/modules/admin/components/UsageParts.tsx) dùng chung cho hai tab: 4 ô số, hai khung danh sách, bảng request gần nhất, khung "Cách tính".
- **Verification:** Đối chiếu từng trường cũ: số request/trả lời/từ chối/lỗi, latency và mẫu số, token generation và embedding (tổng, số request có số đo, trung bình), nguồn model/quy tắc/chưa xác định, lần gọi model/embedding, lý do và HTTP, đủ 12 trường metadata của từng request, ghi chú chi phí và cách tính. E2E AI usage 5/5 (sửa bước mở "Metadata request" thành kiểm cột bảng), frontend 27/27, typecheck sạch; ảnh desktop và 375 px không cuộn ngang trang.
- **Modifications:** Metadata từng request chuyển từ khối mở rộng sang 12 cột bảng; bảng rộng nên thêm dòng nhắc kéo ngang. Latency hiển thị ms khi dưới 1 giây, giây khi lớn hơn, giống tab người gác cổng.
- **Human review:** Chưa có; cần An xem lại vì đổi giao diện phần của An.

### 34. Rà yêu cầu, gộp main, deploy và Docker Compose — 27/10/2026

- **AI Tool:** Claude Code.
- **Task:** Cập nhật evidence và tài liệu liên quan, gộp commit mới của An (US-10), rà lại yêu cầu của đề, gộp vào `main`, chạy lại Vercel/Render và Docker Compose.
- **Prompt key:** `Cập nhật lại các file evidence và các file liên quan; kiểm tra commit mới; check requirement của thầy và của app lần cuối; gộp vào main và chạy lại vercel và render, compose ra docker.`
- **AI Output:** merge `4d6fddf` (US-10 của An); [docker-compose.yml](docker-compose.yml) dùng `pgvector/pgvector:pg17` + service `init` ([compose-init.ts](be/scripts/compose-init.ts): migration, dữ liệu mẫu, admin/verifier thử từ `.env`), backend gọi Ollama của host; [requirements](docs/requirements.md) §4 và Q-06 cập nhật theo hiện trạng; [fe/tsconfig.build.json](fe/tsconfig.build.json) cho `next build`.
- **Verification:** 205 unit test, E2E 25/25, `next build` từ bản clone sạch. Docker: bốn service healthy, dự án/gửi xác minh/đánh giá AI (19,5 giây)/trang admin chạy qua web :3300. Production `762f57c`: Vercel 200 cho `/`, `/admin/ai-usage`, `/verify`; Render `/health` ok, API mới trả 400 cho `page=0`; chat trên production báo `EMBEDDING_UNAVAILABLE` vì không có Ollama (đúng fallback).
- **Modifications:** **Trường hợp AI chưa đủ tốt #16:** Vercel build thất bại từ `86b214f` (cả commit của An) mà build ở máy vẫn đạt; AI đoán sai hướng (file chưa commit) cho tới khi người dùng gửi log Vercel: `next build` kiểm kiểu cả `fe/e2e`, vốn import code backend mà Vercel không cài. Sửa bằng tsconfig riêng cho build. Volume Docker cũ (14/09) làm backend báo `DATABASE_MIGRATION_AHEAD`; AI đổi tên volume thay vì xoá dữ liệu cũ. Chat trong Docker chậm 88–113 giây/câu với Qwen 4B, câu dài chạm 504.
- **Human review:** Người dùng gửi log build Vercel; chưa xem bản production sau khi deploy.

### 35. Viết lại 3 ADR cho báo cáo — 27/10/2026

- **AI Tool:** Codex.
- **Task:** Viết lại 3 ADR cho báo cáo
- **Prompt key:** `Chỉ giữ 3 ADR: Transition from Layer-Based to Feature-Based Backend Architecture; Selection of Large Language Model for AI Chatbot; RAG Pipeline Design and Retrieval Strategy. Viết lại dựa trên dự án hiện tại.`
- **AI Output:** Ba ADR mới và [mục lục](docs/adr/README.md), cập nhật liên kết trong bộ tài liệu; chuyển quyết định nghiệp vụ trước đây sang [implementation notes](docs/implementation-decisions.md).
- **Verification:** Đối chiếu app/module/dependencies, model config/adapter, chunking/query/SQL/citation và evidence hiện có; kiểm 408 liên kết file nội bộ, không có lỗi liên kết mới (3 liên kết thiếu đã có từ trước); `git diff --check` đạt. `graphify update .` đạt, 2136 nodes/7399 edges; SQL không extract do thiếu `tree_sitter_sql`. Không chạy lại app/tests/model/Docker cho thay đổi tài liệu này.
- **Modifications:** Ghi rõ chunk size/overlap theo ký tự, index thủ công, lọc trạng thái trước top-K, history chỉ dùng cho câu nối tiếp; không gọi model/cấu hình là tối ưu khi thiếu benchmark. Sửa lỗi mất dấu tiếng Việt do script ghi qua PowerShell và kiểm lại nội dung UTF-8. Không khẳng định ngày/commit refactor kiến trúc khi chưa truy vết đầy đủ.
- **Human review:** An/Khanh cần đọc, xác nhận lý do và giải thích module khi bảo vệ.

### 36. Chuẩn hoá user story và traceability — 27/10/2026

- **AI Tool:** Codex.
- **Task:** Chuẩn hoá user story và traceability
- **Prompt key:** `Kiểm tra user stories và Traceability so với yêu cầu cuối kỳ; chuẩn hóa lại cho chỉnh chu.`
- **AI Output:** [requirements](docs/requirements.md) giữ 10 story, viết vai trò/nhu cầu/giá trị và 42 tiêu chí có mã `US-n.Am`; [traceability](docs/traceability.md) nối story → endpoint/component → source → AC → ca test/evidence, có 49 bí danh TC trỏ tên test thực tế.
- **Verification:** Đọc routes, service/schema, test selectors và evidence; kiểm 10 story/42 AC không trùng và được ánh xạ đủ, 49 tên test tồn tại trong file nguồn; kiểm 254 liên kết file/anchor trong hai tài liệu và cấu trúc bảng Markdown. Không chạy lại tests, browser, model hoặc Docker cho thay đổi tài liệu này.
- **Modifications:** Sửa endpoint Google thành `link-confirm`, bỏ model selector cũ, tránh dùng số migration lịch sử làm đường truy vết; phân biệt không ghi assessment với vẫn ghi log lỗi, ghi rõ chat logging best-effort và privacy phụ thuộc endpoint. Giữ ngoại lệ US-8 Khanh làm BE/FE. Sửa hàng US-10 bị tách bảng và ghi riêng trạng thái kiểm chứng. Không biến test tồn tại thành Pass, không xóa khoảng trống RAG baseline/injection gián tiếp hoặc nghiệm thu upload/SSE.
- **Human review:** Giữ nghiệm thu US-7 đã có; các story khác và phần hồ sơ còn thiếu theo phiếu evidence tương ứng, không tự đóng thêm story qua việc chuẩn hóa tài liệu.

### 37. Viết lại AI design cho báo cáo — 27/10/2026

- **AI Tool:** Codex.
- **Task:** Viết lại AI design cho báo cáo
- **Prompt key:** `Chỉnh sửa lại AI design (prompts, tools, RAG settings, ...) dựa trên dự án để đưa vào báo cáo.`
- **AI Output:** [AI design](docs/ai-design.md) gồm model, hai capability, RAG settings/luồng index và query, prompt/version/output examples, tools, structured schema/merge, guardrails/privacy/fallback, evaluation, telemetry và runtime/demo. Đồng bộ liên kết Structured output trong API contract và mô tả tương ứng ở architecture.
- **Verification:** Đối chiếu chat service/config/adapter/output/telemetry, assessment prompt/schema/service/domain, SQL retrieval và JSON kết quả eval đã lưu; kiểm liên kết/anchor, bảng Markdown và diff. Không chạy lại model, index, eval, DB, tests hoặc Docker trong lượt viết tài liệu.
- **Modifications:** Bỏ cloud/provider selector và streaming AI đã lỗi thời; ghi SSE thuộc US-10, LLM chưa gọi tools, assessment log gộp các attempt trong một row. Phân biệt history API với history đưa vào model, deadline chat với timeout từng attempt assessment, model refusal với chưa gọi model. Ghi rõ hồ sơ assessment chưa công khai và có thể chứa PII tự do; giữ thiếu baseline RAG/injection gián tiếp và kết quả assessment mới nhất 17/20.
- **Human review:** An/Khanh cần kiểm cách diễn giải module của mình; phần kết quả lịch sử và giới hạn không được coi là lần nghiệm thu mới.

### 38. Bảng evaluation cho báo cáo — 27/10/2026

- **AI Tool:** Codex.
- **Task:** Bảng evaluation cho báo cáo
- **Prompt key:** `Tạo bảng 20 test cho evaluation results, cost (token), latency; phần limitations tự ghi trong doc.`
- **AI Output:** [evaluation-results.md](docs/evaluation/evaluation-results.md): bảng 20 ca assessment có expected/verdict/kết quả/input-output-total tokens/latency, tổng và trung bình, kết quả từng nhóm, ca không đạt và bảng trước–sau; bảng RAG 20 ca giữ dấu — ở số đo chưa có.
- **Verification:** Ghép dataset với kết quả JSON theo ID; tính lại từ 20 row: 17 đạt, 15497 input + 1384 output = 16881 tokens, tổng latency 486,875 giây, trung bình 24,34375 giây/test. Không chạy model/eval/DB mới.
- **Modifications:** Không đổi token thành giá tiền cloud; tách không có hóa đơn API của local khỏi chi phí vận hành chưa đo. RAG 20/20 là người dùng xác nhận, không gán token/latency từ assessment. Bổ sung xử lý expected `anyCodes` để không bỏ mất quy tắc chấm khi tạo bảng.
- **Human review:** Nhóm kiểm bảng với JSON nguồn, tự viết limitations trong báo cáo; bảng không thay bằng chứng RAG còn thiếu.

### 39. Báo cáo cuối kỳ bằng Word — 27/10/2026

- **AI Tool:** Codex, documents skill.
- **Task:** Báo cáo cuối kỳ bằng Word
- **Prompt key:** `Viết báo cáo doc 10–20 trang gồm user stories và traceability, architecture diagram, ADRs, AI design, evaluation results, cost/latency summary và limitations.`
- **AI Output:** `GomNang_Project_Report.docx`, 20 trang A4: bìa/tổng quan, 10 stories/42 AC, bảng truy vết, sơ đồ hệ thống, 3 ADR, AI design, 20 ca assessment và 20 ca RAG, số liệu trước–sau/tokens/latency, limitations và tài liệu đối chiếu.
- **Verification:** Dùng python-docx trong Codex primary runtime. Renderer LibreOffice chuẩn không chạy do runtime Windows không có LibreOffice; xuất bản QA bằng Microsoft Word nền, raster PDF bằng Poppler của runtime. Kiểm trực quan cả 20 trang; sửa bảng truy vết để không vượt 20 trang, bỏ title border và nới cột mã RAG. Bản cuối 20 trang, 42 mã AC, đủ 20+20 ca; kiểm từng token/latency assessment với JSON nguồn và kiểm tổng 16881 tokens/486,875 giây. PDF/PNG trong .tmp chỉ phục vụ QA, không phải đầu ra bổ sung được yêu cầu.
- **Modifications:** Phân biệt verdict PASS với test đạt, 20/20 RAG tự xác nhận với thiếu phép đo, chi phí API 0 với chi phí vận hành chưa đo. Limitations là bản nháp từ evidence theo yêu cầu báo cáo đầy đủ, nhóm tự chỉnh/xác nhận. Không chạy lại model, eval, migration hoặc kiểm thử ứng dụng để viết báo cáo.
- **Human review:** An/Khanh đọc lại ownership, trạng thái nghiệm thu và số liệu trước khi nộp; tài liệu không tự chứng minh đã hoàn tất mọi yêu cầu vận hành/bảo vệ.

### 40. Tài liệu thuyết trình, clip demo và chat chậm trên máy CPU — 27/10/2026

- **AI Tool:** Claude Code.
- **Task:** Chuẩn bị bảo vệ: kịch bản thuyết trình, tài liệu hỏi đáp về người gác cổng theo tiêu chí AI-01…AI-06, lời nói cho từng slide Canva, clip demo tự động; sửa chat bị cắt khi model chạy CPU.
- **Prompt key:** `Viết kịch bản trình bày; thao tác demo bằng Playwright để quay màn hình, chậm và giải thích kỹ hơn, tự full màn hình; giải thích tất tần tật về AI 2 người gác cổng theo mẫu yêu cầu của thầy; đưa kịch bản vào ghi chú từng slide, chỉ trên Canva.`
- **AI Output:** [kịch bản thuyết trình](docs/slides/kich-ban-thuyet-trinh.md) (demo 8 phút, bảng live change, Q&A), [hỏi đáp người gác cổng](docs/slides/hoi-dap-ai2-nguoi-gac-cong.md) (đường đi request, I/O, eval, guardrail, câu hỏi khó); ghi chú cho 16 trang Canva; script Playwright quay demo (nằm ngoài repo); `CHAT_TIMEOUT_MS` 300 giây và cờ `OLLAMA_CHAT_THINK=false` ([chat.runtime.ts](be/src/modules/chat/chat.runtime.ts), [env.ts](be/src/config/env.ts)).
- **Verification:** Clip demo chạy hết trên Docker (web :3000) với dữ liệu thử, người dùng đã quay. Với `think=false`, một câu chat trên CPU mất khoảng 50–56 giây thay vì 88–113 giây. Mọi tham chiếu `file:dòng` trong tài liệu hỏi đáp được đối chiếu với source lúc viết.
- **Modifications:** Docker đang chạy image cũ (timeout 120 giây, chưa có cờ think) nên lần đầu chat vẫn 504; phải build lại `backend` và `frontend`. Ollama cổng 11434 không có model nên báo `EMBEDDING_ERROR`; chạy Ollama riêng ở cổng 11435 trỏ thư mục model có sẵn và đặt `DOCKER_OLLAMA_URL`. Người xác minh không có trong nút tài khoản mẫu, script đăng nhập bằng tài khoản thử trong `be/.data/` và không in mật khẩu. Người dùng chỉ cần ghi chú trên Canva nên bản pptx bị bỏ (mục 42).
- **Human review:** Người dùng xem clip và duyệt nội dung ghi chú Canva; An cần đọc phần kịch bản của mình.

### 41. US-8 prompt v4: 20/20 trên qwen3:4b — 27/10/2026

- **AI Tool:** Claude Code.
- **Task:** Cải tiến prompt người gác cổng từ v2 lên v4 để `qwen3:4b` đạt đủ 20/20 ca eval, kết quả lặp lại được giữa các lần chạy.
- **Prompt key:** `Cải tiến prompt assessment v2 thành bản v4, lần này hãy cố làm sao cho chuẩn để dù là model Qwen3-4b vẫn bao quát hết 20/20 ca; khi đã đủ 20/20 thì sửa những tài liệu liên quan.`
- **AI Output:** [assessment.v4.md](be/src/modules/verification/prompts/assessment.v4.md): 7 câu hỏi kiểm tra tuần tự, mỗi câu gắn đúng một mã, 7 ví dụ viết khác bộ eval; `temperature: 0` khi gọi có schema ([chat.model.ts](be/src/modules/chat/chat.model.ts)); `ACTIVE_ASSESSMENT_PROMPT = 'assessment.v4'`; test adapter kiểm `options.temperature`; [kết quả lần 1](be/evals/assessment/results/assessment.v4-ollama-202610271119.json), [lần 2](be/evals/assessment/results/assessment.v4-ollama-202610271123.json); cập nhật [bằng chứng US-8 §2c](docs/evidence/us8-verification.md), [evaluation](docs/evaluation/evaluation-results.md), [AI design](docs/ai-design.md), [quyết định](docs/implementation-decisions.md#structured-assessment), tài liệu thuyết trình.
- **Verification:** Eval thật trên Ollama, CPU: lần 1 bản nháp 17/20, lần 2 12/20, lần 3 19/20, lần 4 và 5 đều **20/20** (thường 8/8, biên 6/6, cờ 6/6), hai lần cuối ra cùng verdict và mã ở cả 20 ca, trung bình 11,8 và 11,3 giây, 1470/53 token. Thử 8 hồ sơ mới ngoài bộ eval: v4 bắt 3/3 ca nguy hiểm, không gắn cờ nhầm 5 ca; v2 bắt 1/3. Backend 122/122 test, typecheck sạch.
- **Modifications:** **Trường hợp AI chưa đủ tốt #17:** AI đề xuất đổi schema cho `signals` đứng trước `verdict` để model "liệt kê trước, kết luận sau"; eval tụt còn 12/20 vì mọi hồ sơ bình thường bị gắn `POSSIBLE_SCAM`. In câu trả lời thô cho thấy model chọn mã ngay ở token đầu, lấy mã đứng đầu prompt dù câu giải thích chỉ hỏi về ngày. Đã trả schema về thứ tự cũ, giữ temperature 0. Ví dụ trong prompt được viết khác các ca eval (ví dụ "ba người may 2000 bộ đồng phục" thay cho E02) để không chép đáp án; E03, E06 vẫn được gắn `UNCLEAR_BENEFICIARY` thay vì mã đúng loại, ghi là giới hạn.
- **Human review:** Chờ Khanh tự chạy lại eval và giải thích prompt v4; An review.

### 42. Gộp commit dọn tài liệu của An, bỏ file thừa, chuẩn hoá tài liệu — 27/10/2026

- **AI Tool:** Claude Code.
- **Task:** Gộp commit `e895f41` của An (xoá tài liệu dư thừa, viết lại 3 ADR, ghi chú code chat); bỏ file thừa của phía Khanh; sửa liên kết hỏng; chuẩn hoá README, AI_USAGE và requirements.
- **Prompt key:** `Gộp commit mới của An, An đã bỏ những file không cần thiết của anh ấy, mình cũng nên bỏ những file không cần thiết đi; chuẩn hoá lại README, AI_USAGE, requirement.`
- **AI Output:** merge An_Newtech, chỉ xung đột `CHAT_TIMEOUT_MS` (giữ 300 giây); dựng lại [implementation-decisions.md](docs/implementation-decisions.md) từ ADR-004/005/006 cũ mà các tài liệu của An đang trỏ tới; đổi tên 3 test `1chat-*.test.ts` về tên cũ; xoá bản pptx và 2 script dựng deck (`docs/slides/GomNang-thuyet-trinh.pptx`, `build-deck.js`, `capture.mjs`), giữ ảnh `docs/slides/img/` làm dự phòng demo; [README](README.md) viết lại theo DOC-05; nhật ký này sắp lại theo thời gian, cùng một khuôn 7 trường, thêm bảng trường hợp AI chưa đủ tốt; [requirements](docs/requirements.md) cập nhật AI-01…AI-05.
- **Verification:** Sau merge 206/206 test (54 domain, 122 backend, 30 frontend); E2E Playwright 25/25 bằng Chrome cài sẵn (`PW_CHANNEL=chrome`): 24 ca đạt ở lượt đầu, ca đầu tiên dừng lúc khởi động Chrome (1 ms, chưa chạy bước nào) và đạt khi chạy lại riêng file `ai-usage.spec.ts`. Kiểm liên kết tương đối trong mọi file `.md` được Git theo dõi: từ 97 liên kết hỏng về 0. Bản deploy Vercel và Render `/health` trả 200 lúc viết README.
- **Modifications:** **Trường hợp AI chưa đủ tốt #18:** các mục 35–39 do Codex viết trỏ tới `docs/implementation-decisions.md`, `docs/evaluation-results.md` và `docs/report/GomNang_Project_Report.docx`, ba file chưa từng có trong Git ở nhánh nào; việc xoá tài liệu còn để lại 97 liên kết hỏng. Đã tạo lại file quyết định nghiệp vụ, trỏ liên kết tài liệu đã xoá sang tài liệu thay thế (ADR-003, bằng chứng US-7/US-9), bỏ liên kết tới log thô đã gỡ nhưng giữ chữ. Khi sắp lại nhật ký chỉ đổi tên trường và thứ tự, không sửa nội dung từng mục; trường thiếu ghi "Entry gốc không ghi".
- **Human review:** An cần xác nhận việc đổi tên test về tên cũ và file quyết định nghiệp vụ dựng lại.

## Giới hạn kiểm chứng và xác nhận của thành viên

Các checks hiện có được ghi ngày 25/10/2026 tại [verification](docs/evidence/verification.md). Chưa chạy lại toàn bộ backend API/RAG, E2E, build/typecheck, provider thật hoặc deploy trong lần kiểm này. Test xanh ở các nhóm riêng không đồng nghĩa toàn dự án đạt.

Khanh chịu trách nhiệm frontend, An backend; mỗi người cần tự xác nhận nội dung module mình trước nộp. Không có ghi nhận hoàn tất human review chỉ từ kết quả tự động. Khi review, phải giải thích được đường đi request, lý do sửa các lỗi ở mục 3/5/6 và giới hạn RAG ở mục 7. Chỉ thêm entry khi có thay đổi đáng kể, ghi kết quả kiểm tra cụ thể và phần sửa thực tế; không cần lưu mọi prompt.

Cập nhật 27/10/2026: lần kiểm gần nhất là `npm test` 206/206 sau khi gộp An_Newtech và eval người gác cổng v4 20/20 (mục 41, 42); E2E 25/25. US-8 do Khanh làm cả BE và FE, An review.
