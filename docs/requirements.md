# Yêu cầu cuối kỳ — GOM NẮNG

Cập nhật **27/10/2026**. Hạn cuối nhóm cung cấp: **27/10/2026**, giờ nộp/lịch bảo vệ riêng chưa xác nhận. Nguồn: [Final Project Assignment: Guidelines, 2026–2027](https://docs.google.com/document/d/1zxaqjKBBGjibOYuhw5xW6hEU1NbUayrr/edit).

## 1. Mục tiêu và tổ chức nhóm

GOM NẮNG giúp tổ chức thiện nguyện thành dự án có nhu cầu định lượng, xác minh độc lập, đóng góp theo từng phần và thu chi có ghi vết. AI phải sử dụng dữ liệu ứng dụng để hỗ trợ công việc thật. Không giữ tiền/xử lý thanh toán thay người dùng, không tự cho AI phê duyệt dự án; đây là phạm vi sản phẩm, không phải kết luận miễn trừ pháp lý.

| Thành viên | Module sở hữu | Trách nhiệm kiểm chứng và bảo vệ |
| :-- | :-- | :-- |
| Phạm Văn Bảo An — 23110001 | Backend Express/TypeScript, domain rules, DB, auth, RAG/model integration và telemetry | Unit/domain/API tests, quyền/trạng thái/transaction; vận hành DB/model; giải thích đường đi request và schema; phối hợp đánh giá AI |
| Võ Tuấn Khanh — 23110031 | Frontend Next.js, màn hình/form, HTTP/session, chat/sources/real-time UI, upload UI và dashboard | FE tests, trạng thái UI, responsive/accessibility và browser/E2E trong môi trường tách biệt; giải thích state/event/request; phối hợp đánh giá AI |

Hai thành viên cùng sở hữu kết quả của mỗi story, review chéo và tích hợp. Phân công theo tầng không loại yêu cầu cả hai hiểu hệ thống. Phân công mặc định: An làm BE và Khanh làm FE; riêng US-8 do Khanh hiện thực BE/FE theo phân công đã chốt, An review tích hợp; các đầu việc `US-n.BE`/`US-n.FE` là task con, không tính thành user story riêng.

Nhóm **2 người phải có ít nhất 2 capability AI**. Capability 1 là RAG (US-7). **Capability 2 đã chốt ngày 25/10/2026: C — Structured output** cho người gác cổng (US-8, Khanh phụ trách); xem [US-8](#us-8) và [bằng chứng](evidence/us8-verification.md). Bộ này có **10 story**.

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

## 3. User stories và acceptance criteria

Bộ này gồm **10 user stories**, nằm trong giới hạn 8–15 của đề §5.1. Mỗi story nêu vai trò, nhu cầu, giá trị và tiêu chí quan sát được. Story là yêu cầu, không phải tuyên bố đã nghiệm thu; source, test và bằng chứng còn thiếu được quản lý trong [traceability](traceability.md).

Mã tiêu chí thống nhất là `US-n.Am`, ví dụ `US-7.A4`. Trong evidence cũ, `A4` ở ngữ cảnh US-7 vẫn chỉ cùng tiêu chí này; giữ nguyên số story và A1…An để không làm mất truy vết. Các mã TC trong traceability là bí danh tài liệu trỏ tới test đã có, không phải tên test mới được tạo.

| Story | Giá trị người dùng | Đối chiếu đề |
| :-- | :-- | :-- |
| [US-1](#us-1) | Đăng nhập và sử dụng đúng quyền | §3, §6, §7: OAuth2/JWT/RBAC |
| [US-2](#us-2) | Quản lý dự án và nhu cầu | §3, §6: CRUD dữ liệu chính |
| [US-3](#us-3) | Tìm dự án phù hợp | §6: search/filter/sort/pagination |
| [US-4](#us-4) | Xác minh trước khi công khai | §1–2: nghiệp vụ thực tế, §7: quyền |
| [US-5](#us-5) | Lưu và đọc chứng từ theo quyền | §6: upload, §7: persistence/privacy |
| [US-6](#us-6) | Theo dõi công việc và hồ sơ | §1–2: giá trị người dùng, §7: dữ liệu theo quyền |
| [US-7](#us-7) | Hỏi đáp có nguồn và giới hạn AI | §4.1-A: RAG, §4.2: chất lượng AI |
| [US-8](#us-8) | Nhờ AI hỗ trợ soát hồ sơ | §4.1-C: Structured output, §4.2 |
| [US-9](#us-9) | Theo dõi mức dùng AI | §4.2, §6: logging/cost/admin dashboard |
| [US-10](#us-10) | Theo dõi đóng góp không tải lại trang | §3, §6: real-time bằng SSE |

<a id="us-1"></a>
### US-1 — Đăng nhập và sử dụng đúng quyền

Là **người dùng**, tôi muốn **đăng nhập bằng phương thức được hỗ trợ và truy cập đúng quyền**, để **bảo vệ tài khoản và dữ liệu của mình**.

| Mã tiêu chí | Điều kiện / thao tác | Kết quả mong đợi |
| :-- | :-- | :-- |
| US-1.A1 | Tài khoản thường đăng nhập Google hoặc email/password. | Google chỉ tạo/liên kết role user; trùng email tài khoản cũ phải chứng minh mật khẩu trước khi liên kết, tài khoản cũ không có mật khẩu không được tự liên kết. JWT gắn phiên server; logout thu hồi phiên hiện tại, token hết hạn phải đăng nhập lại, không refresh tự động. |
| US-1.A2 | Admin, verifier hoặc user gọi chức năng được bảo vệ. | Admin/verifier chỉ đăng nhập mật khẩu. Backend lấy role và phiên hiện tại từ dữ liệu tin cậy, không nhận quyền do client tự khai; admin không tự có quyền verifier. identityVerified độc lập role. |
| US-1.A3 | Người ngoài truy cập dữ liệu riêng; phiên hết hạn; người dùng hủy Google hoặc provider lỗi. | API chặn đọc/sửa sai quyền; UI báo lỗi/phiên hết hạn/hủy đăng nhập phù hợp, không chỉ ẩn nút để bảo vệ dữ liệu. |
| US-1.A4 | Ứng dụng chạy production hoặc được build cho frontend. | Dev-login bị tắt trong production; secret OAuth/JWT chỉ cấu hình ở backend, không đưa vào bundle hoặc Git. Audit lịch sử secrets được ghi riêng, không suy từ unit test. |
| US-1.A5 | Admin tạo verifier; verifier muốn đổi mật khẩu. | Admin được bootstrap bằng công cụ nội bộ; admin tạo/xem verifier, verifier dùng ngay. Đổi mật khẩu cần mật khẩu hiện tại và xác nhận mật khẩu mới; thành công thu hồi phiên cũ và cấp phiên mới. Không có reset/recovery, gửi email hoặc bắt buộc đổi mật khẩu. |

**Phân công:** An — BE/domain/API và kiểm thử tầng backend; Khanh — FE/session/UI và kiểm thử frontend/browser. Hai thành viên cùng kiểm tích hợp và nghiệm thu.

<a id="us-2"></a>
### US-2 — Quản lý dự án và nhu cầu định lượng

Là **người điều phối**, tôi muốn **tạo, xem, sửa và xóa bản nháp dự án cùng các nhu cầu**, để **công bố nhu cầu chính xác trước khi gửi xác minh**.

| Mã tiêu chí | Điều kiện / thao tác | Kết quả mong đợi |
| :-- | :-- | :-- |
| US-2.A1 | Người dùng đã đăng nhập gửi hồ sơ dự án hợp lệ. | Tạo bản nháp có tên, mục tiêu, nhóm thụ hưởng, địa điểm, thời gian và ít nhất một nhu cầu với loại/đơn vị/số lượng nguyên dương; mở lại vẫn có dữ liệu đã lưu. |
| US-2.A2 | Dự án có nhu cầu tiền hoặc client tự gửi coordinatorId. | Cần người phụ trách tài chính đã xác minh, khác điều phối (BR-002/003); actor lấy từ phiên. Project, nhu cầu và audit được ghi nhất quán trong transaction. |
| US-2.A3 | Sửa dự án hoặc gửi dữ liệu không hợp lệ. | Chỉ điều phối được sửa bản nháp; backend chặn sai quyền/trạng thái, trả lỗi đầu vào; FE giữ dữ liệu form để sửa và gửi lại. |
| US-2.A4 | Điều phối xác nhận xóa bản nháp; người khác hoặc dự án sai trạng thái yêu cầu xóa. | Xóa mềm bằng deleted_at và audit draft → deleted trong cùng transaction; bản đã xóa không xuất hiện ở các đường đọc/sửa và Việc của tôi. UI hỏi xác nhận. Dự án không phải bản nháp bị chặn, dự án công khai dùng Hủy; không có khôi phục. |

**Phân công:** An — BE/domain/API và kiểm thử tầng backend; Khanh — FE/session/UI và kiểm thử frontend/browser. Hai thành viên cùng kiểm tích hợp và nghiệm thu.

<a id="us-3"></a>
### US-3 — Tìm, lọc, sắp xếp và phân trang dự án

Là **người tìm hoạt động thiện nguyện**, tôi muốn **tìm và duyệt các dự án theo điều kiện phù hợp**, để **chọn hoạt động mà không phải đọc toàn bộ danh sách**.

| Mã tiêu chí | Điều kiện / thao tác | Kết quả mong đợi |
| :-- | :-- | :-- |
| US-3.A1 | Nhập từ khóa, trạng thái, loại nhu cầu hoặc cách sắp xếp. | Tìm tên/địa điểm/nhóm thụ hưởng không phân biệt dấu và hoa thường; lọc kết hợp; sort soon/needed/newest đúng quy tắc. Chỉ danh sách công khai được trả cho khách. |
| US-3.A2 | Duyệt trang hoặc gửi query sai. | API trả items/total/page/pageSize/totalPages/stats; mặc định 9, tối đa 48 dự án/trang; trang vượt giới hạn trả trang cuối; query sai trả 400. Trong cùng snapshot, các trang không trùng/mất dòng; stats tổng không thay đổi theo filter/page theo contract hiện tại. |
| US-3.A3 | Đổi điều kiện, tải lại URL, quay lại danh sách hoặc không có kết quả. | FE giữ điều kiện trong URL, đưa trang về phù hợp khi đổi điều kiện, có loading/error/empty và thao tác xóa bộ lọc; URL tái hiện cùng điều kiện. |

**Phân công:** An — BE/domain/API và kiểm thử tầng backend; Khanh — FE/session/UI và kiểm thử frontend/browser. Hai thành viên cùng kiểm tích hợp và nghiệm thu.

<a id="us-4"></a>
### US-4 — Xác minh trước khi công khai

Là **người xác minh độc lập**, tôi muốn **xem hồ sơ và đánh giá để duyệt hoặc trả lại dự án**, để **giữ việc công khai có căn cứ và trách nhiệm**.

| Mã tiêu chí | Điều kiện / thao tác | Kết quả mong đợi |
| :-- | :-- | :-- |
| US-4.A1 | Điều phối gửi bản nháp hợp lệ để xác minh. | Dự án chuyển pending_verification; đánh giá theo quy tắc, trạng thái và audit được lưu nhất quán; xuất hiện trong hàng chờ của người có quyền. |
| US-4.A2 | Verifier không xung đột lợi ích duyệt hoặc trả lại. | Duyệt chuyển published; trả lại phải có lý do và về draft. Điều phối thấy lý do, sửa rồi gửi lại được. Sai quyền/trạng thái hoặc người thuộc dự án tự duyệt bị chặn. |
| US-4.A3 | Người có quyền xem checklist và ra quyết định. | UI phân biệt đánh giá quy tắc với đánh giá có AI, hiển thị kết quả/lý do và trạng thái sau thao tác; người xác minh quyết định cuối, AI không tự duyệt dự án. |

**Phân công:** An — BE/domain/API và kiểm thử tầng backend; Khanh — FE/session/UI và kiểm thử frontend/browser. Hai thành viên cùng kiểm tích hợp và nghiệm thu.

<a id="us-5"></a>
### US-5 — Tải và xem chứng từ chi theo quyền

Là **người phụ trách tài chính**, tôi muốn **tải chứng từ và gắn vào khoản chi của dự án**, để **lưu bằng chứng mà người có quyền có thể kiểm tra lại**.

| Mã tiêu chí | Điều kiện / thao tác | Kết quả mong đợi |
| :-- | :-- | :-- |
| US-5.A1 | Tải file hợp lệ rồi ghi khoản chi. | Lưu bytes và metadata trong bảng files, nhận JPEG/PNG/WebP/PDF tối đa 3 × 1024 × 1024 byte; gắn đúng file của người tải/dự án qua receiptFileId. Mở lại chứng từ từ nghiệp vụ đọc được nội dung đã lưu. |
| US-5.A2 | File rỗng, sai loại/quá lớn, sai quyền hoặc lỗi lưu; người khác đọc file. | Backend kiểm byte đầu và kích thước, chặn upload sai quyền; không báo lưu thành công khi thất bại. File chưa gắn chỉ người tải xem; khoản chi chưa duyệt chỉ nhóm có quyền, khoản đã duyệt của dự án công khai thì công khai. Không có quyền xem trả 404. |
| US-5.A3 | Chọn ảnh/PDF, chờ tải hoặc mở chứng từ trên FE. | UI có chọn file, đang tải/thành công/lỗi và preview; ảnh trên 3 MiB được thu nhỏ trước gửi, PDF quá giới hạn bị từ chối. AI chưa đọc file; đây là upload chứng từ, không tính capability multimodal. |

**Phân công:** An — BE/domain/API và kiểm thử tầng backend; Khanh — FE/session/UI và kiểm thử frontend/browser. Hai thành viên cùng kiểm tích hợp và nghiệm thu.

<a id="us-6"></a>
### US-6 — Xem công việc cá nhân và hồ sơ công khai

Là **thành viên**, tôi muốn **xem việc cần làm theo vai và hồ sơ đóng góp được phép công khai**, để **theo dõi trách nhiệm và hoạt động của mình**.

| Mã tiêu chí | Điều kiện / thao tác | Kết quả mong đợi |
| :-- | :-- | :-- |
| US-6.A1 | Thành viên mở Việc của tôi hoặc khách mở hồ sơ công khai. | Dashboard yêu cầu đăng nhập, chỉ trả công việc/dự án/đóng góp của đúng người theo quyền. Hồ sơ công khai chỉ tổng hợp dữ kiện được phép, không có email/số điện thoại tài khoản. |
| US-6.A2 | Đổi tài khoản hoặc mở công việc từ dashboard. | Dữ liệu thay đổi đúng người; link dẫn tới dự án/tab công việc tương ứng. UI có loading/empty/error; không giữ dữ liệu riêng của phiên cũ và không nhầm với admin AI analytics. |

**Phân công:** An — BE/domain/API và kiểm thử tầng backend; Khanh — FE/session/UI và kiểm thử frontend/browser. Hai thành viên cùng kiểm tích hợp và nghiệm thu.

<a id="us-7"></a>
### US-7 — Hỏi đáp RAG có nguồn

Là **người sử dụng GomNang**, tôi muốn **hỏi về hướng dẫn và dự án công khai kèm nguồn kiểm tra**, để **tìm thông tin có căn cứ và nhận biết giới hạn của AI**.

| Mã tiêu chí | Điều kiện / thao tác | Kết quả mong đợi |
| :-- | :-- | :-- |
| US-7.A1 | Hỏi nội dung có dữ kiện trong nguồn. | Pipeline có chunking, embedding và pgvector search; câu trả lời answered phải có nguồn mở được và nội dung được nguồn hỗ trợ. Thiếu dữ kiện phải từ chối, không bịa; citation hợp lệ về số chưa chứng minh đúng ngữ nghĩa. |
| US-7.A2 | Lập chỉ mục thủ công hoặc truy xuất nguồn dự án. | Chỉ dùng hướng dẫn và trường dự án công khai; không join tài khoản, không lấy nháp/token/key. Cho phép liên hệ cố ý công khai. Index được cập nhật bằng lệnh, có thể cũ; SQL lọc trạng thái công khai hiện tại trước top-K; mọi lời gọi embedding/model đi qua backend. |
| US-7.A3 | Backend xử lý lượt chat qua pipeline. | Prompt/instruction ở file hoặc config có version trong Git; metadata ghi promptVersion và queryPromptVersion. Không mặc định lưu nguyên câu hỏi/history/output/nguồn; logging best-effort và giới hạn được công bố ở US-9. |
| US-7.A4 | Input/history hoặc nguồn có prompt injection trực tiếp/gián tiếp. | Không đổi vai/lộ prompt/cấu hình/secret hoặc làm theo chỉ dẫn cài trong nguồn. Lượt trộn yêu cầu hợp lệ với injection bị từ chối toàn lượt; history giả role system/developer bị chặn 400. Có kiểm nguồn thử được kiểm soát cho injection gián tiếp, không chỉ câu hỏi UI. |
| US-7.A5 | Hỏi ngoài phạm vi hoặc thông tin nguồn không có, kể cả sau history hợp lệ. | Trả refused, giải thích ngoài phạm vi/chưa đủ dữ kiện; không trả lời từ kiến thức chung hoặc suy ra số thực nhận/danh tính từ mục tiêu dự án. |
| US-7.A6 | Model/embedding timeout, lỗi kết nối, output rỗng/sai JSON/sai citation. | Không công bố output chưa kiểm; trả lỗi rõ và ghi failed khi pipeline ghi nhận được; UI giữ câu hỏi, cho sửa/thử lại thủ công, không retry mù. |
| US-7.A7 | Ollama ngừng hoạt động. | Chat báo AI không khả dụng; dự án, đóng góp, thu chi và xác minh thủ công vẫn sử dụng được; mở lại model có thể thử lại. |
| US-7.A8 | Đánh giá chất lượng và một cải tiến AI. | Có ≥20 ca expected result gồm thường/biên/từ chối, trong đó ≥2 injection trực tiếp, ≥1 injection gián tiếp qua nguồn và ≥2 ngoài phạm vi. Cố định dataset/model/snapshot, chạy trước–sau cải tiến và báo pass rate; không điền kết quả chưa chạy. |
| US-7.A9 | Sử dụng widget chat. | Hiển thị history, nguồn, loading/refused/failed riêng, thông báo dữ liệu gửi tới endpoint Ollama; chỉ Qwen đã cấu hình, không chọn provider. Không bắt buộc streaming AI vì real-time nằm ở US-10. |

**Phân công:** An — BE/domain/API và kiểm thử tầng backend; Khanh — FE/session/UI và kiểm thử frontend/browser. Hai thành viên cùng kiểm tích hợp và nghiệm thu.

<a id="us-8"></a>
### US-8 — Nhờ AI soát hồ sơ bằng Structured output

Là **người xác minh**, tôi muốn **nhờ AI chỉ ra điểm cần làm rõ trong hồ sơ đang chờ xác minh**, để **hỗ trợ rà soát nhưng vẫn tự ra quyết định**.

| Mã tiêu chí | Điều kiện / thao tác | Kết quả mong đợi |
| :-- | :-- | :-- |
| US-8.A1 | Gọi đánh giá AI trên dự án chờ xác minh. | Chỉ verifier ngoài dự án được phép; khách 401, người không thấy dự án 404, sai trạng thái 409 PROJECT_NOT_PENDING, xung đột bị chặn. Body {} dùng Qwen cấu hình sẵn; model: ollama còn được nhận cho client cũ, không có cloud selector. |
| US-8.A2 | Model trả JSON verdict/signals. | Kiểm JSON Schema/Zod: PASS/NEEDS_INFO/FLAG, mã signal hợp lệ, tối đa 6 signal. Sai thì hỏi lại một lần; sai lần hai trả 502 AI_INVALID_OUTPUT, không thay assessment cũ; metadata lỗi vẫn có thể được ghi. |
| US-8.A3 | JSON hợp lệ được gộp vào assessment. | Lấy mức cảnh báo nặng nhất, không hạ cờ quy tắc; PERSONAL_DATA/POSSIBLE_SCAM ép FLAG. Lưu source=ai, hiển thị nhãn AI và dùng verdict trong hàng chờ. Không tự đổi trạng thái dự án; kiểm lại quyền/trạng thái sau khi chờ model trước khi lưu. |
| US-8.A4 | Hồ sơ chứa chèn lệnh hoặc model không hoạt động. | Coi hồ sơ là dữ liệu, yêu cầu gắn cờ nội dung nguy hiểm; chỉ gửi trường hồ sơ cần thiết, không đọc thêm email/SĐT từ tài khoản. Model lỗi/timeout không ghi đè assessment cũ; UI báo rõ, người xác minh vẫn duyệt/trả lại theo quy tắc. Chất lượng nhận diện phải được đo, không suy từ schema pass. |
| US-8.A5 | Chạy assessment thật hoặc đánh giá trước–sau cải tiến. | Prompt ở file có version; log model/version/attempts/tokens/latency/cost/outcome, không có tools thực thi nên tools là N/A. Có 20 ca (8 thường, 6 biên, 6 gắn cờ), kết quả trước–sau và trung bình theo phạm vi đo; gọi có schema dùng temperature 0 để kết quả lặp lại được; số liệu dùng ở US-9. |

**Hiện thực US-8:** Khanh — BE/FE; An — review backend/tích hợp. Hai thành viên cùng review expected result và giải thích luồng khi bảo vệ.

<a id="us-9"></a>
### US-9 — Quản trị mức sử dụng AI

Là **admin**, tôi muốn **xem mức sử dụng của chatbot và người gác cổng theo khoảng thời gian**, để **theo dõi chất lượng vận hành, độ trễ và phạm vi chi phí**.

| Mã tiêu chí | Điều kiện / thao tác | Kết quả mong đợi |
| :-- | :-- | :-- |
| US-9.A1 | Chat hoặc assessment hoàn tất/thất bại trong phạm vi được instrument. | Lưu metadata theo luồng: chat_requests và ai_requests, gồm ID, model/version, số lần gọi, tokens khi có, latency và kết cục/lý do. Không lưu raw chat hay secret. Chat ghi nền best-effort sau response, có thể thiếu log khi DB/process lỗi; không dùng số record làm cam kết tổng traffic. Không có agent tools, hiển thị N/A. |
| US-9.A2 | Admin mở dashboard hoặc thay khoảng đo. | Hai phần chatbot/assessment có request, kết cục/lỗi/từ chối theo loại, tokens, latency trung bình và phạm vi chi phí; công thức/mẫu số/đơn vị rõ, dữ liệu thiếu là null/—. Model local không có hóa đơn API, chưa tính điện/phần cứng; không bịa chi phí. |
| US-9.A3 | Guest/user/verifier truy cập; dữ liệu rỗng/lỗi hoặc nhiều request filter chồng nhau. | API và UI chặn người không phải admin; có loading/empty/error/retry. Response filter cũ không ghi đè filter mới; số liệu lấy từ DB thật, tách lượt eval khỏi assessment nghiệp vụ theo contract. |

**Phân công:** An — BE/domain/API và kiểm thử tầng backend; Khanh — FE/session/UI và kiểm thử frontend/browser. Hai thành viên cùng kiểm tích hợp và nghiệm thu.

<a id="us-10"></a>
### US-10 — Bảng đóng góp cập nhật theo thời gian thực

Là **người đang xem dự án**, tôi muốn **thấy bảng đóng góp cập nhật khi người khác thao tác**, để **theo dõi diễn biến mà không phải tải lại trang**.

| Mã tiêu chí | Điều kiện / thao tác | Kết quả mong đợi |
| :-- | :-- | :-- |
| US-10.A1 | Transaction tạo hoặc chuyển trạng thái đóng góp thành công, kể cả cascade hủy dự án. | Backend phát sự kiện SSE theo dự án sau commit; rollback/thao tác thất bại không phát sự kiện thay đổi thành công. |
| US-10.A2 | Cùng xem một dự án hoặc xem dự án khác/sai quyền. | Sự kiện chỉ mang thông tin cần thiết để client tải snapshot qua API có kiểm quyền; bảng có dòng/trạng thái/ghi chú/thao tác hợp lệ. Không lẫn dự án, không lộ token/dữ liệu riêng. |
| US-10.A3 | Nhận thay đổi khi đang mở bảng hoặc mở lại tab. | Bảng cập nhật không reload, không trùng hoặc bị response cũ ghi đè; dòng mới là committed, chưa coi đã nhận. SSE chỉ cập nhật bảng, không tự cập nhật tổng/tiến độ/nhãn tab; mở lại tab tải snapshot mới. Giữ luồng cập nhật sau thao tác của chính người dùng hiện có. |
| US-10.A4 | Mất mạng, backend restart, đổi dự án/phiên hoặc quyền bị thu hồi. | UI báo trạng thái kết nối/đồng bộ, tự reconnect và lấy snapshot bù thay đổi. Snapshot lỗi không được báo đã đồng bộ; dọn kết nối/request cũ. Mất quyền/phiên thì bỏ bảng thuộc phiên cũ; lỗi mạng tạm không tự đăng xuất. |
| US-10.A5 | Kiểm bằng hai phiên và trên bản demo. | Có ca cùng/khác dự án, sai quyền, rollback, reconnect/restart, snapshot lỗi và kết nối qua Next proxy >125 giây; kiểm lại container/deploy demo. Bus trong bộ nhớ, hỗ trợ một backend instance, không replay lịch sử sự kiện. |

**Phân công:** An — BE/domain/API và kiểm thử tầng backend; Khanh — FE/session/UI và kiểm thử frontend/browser. Hai thành viên cùng kiểm tích hợp và nghiệm thu.

### Phạm vi và điều kiện nghiệm thu chung

Cam kết/bàn giao/xác nhận đóng góp, vòng đời/bảng tin và sổ thu chi là chức năng hỗ trợ đã có, không thêm thành story riêng. Các story US-5/6/10 sử dụng dữ liệu từ những luồng này; thay đổi liên quan vẫn phải giữ audit, transaction và kiểm hồi quy. Q-03/Q-04 được ghi ở [ADR-005](adr/005-project-soft-delete.md) và [ADR-006](adr/006-receipt-storage.md).

Mỗi story cần source truy vết được, test đúng/sai quyền/đầu vào/trạng thái phù hợp, UI loading/empty/error/success, tích hợp HTTP thật và kết quả theo môi trường đã ghi. Hai người kiểm chéo trước nghiệm thu. Mock/fixture, build hoặc liên kết test tồn tại không tự chứng minh model thật, triển khai hay hiểu biết cá nhân.

**Riêng US-7:** giữ nguyên nghiệm thu người dùng ngày 26/10/2026 (20/20 thủ công, fallback/phục hồi đạt). Hồ sơ đối chứng baseline và injection gián tiếp còn thiếu được ghi trong traceability; không hủy nghiệm thu đã có và không suy rằng toàn bộ hồ sơ cuối kỳ đã đủ.

Hai capability đã chọn là **A — RAG** và **C — Structured output**; SSE không phải capability AI thứ ba. Upload chưa được AI đọc, không tính multimodal. Các yêu cầu chất lượng AI, phi chức năng và đầu ra báo cáo bên dưới vẫn bắt buộc, không bị loại vì đã đủ 10 stories.

## 4. Yêu cầu chất lượng AI bắt buộc

| ID | Yêu cầu nghiệm thu | Hiện trạng 27/10/2026 |
| :-- | :-- | :-- |
| AI-01 | Giải thích model theo chất lượng, chi phí, tốc độ, riêng tư, kèm cấu hình thực tế | Đạt: Qwen `qwen3:4b` + `qwen3-embedding:0.6b` qua endpoint Ollama. Dữ liệu chỉ ở trong máy nếu endpoint thực sự local, không có hóa đơn API khi tự vận hành; đổi lại chậm trên CPU (đánh giá hồ sơ 4–25 giây, chat khoảng 50 giây khi tắt suy nghĩ). Lý do ở [ADR-002](adr/002-llm-selection.md) và [AI design](ai-design.md) |
| AI-02 | Prompt ở file/config được version trong Git | Đạt: chat có `promptVersion`/`queryPromptVersion` ghi vào `chat_requests`; US-8 có `prompts/assessment.v1–v4.md` (đang dùng v4), version ghi vào `ai_requests` |
| AI-03 | Demo đủ injection, ngoài phạm vi, phản hồi sai/lỗi (timeout/invalid JSON/empty theo luồng áp dụng) | Đạt: chat [US-7](evidence/us7-manual-evaluation.md); US-8: chèn lệnh → FLAG, sai khuôn JSON hỏi lại rồi 502, tắt Ollama → 503 rõ ràng ([US-8](evidence/us8-verification.md) H4, H6) |
| AI-04 | Ít nhất 20 ca có expected result, gồm thường/biên/từ chối; chạy trước/sau ít nhất một cải tiến | US-8 đạt: 20 ca, v1 13/20 → v2 15–17/20 → **v4 + temperature 0: 20/20 hai lần liên tiếp** ([bảng](../be/evals/README.md)). US-7 một phần: 20/20 thủ công sau cải tiến, baseline riêng còn thiếu ([evidence](evidence/README.md)) |
| AI-05 | Log và tổng hợp tokens, latency, chi phí; truy vết phiên bản prompt và tools | Đạt: `chat_requests` ghi nền best-effort, `ai_requests` lưu metadata assessment; trang admin `/admin/ai-usage` tổng hợp cả hai vai AI, chi phí API ghi "không áp dụng" vì chạy local |
| AI-06 | Ngắt dịch vụ AI, chức năng non-AI vẫn dùng được và có thông báo rõ ràng | Đạt: tắt Ollama thì chat báo AI tạm không khả dụng, người gác cổng báo 503 và vẫn duyệt/trả lại được (US8-H6) |

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

## 7. Sổ quyết định và thông tin còn chờ

| ID | Quyết định / thông tin cần xác nhận | Ảnh hưởng |
| :-- | :-- | :-- |
| Q-01 | Năng lực AI thứ hai — **đã chốt 25/10/2026: C Structured output** (Khanh, chủ US-8; An xác nhận trong human review) | US-8, schema, eval và demo |
| Q-02 — Đã chốt | Google cho user thường; liên kết cần mật khẩu cũ; role user/admin/verifier, identityVerified riêng; admin bootstrap/cấp verifier, đổi mật khẩu tự nguyện; schema đã cập nhật Supabase | US-1; [hướng dẫn](../README.md) |
| Q-03 — Đã chốt 25/10/2026 (Khanh, chủ US-2) | Chỉ xóa bản nháp, xóa mềm, giữ sổ ghi vết; dự án công khai dùng Hủy ([ADR-005](adr/005-project-soft-delete.md)) | US-2, dữ liệu liên quan và audit |
| Q-04 — Đã chốt 25/10/2026 (Khanh, chủ US-5) | Bảng `files` trong PostgreSQL, ảnh/PDF ≤ 3 MB, quyền xem theo trạng thái khoản chi ([ADR-006](adr/006-receipt-storage.md)) | US-5, privacy |
| Q-05 — Đã chốt | SSE cho bảng đóng góp khi tạo/chuyển trạng thái; chỉ cập nhật bảng, tự nối lại và lấy snapshot; một backend instance | US-10; đã có code/checks local, [contract](api-contract.md#us-10--sse-bảng-đóng-góp), [evidence](evidence/us10-verification.md); chờ human/deploy |
| Q-06 — Đã chốt 26/10/2026 | Demo bằng Qwen qua Ollama trên máy; Docker Compose (Postgres + pgvector, service init) gọi Ollama của host; bản deploy Render/Vercel không có model nên phần AI báo không khả dụng | AI-01, NFR-06; [deployment](deployment.md) |
| Q-07 | Giờ nộp và lịch bảo vệ riêng ngày 27/10 | Đóng gói tài liệu và diễn tập |

Không xem lựa chọn đề xuất của AI là quyết định đã được nhóm thông qua. Thứ tự công việc và điều kiện hoàn thành xem [backlog](backlog.md).
