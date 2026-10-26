# AI Usage Log — GOM NẮNG

Nhật ký phục vụ yêu cầu cuối kỳ, ghi những phần AI hỗ trợ đáng kể trong lập trình, kiểm tra và tài liệu. Chỉ giữ các yêu cầu quan trọng theo module; không ghi mọi prompt, diễn biến theo thời gian hay toàn bộ hội thoại.

**Cách đọc:** `Prompt key` tóm lược yêu cầu quan trọng đã ghi nhận, không phải transcript nguyên văn. `AI Tool` giữ tên công cụ theo ghi nhận thực tế. Verification phân biệt kiểm source, kiểm tự động và runtime; việc chủ module tự đọc và giải thích code được xác nhận riêng.

### US7 đóng theo nghiệm thu người dùng — 26/10/2026

- **Tool/prompt:** Codex; người dùng xác nhận 20 câu thủ công đều đạt, fallback/non-AI và mở lại Ollama đạt, yêu cầu cập nhật bảng và đóng US7.
- **Thay đổi:** ghi 20/20 (100%) và 6/6 critical theo tự nghiệm thu vào bảng sau cải tiến; cập nhật fallback/phục hồi và trạng thái công việc ở requirements/backlog/traceability/evidence. Không đổi expected, bảng baseline hoặc tự điền output, ID log, call counts.
- **Ranh giới bằng chứng:** người dùng nói đã kiểm đủ trước/sau và injection gián tiếp, nhưng khi hỏi chi tiết chỉ xác nhận hỏi bộ 20 câu. Không tự ghi số baseline, payload/cách cài nguồn hoặc kết quả gián tiếp đã được xác minh. Công việc đóng theo quyết định chủ dự án; các chi tiết hồ sơ A4/A8 vẫn chờ bổ sung, không miễn yêu cầu cuối kỳ.
- **Kiểm chứng:** chỉ sửa/kiểm cấu trúc và liên kết tài liệu; không gọi model, chạy lại tests, index hoặc sửa DB. [Biên bản](docs/evidence/us7-manual-evaluation.md).

### Prompt v5 — làm rõ thiếu dữ kiện M12, 26/10/2026

- **Tool/prompt:** Codex; người dùng báo M12 không có liên hệ nhưng đôi lúc status answered, đôi lúc refused, rồi yêu cầu cập nhật prompt theo hướng đã đề xuất.
- **Thay đổi:** system prompt v4 → v5: tìm đúng dự án không đủ để answered nếu thiếu thông tin được hỏi; thêm ví dụ JSON refused cho email/phone thiếu và giới hạn phát biểu trong nguồn tìm được. Vẫn cho trả liên hệ công khai thực sự có trong nguồn. Query prompt v1, retrieval/index/schema/output validator không đổi; không dùng regex nội dung để sửa status.
- **Kiểm chứng:** 17/17 test hiện có liên quan RAG/output/retrieval/security đạt, exit 0; [raw log](docs/evidence/prompt-v5-tests.txt). Fixture tests không chứng minh Qwen sẽ luôn chọn đúng status. Không gọi model/index hoặc ghi DB thật; giữ expected và các kết quả manual đã điền, sau v5 chờ chạy lại bằng Qwen thật.

### Chat log request_id tự tăng — 26/10/2026

- **Tool/prompt:** Codex; người dùng yêu cầu bỏ embedded_documents/lifecycle, chỉ giữ request_id tự tăng làm khóa chính, không hiện ID trên UI và vẫn ghi nền. Sau auto-review chặn thao tác DB thật, người dùng xác nhận cho apply sau backup.
- **Thay đổi:** migration 0013 bảo toàn metadata log cũ, DB cấp integer identity, bỏ UUID id/correlation UUID và các cột thừa; response/UI bỏ mã tra cứu. Không đổi HTTP request logger chung. Runner preview/apply có archive+mapping, kiểm metadata/11 bảng nghiệp vụ/journal/RLS; phiếu manual đổi sang tra ID số theo thời gian, giữ các bằng chứng đã điền.
- **Kiểm chứng:** 162/162 workspace tests, typecheck/build exit 0, E2E chat 4/4. Supabase commit 0013, giữ 38/38 log, số 1..38, metadata còn lại và dữ liệu nghiệp vụ không đổi. Backup public+drizzle và mapping ở be/.data, mục lục archive đã kiểm, chưa diễn tập restore. Không chạy Qwen evaluation hoặc ghi log giả trên DB thật. [Evidence](docs/evidence/chat-log-sequence-verification.md).

### US7 phiếu test thủ công DB thật — 26/10/2026

