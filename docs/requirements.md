# Yêu cầu cuối kỳ — GOM NẮNG

Cập nhật **25/10/2026**. Hạn cuối nhóm cung cấp: **27/10/2026**, giờ nộp/lịch bảo vệ riêng chưa xác nhận. Nguồn: [Final Project Assignment: Guidelines, 2026–2027](https://docs.google.com/document/d/1zxaqjKBBGjibOYuhw5xW6hEU1NbUayrr/edit).

## 1. Mục tiêu và tổ chức nhóm

GOM NẮNG giúp tổ chức thiện nguyện thành dự án có nhu cầu định lượng, xác minh độc lập, đóng góp theo từng phần và thu chi có ghi vết. AI phải sử dụng dữ liệu ứng dụng để hỗ trợ công việc thật. Không giữ tiền/xử lý thanh toán thay người dùng, không tự cho AI phê duyệt dự án; đây là phạm vi sản phẩm, không phải kết luận miễn trừ pháp lý.

| Thành viên | Module sở hữu | Trách nhiệm kiểm chứng và bảo vệ |
| :-- | :-- | :-- |
| Phạm Văn Bảo An — 23110001 | Backend Express/TypeScript, domain rules, DB, auth, RAG/model integration và telemetry | Unit/domain/API tests, quyền/trạng thái/transaction; vận hành DB/model; giải thích đường đi request và schema; phối hợp đánh giá AI |
| Võ Tuấn Khanh — 23110031 | Frontend Next.js, màn hình/form, HTTP/session, chat/sources/real-time UI, upload UI và dashboard | FE tests, trạng thái UI, responsive/accessibility và browser/E2E trong môi trường tách biệt; giải thích state/event/request; phối hợp đánh giá AI |

Hai thành viên cùng sở hữu kết quả của mỗi story, review chéo và tích hợp. Phân công theo tầng không loại yêu cầu cả hai hiểu hệ thống. Trong từng story, An làm BE và Khanh làm FE; các đầu việc `US-n.BE`/`US-n.FE` là task con, không tính thành user story riêng.

Nhóm **2 người phải có ít nhất 2 capability AI**. RAG có pipeline; người dùng xác nhận **chưa chọn capability thứ hai**. Bộ này có **12 story: 11 story cụ thể và US-11 là story đang mở**. US-11 phải được cụ thể hóa sau Q-01, không xem như đã chốt/đã hiện thực; xem [AI design](ai-design.md#7-năng-lực-ai-thứ-hai-chưa-quyết-định).

## 2. Quy ước và điều kiện hoàn thành chung

Khách xem dữ liệu công khai. Vai hệ thống là user/admin/verifier; điều phối/đóng góp/tài chính là vai theo từng dự án. Admin được backend tạo riêng, cấp verifier qua trang quản trị; admin/verifier chỉ dùng mật khẩu. Người xác minh chỉ duyệt khi không xung đột lợi ích. identityVerified độc lập role, dùng cho điều kiện tài chính. Người thụ hưởng là đối tượng dữ liệu cần bảo vệ, không bắt buộc có tài khoản.

| Trạng thái | Ý nghĩa |
| :-- | :-- |
| Có chức năng chính | Có source tương ứng, chưa suy ra tất cả AC/test/deploy đạt |
| Một phần | Một số AC có code, phần còn lại chưa đáp ứng |
| Chưa có | Chưa thấy hiện thực trong source |
| Chờ quyết định | Chưa chốt hành vi/thiết kế, chưa đủ cơ sở đóng story |
| Đã nghiệm thu | Tất cả AC có bằng chứng đúng môi trường, BE/FE tích hợp và hai thành viên review |

Mỗi story chỉ đóng khi: BE có validation/quyền và xử lý lỗi; FE gọi API thật, có loading/empty/error/success phù hợp; contract/source/test truy vết được; thử bình thường và ca sai quyền/đầu vào/trạng thái liên quan; ghi kết quả và giới hạn. Mock riêng hoặc test tầng riêng không thay bằng chứng tích hợp. Story chưa chọn quyết định phụ thuộc không được tự đánh dấu hoàn thành.

## 3. User stories và phân công BE/FE

12 story bao phủ các yêu cầu chức năng của đề. Thiết kế dưới đây tận dụng nghiệp vụ hiện có, không tự bổ sung nghiệp vụ ngoài đề và không khẳng định tất cả đã hoàn thành. Trạng thái/source/tests ở [traceability](traceability.md).

| US | Kết quả người dùng | An — Backend | Khanh — Frontend |
| :-- | :-- | :-- | :-- |
| US-1 | Đăng nhập và truy cập đúng quyền | OAuth2/JWT, ánh xạ user, admin/user, kiểm quyền | Login/callback/session, route/menu theo quyền, lỗi phiên |
| US-2 | Quản lý dự án và nhu cầu | CRUD, validation, transaction/audit, chính sách xóa | Form tạo/sửa, chi tiết, xác nhận xóa và lỗi field |
| US-3 | Tìm dự án phù hợp | Contract/filter/sort/pagination và dữ liệu công khai | Bộ lọc, URL state, sort, pagination, empty/loading |
| US-4 | Xác minh dự án có trách nhiệm | Queue, submit/review, checklist và tách quyền | Queue/detail/checklist, duyệt/trả lại và lỗi quyền |
| US-5 | Đóng góp đúng phần còn thiếu | Cam kết/transition, concurrency, tự xác nhận/audit | Nhu cầu, cam kết, bàn giao/xác nhận/hủy và phản hồi |
| US-6 | Theo dõi tiến độ, kết thúc dự án | Lifecycle, cập nhật, báo cáo, giải phóng cam kết | Feed, trạng thái, bắt đầu/chốt/hủy và form lý do |
| US-7 | Đối chiếu thu chi minh bạch | Funds/expenses, số dư, tách người ghi/duyệt | Ledger, form chi, duyệt/từ chối, lỗi số dư |
| US-8 | Tải và xem bằng chứng đúng quyền | Upload/storage/metadata, loại/kích thước/quyền | Chọn file, trạng thái tải, mở bằng chứng và lỗi |
| US-9 | Xem việc cá nhân và hồ sơ | Dashboard/profile DTO, dữ liệu theo quyền | Trang cá nhân, link công việc và hồ sơ công khai |
| US-10 | Hỏi trợ lý có nguồn, theo dõi phản hồi | RAG, prompt/guardrails, contract real-time đã chốt | Chat/history/sources, trạng thái nhận dần/lỗi/hủy |
| US-11 | Dùng năng lực AI thứ hai (chờ chọn) | Contract/model/tools/schema/eval sau Q-01 | Input/result/confirm/error UI sau Q-01 |
| US-12 | Quản trị mức dùng AI | Telemetry, tokens/cost/latency/status, admin API | Dashboard AI, chọn khoảng đo, error/refusal metrics |

<a id="us-1"></a>
### US-1 — Đăng nhập và sử dụng đúng quyền

Là người dùng, tôi muốn đăng nhập và chỉ truy cập chức năng được phép để bảo vệ tài khoản và dữ liệu của mình.

- A1: Google dành cho user thường; giữ email/password. Google trùng email tài khoản thường phải xác nhận mật khẩu cũ trước khi liên kết; tài khoản cũ chưa có mật khẩu bị chặn. Có JWT gắn phiên server, logout thu hồi phiên hiện tại, hết hạn đăng nhập lại, không refresh tự động.
- A2: Role hệ thống là user/admin/verifier; admin và verifier chỉ đăng nhập bằng mật khẩu, không Google/dev-login. Backend kiểm phiên/role/quyền theo dự án, không cho tự nâng quyền hoặc admin tự có quyền duyệt. identityVerified giữ riêng điều kiện xác minh danh tính/tài chính.
- A3: Người ngoài không đọc/sửa dữ liệu riêng; UI báo đúng khi hết phiên, hủy đăng nhập hoặc provider lỗi. Backend vẫn chặn request trực tiếp.
- A4: Secrets chỉ ở backend; production tắt dev-login. Email/password hiện có chưa thay yêu cầu OAuth2.
- A5: Backend tạo tài khoản admin riêng bằng công cụ nội bộ. Admin tạo/xem verifier trên trang quản trị, cấp email và mật khẩu. Verifier dùng ngay chức năng đúng quyền; tự chọn đổi mật khẩu bằng mật khẩu hiện tại/mới/xác nhận. Không có cờ must_change_password hoặc phiên hạn chế; đổi thành công thu hồi mọi phiên cũ và cấp phiên mới. Không thêm reset/recovery, sửa/xóa tài khoản hoặc gửi email.
- **BE (An):** Auth integration, user/role contract, JWT/middleware; test token sai/hết hạn, callback và quyền.
- **FE (Khanh):** Login/callback/session, hiển thị menu và trang theo quyền, giữ luồng quay lại an toàn; test redirect/session và browser login.
- **Nghiệm thu chung:** Login → vào màn đúng vai → gọi API bảo vệ → logout; thử người sai quyền gọi trực tiếp API.

<a id="us-2"></a>
### US-2 — Quản lý dự án và nhu cầu định lượng

Là người điều phối, tôi muốn tạo, xem, sửa và xóa dữ liệu dự án theo quyền để khai báo nhu cầu chính xác.

- A1: Tạo bản nháp bền vững với tên, mục tiêu, nhóm thụ hưởng, thời gian, địa điểm và ít nhất một nhu cầu có loại/đơn vị/số lượng nguyên dương.
- A2: Nhu cầu tiền bắt buộc người phụ trách tài chính đã xác minh, khác điều phối (BR-002/BR-003); actor do backend lấy từ phiên, ghi dữ liệu/audit nhất quán.
- A3: Chỉ người có quyền sửa ở trạng thái cho phép; input sai có lỗi rõ và FE giữ nội dung đang nhập.
- A4: Có xóa dữ liệu chính theo Q-03 được chốt, xác nhận trước xóa, bảo vệ dữ liệu liên quan/audit; hủy dự án không tự tính là xóa. Không tự chọn xóa cứng/mềm ở bộ US này.
- **BE (An):** Project/needs CRUD, Zod + domain validation, transaction và policy xóa; test field/quyền/trạng thái/rollback.
- **FE (Khanh):** Form tạo/sửa, nhu cầu động, chi tiết, lỗi field và dialog xác nhận xóa; test valid/invalid/submit failure.
- **Nghiệm thu chung:** Tạo → mở lại/sửa → đọc dữ liệu đã lưu; xóa theo policy và thử sai quyền, dữ liệu liên quan.

<a id="us-3"></a>
### US-3 — Tìm, lọc, sắp xếp và phân trang dự án

Là người tìm hoạt động, tôi muốn tìm được dự án phù hợp mà không phải duyệt toàn bộ danh sách.

- A1: Tìm tên/địa điểm/nhóm thụ hưởng; lọc trạng thái/loại nhu cầu; sort đúng nhãn và có pagination.
- A2: Tổng số/trang và thứ tự nhất quán với bộ lọc; đổi điều kiện đưa về trang phù hợp, trang/input không hợp lệ được xử lý.
- A3: Chỉ trả dự án công khai cho danh sách công khai; FE có loading/error/empty, giữ bộ lọc khi quay lại/chia sẻ URL.
- **BE (An):** Chốt contract query/page/total với FE, lọc/sort/phân trang dữ liệu nguồn và validate query; test kết hợp điều kiện/thứ tự/quyền.
- **FE (Khanh):** Search/filter/sort/pager, URL state và empty/error; test đổi điều kiện, quay lại và trang không có kết quả.
- **Nghiệm thu chung:** Cùng điều kiện cho cùng tập kết quả, không trùng/mất dòng giữa các trang trong snapshot kiểm thử.

<a id="us-4"></a>
### US-4 — Xác minh trước khi công khai

Là người xác minh, tôi muốn xem hồ sơ và checklist để duyệt hoặc trả lại dự án có căn cứ.

- A1: Điều phối gửi bản nháp hợp lệ sang pending_verification; assessment, trạng thái và audit được lưu nhất quán.
- A2: Chỉ người xác minh không xung đột lợi ích được duyệt; duyệt thành published, trả lại draft có lý do.
- A3: UI hiển thị checklist và nguồn đánh giá; quy tắc hiện tại không được gắn nhãn LLM. Người có thẩm quyền quyết định cuối.
- **BE (An):** Queue/submit/review, rule assessment, tách quyền và audit; test gửi lại/trạng thái/sai quyền/xung đột.
- **FE (Khanh):** Hàng chờ, hồ sơ/checklist, approve/reject, form lý do và refresh trạng thái; test navigation/role/error.
- **Nghiệm thu chung:** Điều phối gửi → verifier xem/duyệt hoặc trả lại → public list phản ánh đúng; người trong dự án không tự duyệt.

<a id="us-5"></a>
### US-5 — Cam kết, bàn giao và xác nhận đóng góp

Là người đóng góp, tôi muốn nhận đúng phần nhu cầu mình đáp ứng được và theo dõi tới khi bàn giao được xác nhận.

- A1: Hiện mục tiêu/cam kết/bàn giao/xác nhận; không tính cam kết là đã nhận, không nhận số lượng sai/vượt phần còn thiếu kể cả đồng thời.
- A2: Chuyển trạng thái đúng luật, chặn tự xác nhận và tách quyền với tiền; hủy khi được phép, ghi audit/note liên quan.
- A3: Chặn tự cam kết không có người độc lập xác nhận; sai quyền/trạng thái phản hồi rõ, FE cập nhật số lượng sau thành công.
- **BE (An):** Commit/transition, khóa/transaction, tính totals, quyền và audit; test bất biến và request cạnh tranh.
- **FE (Khanh):** Needs/commit dialog/contribution table, nút theo vai, bàn giao/xác nhận/hủy và lỗi vượt mức; test tương tác và UI refresh.
- **Nghiệm thu chung:** Hai vai hoàn thành cam kết → bàn giao → xác nhận, thử tự xác nhận và vượt mức.

<a id="us-6"></a>
### US-6 — Theo dõi tiến độ và kết thúc dự án

Là người tham gia, tôi muốn xem cập nhật và trạng thái kết thúc để biết hoạt động đang tiến triển thế nào.

- A1: Chỉ nhóm có quyền đăng cập nhật; điều phối bắt đầu/hoàn thành/hủy theo trạng thái hợp lệ.
- A2: Hoàn thành có báo cáo và xử lý đóng góp/chi còn treo; hủy có lý do, giải phóng cam kết chưa bàn giao, giữ ghi vết phần đã trao.
- A3: Feed, trạng thái, báo cáo/lý do và lỗi được hiển thị đúng, không mất form khi thao tác thất bại.
- **BE (An):** Updates/lifecycle/report, validation/quyền, cascade nghiệp vụ và audit; test chi/đóng góp còn treo và hủy.
- **FE (Khanh):** Feed, badge/sidebar, form cập nhật/báo cáo/lý do, xác nhận thao tác; test trạng thái và quyền.
- **Nghiệm thu chung:** Đăng tin → bắt đầu → chốt/hủy theo điều kiện, mở lại thấy dữ liệu bền vững. Nếu Q-05 chọn real-time tiến độ, bổ sung AC live ở story này.

<a id="us-7"></a>
### US-7 — Theo dõi và đối chiếu thu chi

Là thành viên dự án, tôi muốn xem sổ thu chi và bằng chứng để đối chiếu việc dùng nguồn lực.

- A1: Tài chính ghi chi, điều phối khác người ghi duyệt/từ chối; từ chối có lý do.
- A2: Số dư tính từ khoản hợp lệ, chi chờ duyệt giữ chỗ, không chi vượt khả dụng; có audit.
- A3: FE hiển thị ledger/trạng thái chi/lỗi, cập nhật sau duyệt; liên kết bằng chứng đúng quyền. Upload file là US-8, nhập URL chưa đáp ứng upload.
- **BE (An):** Expense/ledger rules, transaction, constraints và review API; test vượt quỹ/tự duyệt/rejection/balance.
- **FE (Khanh):** Ledger, form chi, nút review và lý do; tích hợp chọn bằng chứng US-8, test số dư/error/refresh.
- **Nghiệm thu chung:** Tiền được xác nhận → ghi chi → người khác duyệt/từ chối → ledger phản ánh đúng.

<a id="us-8"></a>
### US-8 — Tải và xem bằng chứng theo quyền

Là người có quyền, tôi muốn tải file và gắn vào nghiệp vụ để lưu bằng chứng hoạt động.

- A1: Upload file thật, lưu metadata và liên kết nghiệp vụ; Q-04 chốt storage, loại/kích thước và quyền, không tự giả định bucket/provider.
- A2: Backend kiểm quyền/loại/kích thước và truy cập file riêng; upload thất bại không tạo liên kết lỗi hoặc báo thành công giả.
- A3: FE chọn file, hiện đang tải/thành công/lỗi và mở bằng chứng được phép; dùng file làm input AI khi phù hợp lựa chọn Q-01.
- **BE (An):** Upload/storage adapter/metadata/access control; test file hợp lệ/sai loại/quá lớn/sai quyền/lỗi lưu.
- **FE (Khanh):** File input, client validation, tiến trình nếu API hỗ trợ, retry có kiểm soát và preview/link; test failure/permission và liên kết vào form nghiệp vụ.
- **Nghiệm thu chung:** Upload → lưu/gắn → mở lại file từ nghiệp vụ; người ngoài không mở được file riêng.

<a id="us-9"></a>
### US-9 — Xem công việc cá nhân và hồ sơ công khai

Là thành viên, tôi muốn thấy việc cần làm theo vai và hồ sơ đóng góp để theo dõi trách nhiệm.

- A1: Dashboard yêu cầu đăng nhập và trả việc chính người đó có quyền thực hiện; hồ sơ công khai chỉ tổng hợp dữ kiện được phép.
- A2: FE có link tới công việc, nhóm dự án/đóng góp và loading/empty/error; không nhầm với admin AI analytics.
- **BE (An):** Dashboard/profile DTO, quyền và phép tổng hợp; test source data/private/public.
- **FE (Khanh):** Trang /me và profile, link trực tiếp tới đúng tab/việc, UI states; test routing và dữ liệu theo vai.
- **Nghiệm thu chung:** Đổi tài khoản → công việc thay đổi đúng người; mở profile công khai không lộ dữ liệu riêng.

<a id="us-10"></a>
### US-10 — Hỏi đáp RAG có nguồn và theo dõi phản hồi

Là người sử dụng, tôi muốn hỏi dữ liệu GomNang, xem phản hồi rõ ràng và mở nguồn để kiểm tra.

- A1: Chunking, embeddings, vector search trên nguồn được phép; nội dung trả lời được nguồn hỗ trợ, thiếu dữ kiện thì nói chưa đủ, không bịa.
- A2: Không đưa bản nháp/nguồn riêng vào context công khai; đồng bộ thay đổi nguồn, mọi lời gọi model qua backend; prompt/version/guardrails/fallback đáp ứng AI-01…AI-06.
- A3: Đề bắt buộc ít nhất một flow real-time. Đề xuất ghép streaming AI vào story này; Q-05 vẫn chờ chốt flow/transport. Nếu nhóm chọn live cập nhật tiến độ US-6 thay thế, phải truy vết và nghiệm thu flow đó, không coi loading/polling thường là đã đủ.
- A4: Chat hiện history/sources, trạng thái nhận phản hồi, lỗi/timeout/hủy phù hợp contract; không dùng citation đúng số làm chứng minh nội dung đúng.
- **BE (An):** RAG/provider/prompt/quyền/telemetry, contract real-time theo Q-05, citation/refusal và eval; sửa test embeddings rồi kiểm guardrails.
- **FE (Khanh):** Chat/history/model selector/sources, nhận dần nếu chọn stream, kết thúc/hủy/lỗi và thông báo dữ liệu gửi provider; test chat UI/proxy/lỗi giữa luồng.
- **Nghiệm thu chung:** Câu hỏi có dữ kiện → trả lời và mở nguồn; ngoài phạm vi/injection/AI down xử lý đúng; có demo real-time đã chọn và bộ eval thật.

<a id="us-11"></a>
### US-11 — Sử dụng năng lực AI thứ hai (chờ quyết định)

Là người sử dụng, tôi muốn AI hỗ trợ thêm một công việc thật ngoài hỏi đáp RAG.

- A1: Q-01 phải chọn capability khác RAG, xác định tác nhân/giá trị/input/output và cụ thể hóa story trước triển khai. Nhóm đã xác nhận chưa chọn, không mặc định Structured output.
- A2: Nếu tools: LLM gọi ≥3 tools trên dữ liệu thật, backend kiểm quyền và người dùng xác nhận trước mọi thao tác ghi. Nếu structured output: JSON do LLM sinh, validate schema và app dùng trong logic.
- A3: Nếu multimodal: AI xử lý ảnh/PDF/voice, lưu và dùng kết quả. Nếu multi-agent: ≥2 vai, hand-off và log trong sản phẩm. Chỉ cần chọn đủ capability theo đề, không phải làm tất cả phương án.
- A4: Sau lựa chọn phải có AC lỗi/quyền/fallback, contract, eval và evidence cụ thể; rule checklist/upload thuần/agent hỗ trợ viết code không tự tính là capability tương ứng.
- **BE (An):** Sau Q-01, thiết kế/hiện thực model/schema/tools/dữ liệu và tests/eval theo phương án.
- **FE (Khanh):** Sau Q-01, input/result/confirmation/error UI và flow test đúng contract; không dựng UI rỗng để tính hoàn thành.
- **Nghiệm thu chung:** Chưa thể đóng story hoặc chốt acceptance chi tiết khi Q-01 chưa có đáp án. Review chéo khả năng giải thích và live change sau hiện thực.

<a id="us-12"></a>
### US-12 — Quản trị mức sử dụng AI

Là admin, tôi muốn xem request, độ trễ, lỗi/từ chối và chi phí AI để theo dõi vận hành.

- A1: Log mỗi request có requestId/model/prompt version/tools/tokens/latency/status; không ghi secret/PII không cần; phân biệt rule/cache reply với LLM call.
- A2: Admin dashboard có số request, lỗi/từ chối, chi phí và latency trung bình theo khoảng đo, công thức/mẫu số/đơn vị rõ; tính embeddings nếu phát sinh chi phí.
- A3: API/UI chặn người không có quyền, có empty/error; dùng số liệu thật, local không được gán chi phí vận hành bịa.
- **BE (An):** Instrumentation model/embedding, storage và aggregate API theo quyền; test công thức, zero data, failure/refusal và admin access.
- **FE (Khanh):** Dashboard/filter khoảng đo, số liệu/đơn vị, loading/empty/error, route guard và nguồn giải thích công thức; test auth/filter/render.
- **Nghiệm thu chung:** Gọi AI thật → record → admin dashboard phản ánh; thử lỗi/từ chối và người không phải admin.

## 4. Yêu cầu chất lượng AI bắt buộc

| ID | Yêu cầu nghiệm thu | Hiện trạng cần khắc phục |
| :-- | :-- | :-- |
| AI-01 | Giải thích model theo chất lượng, chi phí, tốc độ, riêng tư, kèm cấu hình thực tế | Có adapter/cấu hình; chưa có so sánh định lượng đầy đủ |
| AI-02 | Prompt ở file/config được version trong Git | Prompt chat và hướng dẫn embedding hiện nằm trong TypeScript |
| AI-03 | Demo đủ injection, ngoài phạm vi, phản hồi sai/lỗi (timeout/invalid JSON/empty theo luồng áp dụng) | Có một số phòng vệ và xử lý lỗi; cần kiểm chứng |
| AI-04 | Ít nhất 20 ca có expected result, gồm thường/biên/từ chối; chạy trước/sau ít nhất một cải tiến | Chưa có bộ eval và báo cáo đáp ứng đề; unit/API test không tự thay thế |
| AI-05 | Log và tổng hợp tokens, latency, chi phí; truy vết phiên bản prompt và tools | HTTP log mới có duration/status, chưa đủ telemetry AI |
| AI-06 | Ngắt dịch vụ AI, chức năng non-AI vẫn dùng được và có thông báo rõ ràng | Kiến trúc tách luồng; cần demo sự cố |

## 5. Yêu cầu phi chức năng

| ID | Yêu cầu nghiệm thu |
| :-- | :-- |
| NFR-01 | Responsive desktop/mobile; form và chat có loading/empty/error/sources phù hợp; kiểm ở kích thước được ghi lại |
| NFR-02 | Dữ liệu nghiệp vụ tồn tại sau restart; môi trường RAM chỉ dùng cho test. Không reset dữ liệu thật để demo |
| NFR-03 | Secrets chỉ trong cấu hình riêng; kiểm input tại API, kiểm quyền tại backend; kiểm repo và lịch sử Git trước nộp |
| NFR-04 | Công bố dữ liệu gửi LLM, giới hạn dữ liệu cá nhân trong nội dung tự do, lịch sử chat, nguồn và file; có test |
| NFR-05 | Unit test logic cốt lõi, test API/quyền và evaluation AI; ghi môi trường và kết quả, không dùng build thay E2E |
| NFR-06 | Demo chạy bản deploy hoặc Docker Compose; hỗ trợ pgvector và endpoint model/embeddings truy cập được từ backend |
| NFR-07 | Mọi lời gọi LLM qua backend; API key không xuất hiện ở frontend hoặc lịch sử Git |
| NFR-08 | Chứng minh ít nhất một tính năng frontend hiện đại; hiện có ứng viên SSR/SSG, cần trình bày đúng trang và dữ liệu thực sự render |

## 6. Hồ sơ và bảo vệ

| ID | Đầu ra bắt buộc |
| :-- | :-- |
| DOC-01 | 8–15 stories có AC và bảng Story → API/component → source → test |
| DOC-02 | Sơ đồ FE/BE/DB/vector store/provider và luồng AI; ít nhất 3 ADR, ít nhất 1 về AI |
| DOC-03 | `AI_USAGE.md` có tool, key prompt, phần sinh, kiểm tra/chỉnh sửa và ít nhất 2 trường hợp AI sai |
| DOC-04 | Ownership từng module, commit từ mỗi thành viên; giải thích thiếu commit nếu có |
| DOC-05 | README có cách chạy Docker/deployed link, biến môi trường không kèm secret và tài khoản test |
| DOC-06 | PDF 10–20 trang: yêu cầu, traceability, kiến trúc, ADR, AI design, eval, cost/latency, giới hạn |
| DOC-07 | Slide tối đa 15 trang; video dự phòng 3–5 phút |
| DOC-08 | Demo 8 phút, live change 10 phút, Q&A cá nhân 12 phút; mỗi người giải thích module mình và phần được hỏi chéo |

Theo đề: Requirements & Design 15%; Technical Implementation 15%; AI Features 25%; AI Quality & Safety 10%; Demo & Presentation 10%; Individual Understanding 20%; UI/UX 5%. Điểm chung nhóm là 80%, phần hiểu biết cá nhân 20%. Không giải thích được module hoặc trace story của mình thì điểm cuối cá nhân bị chặn tối đa 50% điểm nhóm theo understanding gate; thiếu/không đầy đủ AI_USAGE trừ 10% nhóm, secrets trong lịch sử Git trừ 5%. Mỗi thành viên phải có mặt; vắng bảo vệ không có lý do hợp lệ nhận 0 phần cá nhân. Bộ doc không tự chứng minh sản phẩm đạt các tiêu chí này.

## 7. Quyết định còn mở

| ID | Cần quyết định | Ảnh hưởng |
| :-- | :-- | :-- |
| Q-01 | Năng lực AI thứ hai | US-11, schema/tool/file, eval và demo; BE An, FE Khanh |
| Q-02 — Đã chốt | Google cho user thường; liên kết cần mật khẩu cũ; role user/admin/verifier, identityVerified riêng; admin bootstrap/cấp verifier, đổi mật khẩu tự nguyện; schema đã cập nhật Supabase | US-1; [hướng dẫn](us1-local.md) |
| Q-03 | Chính sách xóa dự án | US-2, dữ liệu liên quan và audit |
| Q-04 | Storage, loại/kích thước file và quyền tải/xem | US-8, privacy |
| Q-05 | Luồng real-time và transport | US-10 hoặc cập nhật tiến độ US-6, proxy/deploy |
| Q-06 | Môi trường demo, model thật và cấu hình embeddings | AI-01, NFR-06 |
| Q-07 | Giờ nộp và lịch bảo vệ riêng ngày 27/10 | Đóng gói tài liệu và diễn tập |

Không xem lựa chọn đề xuất của AI là quyết định đã được nhóm thông qua. Thứ tự công việc và điều kiện hoàn thành xem [backlog](backlog.md).
