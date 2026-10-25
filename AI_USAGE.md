# AI Usage Log — GOM NẮNG

Nhật ký phục vụ yêu cầu cuối kỳ, ghi những phần AI hỗ trợ đáng kể trong lập trình, kiểm tra và tài liệu. Chỉ giữ các yêu cầu quan trọng theo module; không ghi mọi prompt, diễn biến theo thời gian hay toàn bộ hội thoại.

**Cách đọc:** `Prompt key` tóm lược yêu cầu quan trọng đã ghi nhận, không phải transcript nguyên văn. `AI Tool` giữ tên công cụ theo ghi nhận thực tế. Verification phân biệt kiểm source, kiểm tự động và runtime; việc chủ module tự đọc và giải thích code được xác nhận riêng.

## 1. Authentication Module

- **AI Tool:** Claude Code, Codex.
- **Task:** Xây dựng/rà soát password/JWT, triển khai US-1 theo quyết định nhóm: Google user, role user/admin/verifier, admin tạo verifier với mật khẩu dùng ngay, verifier tự đổi khi muốn.
- **Prompt key:** `Khảo sát US-1, chốt role và xác minh danh tính riêng, lập kế hoạch có phản biện rồi triển khai trên DB test local.`
- **AI Output:** Auth session/revocation/Google state-PKCE-nonce, admin provisioning, optional password change, migration bảo toàn dữ liệu, frontend và kiểm thử. Source: [auth](be/src/modules/auth), [admin](be/src/modules/admin), [schema](be/src/infrastructure/database/schema.ts), [US-1 guide](docs/us1-local.md).
- **Verification:** [US-1 local và Supabase evidence](docs/evidence/us1-verification.md) phân biệt HTTP/DB/JOSE, frontend session races, browser provider giả và giới hạn Google thật. Smoke cô lập cũ ở [verification](docs/evidence/verification.md) được giữ như bằng chứng nền.
- **Modifications:** Dùng role thay isVerifier; đổi verified thành identityVerified; chặn self-escalation, Google/dev-login đặc quyền. Giữ quyền theo dự án/BR-002, sửa 401/5xx boundary và che log nhạy cảm. Test fixtures RAG được cập nhật contract async, không đổi pipeline hoặc coi vector giả là đánh giá chất lượng AI.
- **Human review:** An/Khanh cần tự đọc, chạy Google thật và giải thích source; kiểm tự động không thay xác nhận con người.

## 2. Project and Shared Domain Module

- **AI Tool:** Claude Code, Codex.
- **Task:** Hỗ trợ form dự án, validation, tách quyền và checklist xác minh dùng chung FE/BE.
- **Prompt key:** `Tạo luồng dự án có nhu cầu định lượng; kiểm người phụ trách tài chính khác điều phối và tách các quy tắc dùng chung giữa frontend và backend.`
- **AI Output:** Form, service/repository, schema Zod và pure rules ở [validate-project.ts](packages/domain/src/validate-project.ts), [rules.ts](packages/domain/src/rules.ts), [projects.service.ts](be/src/modules/projects/projects.service.ts), [ProjectForm.tsx](fe/src/presentation/modules/projects/components/ProjectForm.tsx).
- **Verification:** Domain suite đạt 41/41, gồm dữ liệu sai, BR-002/BR-003, quyền sửa/duyệt và trạng thái. Đối chiếu backend lấy actor từ JWT và ghi project/needs/audit trong transaction; kiểm source này không thay cho runtime DB.
- **Modifications:** Chuẩn hóa validation và quyền trong shared domain, backend vẫn kiểm lại; giữ lỗi schema 400 riêng lỗi nghiệp vụ 422. Checklist [assess.ts](packages/domain/src/assess.ts) là rules/Jaccard, chưa phải structured output từ LLM.

## 3. Contribution and Project Lifecycle Module

- **AI Tool:** Claude Code.
- **Task:** Hỗ trợ cam kết, bàn giao/xác nhận và kết thúc/hủy dự án có tách quyền.
- **Prompt key:** `Hoàn thiện luồng đóng góp và vòng đời dự án; chặn vượt nhu cầu, tự xác nhận và các trường hợp làm dự án không thể chốt.`
- **AI Output:** Luồng contribution, lifecycle rules, khóa dữ liệu và audit tại [contributions.service.ts](be/src/modules/contributions/contributions.service.ts), [contributions.repository.ts](be/src/modules/contributions/contributions.repository.ts), [rules.ts](packages/domain/src/rules.ts).
- **Verification:** Domain tests kiểm vượt nhu cầu, tự xác nhận, hủy và chốt sổ; suite 41/41 đạt. Repository có khóa theo source, chưa có phép thử tải đồng thời trong lần kiểm này.
- **Modifications:** **Trường hợp AI chưa đủ tốt #1:** luồng cho điều phối tự cam kết khoản mà không có người độc lập xác nhận khiến dự án kẹt. Sau review bổ sung `SELF_PLEDGE`; test `người điều phối chỉ tự cam kết khi có người thứ hai xác nhận được` kiểm trực tiếp lỗi này. Bổ sung khóa dự án khi thay đổi trạng thái và giữ audit từng thay đổi.