- **Tool/prompt:** Codex; người dùng muốn 20 câu dựa trên DB thật và bảng điền kết quả, tự thử thủ công.
- **Thay đổi:** đọc hai dự án công khai và các guide/chunk hiện có trong transaction PostgreSQL READ ONLY, không đọc tài khoản/không ghi DB hoặc index. Tạo bộ riêng `gomnang-us7-manual-live-v1`, ghi expected theo index và mốc dữ liệu, 20 câu, bảng trước/sau, tổng hợp, hướng dẫn tra metadata. Giữ bộ snapshot cũ; nêu rõ bộ UI chưa bao phủ injection gián tiếp trong nguồn.
- **Kiểm chứng:** chỉ đối chiếu dữ kiện nguồn và cấu trúc/liên kết tài liệu; không chạy 20 câu, model, index hoặc sửa code ứng dụng. Các kết quả người dùng đều Chưa thử; không coi việc chuẩn bị phiếu là nghiệm thu. [Phiếu điền](docs/evidence/us7-manual-evaluation.md).

### US7 kiểm tra tự động và chốt evaluation — 26/10/2026

- **Tool/prompt:** Codex; người dùng cho chạy tests và chốt bộ evaluation 20 câu sau các đợt tinh gọn.
- **Thay đổi:** tạo dataset `gomnang-us7-eval-v1` gồm 8 thường/4 biên/6 an toàn critical/2 ngoài phạm vi, snapshot giả, expected facts/sources/status, history, payload cache và quy tắc trước/sau. Không thêm eval runner hoặc gọi model thật; không thay nguồn DB thật.
- **Kiểm chứng:** workspace 160/160 (domain 42, backend 95, frontend 23), typecheck và build exit 0. Dataset qua kiểm cấu trúc 20 ID riêng biệt/phân nhóm/6 critical. E2E và giới hạn được ghi tại [evidence US7](docs/evidence/us7-verification.md). Không lấy test fixture làm pass rate AI; 20 ca Qwen thật vẫn NOT_RUN.

### RAG logging/timeout tinh gọn — 26/10/2026

- **Tool/prompt:** Codex; người dùng yêu cầu làm hai phần còn lại từ review: đơn giản hóa ghi log và quản lý timeout.
- **Thay đổi:** middleware chuẩn bị metadata trong RAM, callback response close insert một row completed; bỏ insert pending/update và cờ vòng đời. Ghi nền best effort, lỗi log chỉ console metadata, không đổi câu trả lời. Bỏ lớp ChatDeadline/115+5/two signals; một timer 120 giây và AbortSignal chung qua pipeline/embedding/model/body. Giữ DB timeout/body cap, schema và dữ liệu cũ; không đổi prompt/version/index.
- **Kiểm chứng:** cập nhật nguồn test timeout/disconnect/one summary/log failure và API fixture chờ log nền, chưa chạy tests/typecheck/build/E2E/eval/model/DB/index theo thống nhất. Có thể thiếu log khi process hoặc DB lỗi; không coi source/test đã chuẩn bị là bằng chứng nghiệm thu. [Thiết kế và tự thử](docs/rag-simplification.md).

### RAG tinh gọn — 26/10/2026

- **Tool/prompt:** Codex; người dùng yêu cầu triển khai các phần dọn đã review: kiểm tra lặp, cấu trúc nhiều provider, kiểm output chồng nhau và guardrail dễ chặn nhầm.
- **Thay đổi:** cấu hình/client đơn Qwen/Ollama; API thông tin model chuyển sang `/api/chat/model`, body chat bỏ `model`; cập nhật UI và fixtures. Bỏ lọc lại cùng candidates sau generation; output dùng một lượt kiểm nội dung chung; kiểm sao chép prompt không phụ thuộc tiền tố câu. Thu hẹp mẫu chỉ dẫn trong nguồn, không chặn đại từ “ai” hoặc “luôn trả lời” đơn lẻ. Không sửa timeout/log lifecycle/DB/index.
- **Prompt:** không đổi nội dung system/query prompt, giữ version v4/v1. Guard thay đổi được quản lý trong Git; không coi đó là một phiên bản system prompt mới.
- **Kiểm chứng:** đọc source/callers và kiểm diff; chuẩn bị test nhưng chưa chạy tests/typecheck/build/E2E/eval/model/index/DB thật. Checklist và giới hạn: [RAG tinh gọn](docs/rag-simplification.md).

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

### 11.US-7 Refactor RAG ngày 25/10/2026

