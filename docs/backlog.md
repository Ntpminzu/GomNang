# Phân công và kế hoạch cuối kỳ — GOM NẮNG

Cập nhật 25/10/2026; hạn cuối 27/10/2026, chưa có giờ nộp/lịch bảo vệ riêng. Phạm vi: [10 US](requirements.md), mỗi story có BE và FE. Năng lực AI thứ hai tiếp tục **chờ quyết định**, không tự chọn thay nhóm.

## 1. Trách nhiệm

| Người | Sở hữu | Bàn giao |
| :-- | :-- | :-- |
| An — BE | Domain/DB/auth/API/RAG/model/telemetry | Contract, code BE, unit/API/eval, hướng dẫn runtime; review FE flow |
| Khanh — FE | Next UI/forms/session/chat/upload/dashboard | Code FE, tests/UI/browser, hướng dẫn sử dụng/demo; review dữ liệu/nguồn AI |
| Cả hai | Nghiệm thu parent US và bản nộp | Flow thật, review chéo, giải thích module mình và phần được hỏi chéo |

Task con đặt `US-n.BE`/`US-n.FE`; chỉ 10 parent stories được tính vào yêu cầu 8–15 của đề. Không xem task một tầng xong là parent đã hoàn thành. Phân công này làm rõ trách nhiệm FE/BE đã được nhóm xác nhận, không hứa khối lượng hai phía bằng nhau ở từng story.

## 2. Bảng công việc theo story