## 4. Transparency and Dashboard Module

- **AI Tool:** Claude Code.
- **Task:** Hỗ trợ sổ thu chi có duyệt, bảng cập nhật và dashboard công việc theo vai.
- **Prompt key:** `Xây dựng sổ thu chi minh bạch: người giữ quỹ ghi chi, người khác duyệt, không chi vượt số dư; hiện việc cần làm theo từng vai.`
- **AI Output:** [transparency.service.ts](be/src/modules/transparency/transparency.service.ts), [dashboard.service.ts](be/src/modules/dashboard/dashboard.service.ts), [dashboard.ts](packages/domain/src/dashboard.ts), UI ledger và dashboard cá nhân.
- **Verification:** Domain tests đạt cho số dư, khoản chờ duyệt, cấm tự duyệt và công việc theo vai. Có ca API cho thu chi/profile trong [api.test.ts](be/tests/integration/api.test.ts), nhưng chưa chạy lại toàn file trong lần kiểm này.
- **Modifications:** Số dư và công việc được suy ra từ dữ liệu/rules thay vì lưu bản sao; khoản chi chờ duyệt giữ chỗ. Dashboard cá nhân và link hóa đơn không được trình bày như admin AI analytics hoặc upload đã hoàn tất.

## 5. Frontend and Session Integration Module

- **AI Tool:** Claude Code, Codex.
- **Task:** Hỗ trợ giao diện Next.js, form, UI states, HTTP adapter và session.
- **Prompt key:** `Nối frontend với backend thật, giữ form khi request lỗi, cập nhật session đúng khi đổi tài khoản và bảo đảm giao diện dùng được trên màn hình nhỏ.`
- **AI Output:** UI trong presentation, adapter tại [libs/api](fe/src/libs/api), [SessionProvider.tsx](fe/src/presentation/providers/SessionProvider.tsx) và [redirect.ts](fe/src/libs/utils/redirect.ts).
- **Verification:** Frontend suite đạt 15/15, gồm mock flow, lỗi validation/quyền và redirect. Đây là test logic/mock, chưa phải kiểm lại browser/mobile thật.
- **Modifications:** Sửa session sau hydration và giữ dữ liệu form khi lỗi. **Trường hợp AI chưa đủ tốt #2:** bộ lọc redirect còn nhận đường dẫn dạng `/.//host`; sửa `safeNext` và thêm ca trong [redirect.test.ts](fe/tests/redirect.test.ts). Test hiện kiểm cả URL ngoài, protocol-relative và đường dẫn có ký tự bất thường.

## 6. Database and Persistence Module

- **AI Tool:** Claude Code, Codex.
- **Task:** Hỗ trợ driver PostgreSQL/PGlite, persistence, transaction và khóa tránh mở trùng DB.
- **Prompt key:** `Giữ dữ liệu bền vững, xử lý lỗi khởi động PGlite và ngăn backend/SQL CLI cùng mở một thư mục dữ liệu.`
- **AI Output:** [client.ts](be/src/infrastructure/database/client.ts), [pglite.ts](be/src/infrastructure/database/pglite.ts), schema/migrations và test lock.
- **Verification:** [database-lock.test.ts](be/tests/integration/database-lock.test.ts) đạt khi chạy cùng nhóm backend checks; test dùng thư mục tạm, kiểm tiến trình thứ hai bị chặn và mở lại sau đóng. Không chạm dữ liệu thật.
- **Modifications:** **Trường hợp AI chưa đủ tốt #3:** code mở DB thiếu tạo thư mục cha, test tạm bỏ sót nhưng chạy server mới lỗi; bổ sung tạo thư mục trong luồng mở DB. Test lock từng dùng `spawnSync` gây chặn event loop và khóa không được làm mới; đổi thành spawn bất đồng bộ. Giữ constraints/audit khi thao tác dữ liệu.

## 7. RAG Chatbot Module

