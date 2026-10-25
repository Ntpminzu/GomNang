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

## 12. US-2 Project Delete (Q-03)

- **AI Tool:** Claude Code.
- **Task:** Hoàn thiện CRUD của US-2 bằng chức năng xoá dự án, chốt Q-03 và giữ hồi quy tạo/xem/sửa.
- **Prompt key:** `Làm tiếp US được phân công: bổ sung xoá dự án theo chính sách phù hợp, có xác nhận, bảo vệ dữ liệu liên quan và sổ ghi vết; kiểm tra, ghi evidence, kịch bản human review, bổ sung AI_USAGE.`
- **AI Output:** `canDeleteProject` trong [rules.ts](packages/domain/src/rules.ts), `DELETE /api/projects/:id` và `deleteProject` trong [projects.service.ts](be/src/modules/projects/projects.service.ts), migration [0012](be/drizzle/0012_project_soft_delete.sql), lọc ở [projects.repository.ts](be/src/modules/projects/projects.repository.ts) và [dashboard.repository.ts](be/src/modules/dashboard/dashboard.repository.ts), hộp thoại xoá trong [DraftPanel](fe/src/presentation/modules/projects/components/DraftPanel.tsx), [ADR-005](docs/adr/005-project-soft-delete.md), [bằng chứng US-2](docs/evidence/us2-verification.md).
- **Verification:** 142 tests (46 domain, 71 backend, 25 frontend), typecheck, build và E2E 7/7 đạt. Tạm bỏ từng điều kiện lọc dự án đã xoá thì test API đỏ. Chạy thật trên app: xoá bản nháp thử, về Việc của tôi, link cũ trả 404.
- **Modifications:** AI đề xuất xoá mềm sau khi đọc schema: sổ ghi vết có trigger chỉ ghi thêm và khoá ngoại tới dự án, nên xoá cứng không làm được. Giới hạn chỉ bản nháp để dự án đã công khai vẫn dùng Huỷ và giữ lịch sử cho người góp. **Trường hợp AI chưa đủ tốt #7:** bản đầu gọi `DELETE` qua client HTTP mà kiểu phương thức chỉ cho GET/POST/PUT; E2E vẫn qua nhưng typecheck báo lỗi, đã bổ sung `DELETE` vào kiểu. Câu chữ kịch bản human review được đối chiếu lại với form thật: danh sách người giữ tiền chỉ có thành viên đã xác minh.
- **Human review:** Chờ người kiểm điền bảng H1–H8 trong [bằng chứng US-2](docs/evidence/us2-verification.md#3-human-review).

## 13. US-3 Search, Filter, Sort and Pagination

- **AI Tool:** Claude Code.
- **Task:** Chuyển tìm, lọc, sắp xếp của danh sách công khai lên máy chủ, thêm phân trang có tổng số và giữ điều kiện trên URL.
- **Prompt key:** `Làm US-3: contract query/page/total, validate query, lọc/sắp xếp/phân trang ở máy chủ, FE có nút trang và URL state; kiểm tra, ghi evidence, kịch bản human review, bổ sung AI_USAGE.`
- **AI Output:** `queryProjects`, `catalogStats`, `fold` trong [catalog.ts](packages/domain/src/catalog.ts); `listQuery` trong [projects.schema.ts](be/src/modules/projects/projects.schema.ts) và `validateQuery`; [ProjectListPage](fe/src/presentation/modules/projects/pages/ProjectListPage.tsx) có tìm trễ 300 ms, nút trang, giữ kết quả cũ khi đang tải; [bằng chứng US-3](docs/evidence/us3-verification.md).
- **Verification:** 149 tests (51 domain, 72 backend, 26 frontend), typecheck, build và E2E 8/8 đạt. Chạy thật với 19 dự án công khai: 3 trang 9 + 9 + 1 không trùng, link `?page=99` về trang cuối, quay lại từ trang dự án giữ trang và bộ lọc.
- **Modifications:** **Trường hợp AI chưa đủ tốt #8:** bản đầu của trang danh sách đọc URL và ghi URL trong hai effect; khi React dev chạy effect hai lần, link chia sẻ bị xoá bộ lọc. Lỗi này có từ trang cũ và chỉ lộ ra khi kiểm trên trình duyệt; đã thêm điều kiện "đã đọc URL" và một E2E giữ lỗi không quay lại. **Trường hợp #9:** effect đồng bộ số trang kéo người dùng về trang 1 mỗi lần bấm "Trang sau"; đã sửa để chỉ chạy khi có dữ liệu mới. "Mới đăng" trước đây so ngày bắt đầu, nay so ngày tạo. Logic lọc dùng chung trong `packages/domain` để backend và bản chạy thử trả cùng kết quả.
- **Human review:** Chờ người kiểm điền bảng H1–H8 trong [bằng chứng US-3](docs/evidence/us3-verification.md#3-human-review).

## 14. US-5 Receipt Upload (Q-04)

- **AI Tool:** Claude Code.
- **Task:** Thay ô dán link hoá đơn bằng upload chứng từ thật, chốt Q-04 (lưu ở đâu, loại/kích thước, ai tải, ai xem).
- **Prompt key:** `Làm US-5: upload file thật, lưu metadata, gắn vào nghiệp vụ, kiểm quyền/loại/kích thước, người ngoài không mở được file riêng; kiểm tra, ghi evidence, kịch bản human review, bổ sung AI_USAGE.`
- **AI Output:** [files.ts](packages/domain/src/files.ts) (nhận loại theo byte đầu, làm sạch tên), `canUploadReceipt`/`canViewReceipt` trong [rules.ts](packages/domain/src/rules.ts), bảng `files` và migration [0013](be/drizzle/0013_expense_receipt_files.sql), upload/đọc file trong [transparency.service.ts](be/src/modules/transparency/transparency.service.ts), [ExpenseDialog](fe/src/presentation/modules/transparency/components/ExpenseDialog.tsx) có thu nhỏ ảnh, [ReceiptPreview](fe/src/presentation/modules/transparency/components/ReceiptPreview.tsx), [ADR-006](docs/adr/006-receipt-storage.md), [bằng chứng US-5](docs/evidence/us5-verification.md).
- **Verification:** 154 tests (54 domain, 73 backend, 27 frontend), typecheck, build và E2E 9/9 đạt. Chạy thật: ảnh 16,5 MB thu về JPEG 1005 KB, tải trong khoảng 2 giây, xem trước đúng ảnh; file HTML khai là PNG bị từ chối 415.
- **Modifications:** AI chọn lưu file trong PostgreSQL vì Render xoá ổ đĩa khi deploy lại và nhóm chưa có khoá dịch vụ lưu file; giữ `receipt_url` cho khoản chi cũ. **Trường hợp AI chưa đủ tốt #10:** hộp thoại ghi chi bị tràn ngang ở màn 375 px khi tên file dài; test tự động không bắt được, chỉ lộ ra khi đo trên trình duyệt; đã sửa bằng `min-w-0` cho form và tên file. **Trường hợp #11:** test API mới đọc `Response.json()` không khai kiểu nên typecheck backend báo lỗi dù test chạy qua; đã khai kiểu. Bổ sung lời nhắc che số tài khoản, số điện thoại vì chứng từ đã duyệt sẽ công khai.
- **Human review:** Chờ người kiểm điền bảng H1–H7 trong [bằng chứng US-5](docs/evidence/us5-verification.md#3-human-review).

## 15. US-4 Verification Regression

- **AI Tool:** Claude Code.
- **Task:** Kiểm hồi quy luồng gửi xác minh, duyệt, trả lại sau các thay đổi US-8, US-2, US-3; bù test còn thiếu.
- **Prompt key:** `Kiểm tra US-4 và US-6 được phân công: chạy lại, bổ sung test cho tiêu chí chưa có bằng chứng, ghi evidence và kịch bản human review, bổ sung AI_USAGE.`
- **AI Output:** API test và E2E "trả lại có lý do → người điều phối thấy lý do → gửi lại"; hàm `createDraft` dùng chung trong [project-flow.spec.ts](fe/e2e/project-flow.spec.ts) thay 3 đoạn tạo bản nháp lặp lại; [bằng chứng US-4](docs/evidence/us4-verification.md).
- **Verification:** 156 tests, typecheck, build; E2E 11/11 ở hai lần chạy liền, lần đầu 10/11 do một ca hết thời gian chờ khi máy tải nặng. Tạm bỏ kiểm xung đột lợi ích thì test API đỏ.
- **Modifications:** AI viết thêm một đoạn kiểm xung đột lợi ích trong test mới; khi kiểm "test đỏ" thì thấy đã có test cũ cho đúng việc đó, nên bỏ đoạn trùng.
- **Human review:** Chờ người kiểm điền bảng H1–H6 trong [bằng chứng US-4](docs/evidence/us4-verification.md#2-human-review).

## 16. US-6 Dashboard and Profile Regression

- **AI Tool:** Claude Code.
- **Task:** Kiểm hồi quy "Việc của tôi" và hồ sơ công khai, thêm bằng chứng đổi tài khoản và không lộ dữ liệu riêng.
- **Prompt key:** `Kiểm tra US-4 và US-6 được phân công: chạy lại, bổ sung test cho tiêu chí chưa có bằng chứng, ghi evidence và kịch bản human review, bổ sung AI_USAGE.`
- **AI Output:** API test "US-6 đổi tài khoản" và E2E ba tài khoản với cùng dự án; [bằng chứng US-6](docs/evidence/us6-verification.md).
- **Verification:** Test API so vai Khanh/Mai/An với dự án Hoa Mai, đếm đóng góp của An khớp DB, hồ sơ Mai không chứa email và số điện thoại thật. Chạy thật trên app với tài khoản mẫu Mai.
- **Modifications:** **Trường hợp AI chưa đủ tốt #12:** bản đầu dò số điện thoại trong hồ sơ bằng mẫu `0` + 9 chữ số và test đỏ nhầm, vì id người dùng mẫu dạng `00000000-…` cũng khớp. Đã đổi sang so đúng email và số điện thoại của Mai lấy từ DB test, và đặt số điện thoại thử cho Mai để phép kiểm có ý nghĩa.
- **Human review:** Chờ người kiểm điền bảng H1–H5 trong [bằng chứng US-6](docs/evidence/us6-verification.md#2-human-review).

## Giới hạn kiểm chứng và xác nhận của thành viên

Các checks hiện có được ghi ngày 25/10/2026 tại [verification](docs/evidence/verification.md). Chưa chạy lại toàn bộ backend API/RAG, E2E, build/typecheck, provider thật hoặc deploy trong lần kiểm này. Test xanh ở các nhóm riêng không đồng nghĩa toàn dự án đạt.

Khanh chịu trách nhiệm frontend, An backend; mỗi người cần tự xác nhận nội dung module mình trước nộp. Không có ghi nhận hoàn tất human review chỉ từ kết quả tự động. Khi review, phải giải thích được đường đi request, lý do sửa các lỗi ở mục 3/5/6 và giới hạn RAG ở mục 7. Chỉ thêm entry khi có thay đổi đáng kể, ghi kết quả kiểm tra cụ thể và phần sửa thực tế; không cần lưu mọi prompt.