- **Tool:** Codex.
- **Prompt key:** `Đổi cấu trúc, hàm và luồng gọi RAG theo AI_assistant_chatbot_rag; giữ pgvector và tiếp tục tự đồng bộ trước khi hỏi.`
- **Output/changes:** `answerQuestion` điều phối helper `selectHistory`, `buildRetrievalQuestion`, `buildMessages`, `citationWarnings`; tách config/prompt, controller và repository SQL. Giữ provider/API/DB schema, chunk IDs và thuật toán 800/120 ký tự; query pgvector kiểm public status trước LIMIT. Không copy Lumen Section 11, index JSON, debug payload hoặc cách chỉ cảnh báo citation sai.
- **Checks:** Unit/helper, PGlite index/retrieval, HTTP và browser/proxy fixture; kết quả cụ thể tại [RAG evidence](docs/evidence/rag-refactor-verification.md). Các kiểm tra tự động không chứng minh chất lượng model thật hoặc human acceptance.
- **Review/limits:** History chỉ làm ngữ cảnh, không làm chứng cứ; ghép câu hỏi cũ có thể nhiễu khi đổi chủ đề/ngoài phạm vi. Chưa thực hiện bộ eval ≥20 ca trước/sau, guardrails đầy đủ, promptVersion, telemetry hay streaming. Đây là bước nền trước US-7.

## Giới hạn kiểm chứng và xác nhận của thành viên

### Chỉ Qwen/Ollama — 26/10/2026

- **Tool/prompt:** Codex; người dùng yêu cầu bỏ hoàn toàn Gemini để tinh gọn, chỉ dùng Qwen. Tiếp tục trực tiếp công việc tinh gọn chatbot, không chạy lại vòng tranh luận.
- **Thay đổi:** xóa adapter/test cloud, cấu hình/key env; API chỉ nhận ollama, bỏ nhánh auth chat cloud, widget bỏ selector và phụ thuộc phiên đăng nhập. Script smoke riêng cũng chỉ Qwen/Ollama; không sửa Google OAuth nghiệp vụ. Giữ guards/RAG/manual index/output/deadline/log; không migration/xóa dữ liệu log cũ.
- **Kế hoạch:** bỏ milestone parity và điều kiện nghiệm thu cả hai provider; evaluation US7 chỉ Qwen nhưng vẫn cần bộ ca/pass rate/cải tiến trước-sau đã chốt. Evidence và mục AI_USAGE lịch sử giữ nguyên, không mô tả khả năng hiện tại.
- **Kiểm chứng:** rà source/callers/env mà không in key, cập nhật fixtures/API và docs, kiểm diff/Graphify. Chưa tests/typecheck/build/E2E/eval, model/index hoặc DB thật. [Chi tiết](docs/chat-qwen-only.md).

### US7 giai đoạn 3 — 26/10/2026

- **Tool/prompt:** Codex; tiếp tục giai đoạn 3, sau đó người dùng chỉ ra câu React đã bị từ chối đúng. Giữ NO_EVIDENCE, không thêm classifier/từ khóa để chặn lại câu đó; chỉ sửa history làm nhiễu chủ đề mới.
- **Thay đổi:** history chỉ cho câu nối tiếp; validate output thêm secret/instruction/một số đoạn prompt theo mẫu; deadline 120 giây gồm 115 xử lý/5 finalize; truyền abort tới model/embedding/body read với byte cap. PostgreSQL chat pool riêng, session statement timeout và query/connect bounds, không giữ transaction/connection xuyên model, không đổi pool nghiệp vụ. UI có Thử lại thủ công và giữ draft.
- **Prompt/config:** chat `gomnang-rag-v4`, query vẫn v1. Giữ manual index/nguồn cũ, JWT Gemini và hai providers; không migration, auto retry/failover/classifier hoặc streaming. Không đổi `fe/next.config.mjs` do người dùng đã cấu hình.
- **Kiểm chứng:** chỉ đọc source/callers, kiểm diff và Graphify; chuẩn bị ca deadline/body timeout/output/topic switch/HTTP/UI nhưng chưa chạy tests/typecheck/build/E2E/eval. Không tool gọi model/index hoặc ghi DB thật. Runtime/quality và human acceptance còn mở; [chi tiết](docs/us7-phase3.md).

### US7 giai đoạn 2 — 26/10/2026