- **AI Tool:** Codex.
- **Task:** Hỗ trợ chatbot hỏi dữ liệu ứng dụng, semantic retrieval bằng Ollama/pgvector và trả nguồn.
- **Prompt key:** `Tạo chatbot trả lời từ dữ liệu dự án công khai bằng chunking, embeddings và vector search; có trích dẫn và nói chưa đủ thông tin khi thiếu nguồn.`
- **AI Output:** [chat.retrieval.ts](be/src/modules/chat/chat.retrieval.ts), [chat.embedding.ts](be/src/modules/chat/chat.embedding.ts), [chat.service.ts](be/src/modules/chat/chat.service.ts), adapter model và [ChatWidget.tsx](fe/src/presentation/modules/chat/ChatWidget.tsx).
- **Verification:** Adapter Ollama/Gemini dùng mock fetch, không chứng minh provider thật hoặc chất lượng câu trả lời. Retrieval tests đã cập nhật contract async và chạy với fixture vectors/PGlite; không đổi pipeline. Chưa có eval ≥20 ca trước/sau cải tiến; xem kết quả checks mới ở [US-1 local và Supabase evidence](docs/evidence/us1-verification.md).
- **Modifications:** Thay retrieval theo từ bằng semantic retrieval; đồng bộ chunk theo hash/model, loại nguồn không còn công khai và kiểm kích thước vector/citation. Rà soát để không coi citation đúng số là chứng minh câu trả lời đúng; giữ lịch sử chat tách khỏi nguồn chứng cứ. Lời chào/liệt kê theo quy tắc không tính là lần LLM trả lời.

## 8. Deployment and Configuration Module

- **AI Tool:** Claude Code, Codex.
- **Task:** Hỗ trợ Docker, rewrite FE–BE, cấu hình môi trường và chẩn đoán DB/model khi demo.
- **Prompt key:** `Đóng gói frontend/backend/database, cấu hình biến môi trường đúng và kiểm tra luồng từ trình duyệt tới database và model.`
- **AI Output:** [Compose](docker-compose.yml), [BE Dockerfile](be/Dockerfile), [FE Dockerfile](fe/Dockerfile), [Next config](fe/next.config.mjs), [deployment guide](docs/deployment.md).
- **Verification:** Rà config xác định container cần pgvector và endpoint embeddings reachable; `/health` chỉ kiểm DB. Chưa chạy lại Docker, hosting hoặc model thật để xác nhận bản nộp.
- **Modifications:** Đồng bộ hướng dẫn với be/fe/workspaces, loại chỉ dẫn bật dev-login trên hosting công khai; ghi rõ thiếu DATABASE_URL có thể làm backend dùng PGlite, Gemini vẫn cần Ollama embeddings. Không tự ghi deploy đã đạt chỉ vì có Dockerfile.

## 9. Final Project Documentation

- **AI Tool:** Codex.
- **Task:** Hỗ trợ đối chiếu đề, truy vết yêu cầu và tổ chức tài liệu cuối kỳ.
- **Prompt key:** `Đối chiếu yêu cầu cuối kỳ với code, đồng bộ tài liệu và chỉ ghi các lần AI hỗ trợ quan trọng cùng phần kiểm tra/chỉnh sửa.`
- **AI Output:** [requirements](docs/requirements.md), [traceability](docs/traceability.md), [architecture](docs/architecture.md), [AI design](docs/ai-design.md), [ADR](docs/adr/README.md), backlog và nhật ký này.
- **Verification:** Đối chiếu 10 stories có phân công BE/FE, 3 ADR và API contract với source routes; kiểm local links/anchors và Markdown. Những kết quả ứng dụng được phân biệt với kiểm tài liệu ở [verification](docs/evidence/verification.md).
- **Modifications:** Tổ chức theo sản phẩm/module, giữ 9 US nhóm chọn và tách Real-time thành US-10 bắt buộc, mỗi US có phần BE của An và FE của Khanh, chọn lọc prompt quan trọng; bỏ nhật ký hội thoại và thông tin không phục vụ bản nộp. Các module đóng góp/vòng đời/thu chi vẫn ghi nhận việc AI đã hỗ trợ, dù không còn là US riêng. Giữ riêng phần đã có/chưa có; năng lực AI thứ hai vẫn chưa chốt. OAuth2/admin có source và local checks theo US-1, chưa chứng minh Google thật; streaming, upload và analytics vẫn chưa hiện thực.

## 10. US-1 Implementation and Human Review Follow-up