| Story / hiện trạng | An — BE | Khanh — FE | Phụ thuộc / điều kiện hoàn thành |
| :-- | :-- | :-- | :-- |
| US-1 — Đã hiện thực, schema Supabase đã cập nhật | Google/session/role/admin cấp verifier, đổi mật khẩu tự nguyện | Login/callback/session/admin verifier UI/browser | Google user thường đã ghi nhận đăng nhập; review con người chưa hoàn tất; [Supabase evidence](evidence/us1-verification.md) |
| US-2 — Đã human review thao tác 26/10, chờ đọc source | Xoá mềm bản nháp, migration 0015, test quyền/trạng thái/sổ ghi vết | Hộp thoại xác nhận xoá, về Việc của tôi | Q-03 chốt 25/10 ([Quyết định xóa mềm](implementation-decisions.md#project-soft-delete)); chờ người kiểm điền [human review](evidence/us2-verification.md#3-human-review) |
| US-3 — Đã human review thao tác 26/10, chờ đọc source | Query/page/total/order contract, validate 400, tests | Tìm/lọc/sắp xếp/nút trang/URL state | Lọc trong bộ nhớ, đổi sang SQL khi hàng nghìn dự án; chờ người kiểm điền [human review](evidence/us3-verification.md#3-human-review) |
| US-4 — Đã human review thao tác 26/10, chờ đọc source | Thêm test trả lại → gửi lại | Thêm E2E trả lại có lý do | Chờ [human review](evidence/us4-verification.md#2-human-review); chưa có thông báo khi bị trả lại |
| US-5 — Đã human review phần lớn 26/10, chờ ảnh lớn/PDF và đọc source | Bảng `files`, upload/đọc file theo quyền, kiểm loại/kích thước, tests | Chọn file, thu nhỏ ảnh, tải/lỗi, xem trước | Q-04 chốt 25/10 ([Quyết định lưu chứng từ](implementation-decisions.md#receipt-storage)); chưa dọn file không gắn; AI chưa đọc file; chờ [human review](evidence/us5-verification.md#3-human-review) |
| US-6 — Đã human review thao tác 26/10, chờ đọc source | Thêm test đổi tài khoản, hồ sơ không lộ email/số điện thoại | Thêm E2E đổi tài khoản | Chờ [human review](evidence/us6-verification.md#2-human-review) |
| US-7 — Đã đóng theo nghiệm thu người dùng | RAG/guardrails/prompt v5/log số; kiểm tự động đã đạt | Chat/history/sources/loading/refused/error; fallback và phục hồi đã được người dùng xác nhận | 20/20 manual đạt theo người dùng; [biên bản](evidence/us7-manual-evaluation.md). Còn bổ sung chi tiết baseline/injection gián tiếp cho hồ sơ cuối kỳ, không tự coi đã có bằng chứng. US-10 kiểm real-time riêng |
| US-8 — Đã human review và chạy tự động H1–H9 26/10, chờ đọc source | Endpoint, schema Zod, gộp với quy tắc, prompt v1–v4 (đang dùng v4), telemetry, eval 20 ca: v4 20/20 | Nút đánh giá AI, trạng thái chờ/lỗi, nhãn AI | Q-01 chốt C ngày 25/10; Khanh làm BE+FE; chờ người kiểm điền [human review](evidence/us8-verification.md#3-human-review) |
| US-9 — Có code, chờ nghiệm thu người dùng | Metadata + embedding query tokens, aggregate API, runner 0014 bảo toàn dữ liệu | /admin/ai-usage hai vai AI (thẻ + tab), filter/states/công thức/metadata | [Spec và checks](evidence/us9-verification.md), [evidence](evidence/us9-verification.md); tools N/A cho pipeline hiện tại, rà lại khi US-8 được chốt |

| US-10 — Có code, chờ nghiệm thu người dùng/deploy | SSE theo dự án, quyền, phát sau commit đóng góp/vòng đời, heartbeat/disconnect; tests quyền/rollback/cascade/thu hồi phiên | Bảng riêng, trạng thái kết nối/đồng bộ, tự nối lại và snapshot; E2E hai phiên/mất mạng/restart/snapshot chậm/bảng rỗng/proxy >125 giây | Q-05 đã chốt; [contract](api-contract.md#us-10--sse-bảng-đóng-góp), [evidence](evidence/us10-verification.md); một BE instance, không migration, còn kiểm bản demo thật |

Chi tiết AC ở [requirements](requirements.md); file/test thật ở [traceability](traceability.md). Chức năng chính có source không đồng nghĩa đã nghiệm thu deploy.

Đóng góp, vòng đời/bảng tin và thu chi được giữ làm chức năng hỗ trợ, không thêm thành US/task triển khai mới. Khi một story tác động dữ liệu các luồng này, An/Khanh vẫn kiểm hồi quy và bảo toàn quyền/transaction/audit.

## 3. Thứ tự phối hợp trước hạn 27/10

| Chặng | BE — An | FE — Khanh | Điểm ghép chung |
| :-- | :-- | :-- | :-- |
| Nền kiểm thử và contract | Sửa fixtures/test RAG; kiểm dependencies; đề xuất contract còn thiếu | Kiểm flow UI hiện có; thống nhất DTO/errors/states, giữ tests FE | Chốt contracts, Q-01…Q-06; dùng dữ liệu thử riêng |
| Làm song song phần còn thiếu | Auth/query/delete/upload/AI instrumentation theo scope đã chốt | Auth/list/pager/delete/upload/chat/admin UI theo contract | Từng story đi qua HTTP thật, không chờ ghép tất cả cuối kỳ |
| Hoàn thiện AI và bằng chứng | RAG/capability thứ hai/eval, guardrails, cost/latency và runtime | Sources/refusal/error/real-time UI, review expected/actual và demo | Cùng dataset/model/config, baseline→cải tiến→đo lại; không bịa kết quả |
| Chốt bản nộp | Full checks trong môi trường được phép, vận hành DB/model | Browser/responsive/E2E, kiểm tài khoản và video | Demo container/deploy, report/slide/video, review/cross-explain và commit |

Mốc 25–26/10 ưu tiên nền/contract và phần còn thiếu; 27/10 trước giờ nộp dành tích hợp/đóng gói/diễn tập. Đây là thứ tự ưu tiên, không đảm bảo mọi chức năng kịp hạn. Nếu thiếu phải ghi rõ/trao đổi giảng viên; không bỏ tiêu chí bắt buộc hoặc đánh dấu task chưa làm là xong.

## 4. Công việc dùng chung ngoài số lượng US

- Model choice, prompt files/version, 3 guardrails, ≥20 ca eval và kết quả trước/sau, log tokens/cost/latency, fallback: bắt buộc AI-01…AI-06; An lo pipeline/runner, Khanh review UI/expected result/demo.
- Responsive, persistence, API validation, secrets/PII/quyền RAG và vận hành container/deploy: NFR-01…NFR-08; không phải phụ kiện tùy chọn vì đã gộp story.
- ≥3 ADR có ≥1 AI, AI_USAGE có ≥2 lỗi AI và kiểm/sửa thật, traceability và Git ownership: hai người cùng rà, mỗi người ký phần mình.
- PDF 10–20 trang, slide ≤15, video 3–5 phút, tài khoản test và README chạy được; không được tính bộ Markdown thay các đầu ra này.
- Bảo vệ: demo 8 phút/live change 10 phút/Q&A 12 phút; cả hai phải có mặt và tự giải thích. Chưa có bằng chứng các đầu ra trên đã hoàn tất.

## 5. Theo dõi tiến độ

Ghi người/ngày/commit/môi trường/lệnh hoặc kịch bản/output cho từng task và AC. Trạng thái BE, FE, integration, eval, deploy và human review riêng; chỉ đóng parent khi đủ điều kiện chung trong requirements. Evidence hiện có ở [verification](evidence/verification.md), chưa bao phủ mọi AC mới.

Tài liệu này không sửa app/test/config/database. Q-01 đã được Khanh chốt ngày 25/10/2026. Khi triển khai thay đổi sản phẩm, làm rõ các quyết định phụ thuộc trước; không chạy migration/reset/seed thật chỉ để hoàn thiện doc hoặc thử E2E.