- **Tool/prompt:** Codex; người dùng yêu cầu bắt đầu code giai đoạn 2 của kế hoạch đã chốt, giữ manual index/chấp nhận nguồn cũ và chỉ chạy automated checks ở giai đoạn cuối.
- **Thay đổi:** guard pattern chung cho current input/toàn history trước AI, full public document trước chunking, chunk/URL trước embedding và candidates từ index cũ trước prompt/publish. Từ chối toàn lượt trộn hợp lệ/injection; bảo toàn public contact, không thêm join tài khoản. Thêm reasonCode cho injection/private/secret/unsafe sources; metadata dùng bảng hiện có, không raw content/migration.
- **Prompt/UI:** version chat `gomnang-rag-v3`, query vẫn v1; dùng UI refused/history từ giai đoạn 1 để không gửi lại lượt từ chối. Không thêm provider/classifier hoặc streaming.
- **Kiểm chứng/giới hạn:** chỉ đối chiếu source/callers, kiểm diff và Graphify; không chạy tests/typecheck/build/E2E/eval, gọi model, index hoặc ghi DB thật. Chuẩn bị unit/isolated integration/HTTP/E2E cases để giai đoạn 6. Pattern có thể bỏ sót/chặn nhầm; chưa chứng minh an toàn hoặc semantic correctness với model thật. [Checklist tự thử](docs/us7-phase2.md).

### RAG index thủ công — 26/10/2026

- **Tool/prompt:** Codex; người dùng yêu cầu thực hiện ngay, bỏ tranh luận bổ sung, chạy lệnh incremental để index và chấp nhận nguồn cũ nhằm giữ luồng đơn giản.
- **Thay đổi:** thêm `npm.cmd run rag:index`; bỏ đọc toàn nguồn/build/index khỏi request; chỉ query embedding + pgvector + kiểm output/log. SQL vẫn lọc public status. CLI PostgreSQL có session lock, snapshot nhất quán, embedding phần đổi trước atomic save/prune, không seed/reset/DDL. Bỏ phương án kiểm freshness từng nhóm nguồn theo quyết định mới.
- **Prompt/UI:** chat version tăng lên `gomnang-rag-v2` để nhắc nguồn có thể cũ; query version giữ nguyên. Widget nhắc kiểm tra trang dự án. Cập nhật fixtures/tests chuẩn bị index tường minh, thêm ca nguồn cũ nhưng còn công khai và index chưa sẵn sàng.
- **Kiểm chứng:** chỉ đối chiếu source/callers, kiểm diff và cập nhật Graphify. Không chạy tests/typecheck/build/E2E/eval, không chạy CLI/ghi DB thật hoặc gọi model trong lượt này. [Cách dùng](docs/rag-manual-index.md); runtime và human acceptance chờ người dùng tự thử.

### US7 giai đoạn 1 — 26/10/2026

- **Tool/prompt:** Codex; triển khai giai đoạn 1 theo kế hoạch đã chốt, chỉ chạy kiểm tra tự động ở giai đoạn cuối, người dùng tự thử các giai đoạn nhỏ trên DB thật.
- **Thay đổi:** bỏ nhánh lời chào/danh mục cứng; một pipeline RAG; version chat/query; JSON nội bộ và Zod/citation validation; trạng thái answered/refused/failed; metadata DB không lưu câu hỏi/history/output/nguồn; UI trạng thái/mã tra cứu/thông báo provider. Fixtures theo interface mới đã cập nhật nhưng chưa chạy.
- **DB:** runner riêng áp dụng 0012 trên Supabase sau preflight và backup public+drizzle; RLS/quyền/cột/index đã kiểm, checksum 11 bảng cũ không đổi. PostgreSQL startup chuyển sang kiểm journal/hash, không tự apply; PGlite vẫn tự migrate. Chưa diễn tập restore archive.
- **Kiểm chứng:** chỉ đọc đối chiếu source/callers, sinh migration, kiểm an toàn deploy và cập nhật Graphify; không test/typecheck/build/E2E/eval hoặc gọi model nghiệm thu. Checklist và giới hạn ở [US7 giai đoạn 1](docs/us7-phase1.md). Human review và model thật chờ người dùng; không ghi toàn US7 hoàn thành.

Các checks hiện có được ghi ngày 25/10/2026 tại [verification](docs/evidence/verification.md). Chưa chạy lại toàn bộ backend API/RAG, E2E, build/typecheck, provider thật hoặc deploy trong lần kiểm này. Test xanh ở các nhóm riêng không đồng nghĩa toàn dự án đạt.

Khanh chịu trách nhiệm frontend, An backend; mỗi người cần tự xác nhận nội dung module mình trước nộp. Không có ghi nhận hoàn tất human review chỉ từ kết quả tự động. Khi review, phải giải thích được đường đi request, lý do sửa các lỗi ở mục 3/5/6 và giới hạn RAG ở mục 7. Chỉ thêm entry khi có thay đổi đáng kể, ghi kết quả kiểm tra cụ thể và phần sửa thực tế; không cần lưu mọi prompt.