- **AI Tool:** Codex.
- **Task:** Hoàn thiện US-1 trên local/Supabase, gộp bằng chứng và rà soát kết quả human review do người dùng ghi.
- **Prompt key:** `Triển khai US-1, cập nhật Supabase trực tiếp, gộp hai file bằng chứng và kiểm tra các ca human review đã điền.`
- **AI Output:** Auth Google/session/role, admin cấp verifier, đổi mật khẩu tự nguyện, migrations 0010–0011 và [bằng chứng US-1](docs/evidence/us1-verification.md) có bảng H1–H8.
- **Verification:** 130 tests, typecheck/build và E2E 5/5 đạt trên môi trường test; Supabase đã áp migration và đối chiếu dữ liệu. Người dùng ghi nhận Google thật đăng nhập với role user, admin tạo verifier, verifier đăng nhập, thông báo lỗi đổi mật khẩu và từ chối quyền ở một số ca. H2 chưa ghi kết quả liên kết tài khoản user cũ, H3 còn trống; H1/H5–H8 còn thiếu kết quả của một số bước. E2E Google dùng provider giả.
- **Modifications:** Gộp bằng chứng local và Supabase vào một file, thêm mẫu human review và ghi rõ các kết quả còn thiếu. Không tự chuyển US-1 sang trạng thái đã nghiệm thu.
- **Human review:** Mới có ghi nhận thao tác một phần trong [bảng H1–H8](docs/evidence/us1-verification.md); chưa có tên/ngày, kết luận và xác nhận đọc/giải thích source của An/Khanh.

## 11. US-8 Structured Output Assessment

- **AI Tool:** Claude Code.
- **Task:** Chốt capability AI thứ hai là Structured output và làm US-8 cả BE lẫn FE (phân công Khanh): người xác minh nhờ AI soát hồ sơ chờ duyệt, có eval 20 ca trước/sau.
- **Prompt key:** `Làm năng lực AI thứ hai cho người xác minh: LLM trả JSON theo schema, app gộp với quy tắc; mỗi US xong thì kiểm tra, ghi evidence, lên kịch bản human review và bổ sung AI_USAGE, không sửa lịch sử.`
- **AI Output:** [verification.ai.ts](be/src/modules/verification/verification.ai.ts), endpoint `POST /api/projects/:id/ai-assessment`, [prompts v1–v3](be/src/modules/verification/prompts/), `mergeAiAssessment` trong [assess.ts](packages/domain/src/assess.ts), [AssessmentPanel](fe/src/presentation/modules/verification/components/AssessmentPanel.tsx), [eval runner](be/scripts/eval-assessment.ts) và [20 ca](be/evals/assessment/cases.json), [ADR-004](docs/adr/004-structured-assessment.md), [bằng chứng US-8](docs/evidence/us8-verification.md).
- **Verification:** 139 tests (45 domain, 70 backend, 24 frontend), typecheck, build và E2E 6/6 đạt; E2E dùng model giả. Tạm bỏ luật gắn cờ hoặc lần hỏi lại thì test đỏ. Eval `qwen3:4b` từ 13/20 lên 15/20, latency trung bình từ 29,1 xuống 11,4 giây. Chạy thật trên app một lần: 1 lần gọi, 16 giây. Gemini chưa kiểm được vì Google trả 503 lúc kiểm.
- **Modifications:** **Trường hợp AI chưa đủ tốt #4:** bản đầu chỉ bật JSON mode; eval thật cho thấy model chép lại hồ sơ đầu vào và phải hỏi lại trung bình 1,42 lần mỗi ca. Đã đổi sang gửi JSON Schema sinh từ Zod, không còn phải hỏi lại. **Trường hợp #5:** proxy Next.js cắt request sau 30 giây trong khi model chạy hơn một phút, gây lỗi kết nối; đã nâng `proxyTimeout` lên 150 giây. **Trường hợp #6:** prompt v3 do AI đề xuất làm điểm giảm còn 13/20, nên không dùng và giữ v2. Model nhỏ vẫn chỉ bắt 1/6 ca nguy hiểm; giới hạn này ghi rõ trong bằng chứng.
- **Human review:** Chờ người kiểm điền bảng H1–H10 trong [bằng chứng US-8](docs/evidence/us8-verification.md#3-human-review); chưa có tên, ngày và xác nhận đọc source của An/Khanh.

## Giới hạn kiểm chứng và xác nhận của thành viên

Các checks hiện có được ghi ngày 25/10/2026 tại [verification](docs/evidence/verification.md). Chưa chạy lại toàn bộ backend API/RAG, E2E, build/typecheck, provider thật hoặc deploy trong lần kiểm này. Test xanh ở các nhóm riêng không đồng nghĩa toàn dự án đạt.

Khanh chịu trách nhiệm frontend, An backend; mỗi người cần tự xác nhận nội dung module mình trước nộp. Không có ghi nhận hoàn tất human review chỉ từ kết quả tự động. Khi review, phải giải thích được đường đi request, lý do sửa các lỗi ở mục 3/5/6 và giới hạn RAG ở mục 7. Chỉ thêm entry khi có thay đổi đáng kể, ghi kết quả kiểm tra cụ thể và phần sửa thực tế; không cần lưu mọi prompt.
