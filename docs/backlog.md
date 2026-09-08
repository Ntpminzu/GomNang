# Backlog 8 tuần — GOM NẮNG

**K** = Võ Tuấn Khanh (23110031) · **A** = Phạm Văn Bảo An (23110001) · **K+A** = làm chung / review chéo

> Mỗi tuần có một mục **cross-explain**: người *không* viết phần đó phải trình bày được nó. Lý do: mục 9 Course Guide kiểm tra ngẫu nhiên thành viên, và điểm "Student understanding" chiếm 2/10 mỗi milestone.

---

| Tuần | Bài tập | Việc cần làm | Owner | Định nghĩa "xong" |
| :-- | :-- | :-- | :-- | :-- |
| **1** | 1A Environment | Cài Git/Node/Docker, tạo repo, chạy starter, commit đầu | K | Repo có commit chạy được ✅ |
| | 1B Problem discovery | 3 vấn đề ứng viên, phỏng vấn ≥ 1 người dùng thật, brief 1 trang | A | `docs/week-01.md` có ghi chép phỏng vấn thật ⬜ |
| **2** | 2A Architecture investigation | Chọn 1 app có sẵn, vẽ kiến trúc, trace 1 thao tác, đánh dấu chỗ chèn AI và dữ liệu không được gửi | A | `docs/week-02a.md` + sơ đồ ⬜ |
| | **2B Proposal** | Problem statement, 3 user stories, vertical slice, chọn công nghệ, thiết kế năng lực AI | K+A | `proposal.md` `architecture.md` `backlog.md` ✅ |
| | 2B smoke test | Chạy LLM smoke test, lưu prompt/response/latency | K | `docs/evidence/llm-smoke-test.json` ⬜ **cần API key** |
| **3** | 3A UI skeleton | Điều hướng + 3 màn: danh sách dự án, chi tiết dự án, form tạo dự án. 1 form có validation. 4 trạng thái loading/empty/success/error | A | Chạy được với mock data, có video 60s |
| | 3A phụ | Định nghĩa API contract: endpoint, request/response mẫu, mã lỗi | K | `docs/api-contract.md` |
| | 3B Frontend prototype | Toàn bộ vertical slice chạy trên mock API, ≥ 3 test tự động hoặc acceptance test có tài liệu | A (K review) | README chạy được bởi người ngoài |
| | *cross-explain* | K trình bày được state và event handling của FE | K | |
| **4** | 4A Backend slice | Schema + migration, endpoint cho US-1/US-2/US-3, validation Zod, status code đúng, `/health`, log có cấu trúc, `.env.example` | K | Test API: ≥ 1 request hợp lệ + 1 không hợp lệ |
| | 4A phụ | Máy trạng thái dự án + đóng góp, `audit_log` chỉ ghi thêm, kiểm tra BR-002 và BR-003 | K | Test riêng cho BR-003 |
| | 4B Integrate + deploy | Nối FE thật vào BE thật, `Dockerfile` + `docker-compose`, deploy Vercel + Render + Supabase, xử lý 1 lỗi mạng/validation | K deploy, A nối FE | URL chạy được, video main workflow |
| | *cross-explain* | A trình bày được vì sao chọn từng status code | A | |
| **5** | Midterm | Ôn HTTP, state FE, validation, business logic, container, log, review code AI sinh. **Thi cá nhân, không dùng AI** | K+A | |
| | Readiness gate | Người lạ chạy được repo theo README; cả hai giải thích được kiến trúc | K+A | Gate Green |
| | 5 AI readiness lab | Gọi LLM, xin text + JSON, thử 5 prompt gồm 1 mơ hồ, ghi model/config/latency/1 lỗi hoặc ảo giác, so 2 model | K | `docs/week-05.md` + output đã lưu |
| **6** | 6A Model experiment | Chạy ≥ 5 request, đo latency trung bình, 1 request structured output, 1 input có vấn đề. Bàn về chất lượng/riêng tư/chi phí/giới hạn | K | Script chạy lại được |
| | 6B Baseline AI feature | Gác cổng v1: lọc dữ liệu cá nhân → prompt → Zod validate → lưu assessment. UI có loading/timeout/model-unavailable/invalid-output | K làm, A làm UI trạng thái | Tính năng chạy trên bản deploy |
| | 6B eval | ≥ 10 ca đánh giá có kỳ vọng, gồm 1 ca prompt injection và 1 ca dữ liệu cá nhân lọt vào mô tả | A | `evals/gatekeeper.cases.json` + kết quả chạy |
| | *cross-explain* | A trình bày được luồng gọi model và cơ chế fallback | A | |
| **7** | 7A Advanced capability | Track **Structured AI workflow**: schema chặt, retry khi sai schema, đo tỉ lệ lỗi schema, đo tiện ích. Cộng tìm trùng bằng pgvector top-3 | K | Trace + số đo |
| | 7A security note | Ranh giới quyền, dữ liệu cấm gửi, hành vi khi hỏng phụ thuộc | A | `docs/security-note.md` |
| | Release gate | Chạy kịch bản lạ của giảng viên, thử input độc hại, ngắt LLM và chứng minh hệ thống hồi phục | K+A | Gate pass → **feature freeze** |
| | 7B Finalization | Chỉ sửa lỗi và bổ sung test. Không thêm scope | K+A | |
| **8** | Final | Slide, video dự phòng, bản ghi đóng góp cá nhân, tổng hợp bằng chứng, tập demo | A slide, K demo | Nộp trước deadline LMS |

## Việc chưa có chủ / cần chốt sớm

| # | Việc | Hạn nên chốt | Vì sao gấp |
| :-- | :-- | :-- | :-- |
| B-01 | Lấy API key LLM (Google AI Studio miễn phí) | trước Thứ Ba tuần 3 | Chặn nộp 2B |
| B-02 | Phỏng vấn thật ≥ 1 người tổ chức thiện nguyện | tuần 3 | Course cấm bịa phỏng vấn; 1B đang thiếu bằng chứng |
| B-03 | Tạo project Supabase region Singapore | tuần 3 | Cần trước khi code backend |
| B-04 | Xác nhận thầy có bắt buộc provider/Docker/CI cụ thể không | tuần 3 | Có thể phải đổi phần triển khai |
| B-05 | Chuẩn bị bộ dữ liệu seed 20 dự án để đo lợi ích của gác cổng | tuần 5 | Không có nó thì tuần 6 không có "evidence" |

## Rủi ro tiến độ

| Rủi ro | Dấu hiệu sớm | Phương án thu hẹp |
| :-- | :-- | :-- |
| Tuần 4 làm không kịp cả backend lẫn deploy | Hết Thứ Sáu tuần 4 mà `/health` chưa lên mạng | Bỏ hạng mục *tiền* khỏi vertical slice, chỉ giữ vật phẩm |
| Gác cổng cho kết quả kém với tiếng Việt | Dưới 6/10 ca eval đạt ở tuần 6 | Thu hẹp còn *chỉ* trích xuất trường thiếu, bỏ phần đánh giá rủi ro |
| Chỉ một người hiểu hệ thống | Buổi cross-explain bị bỏ 2 tuần liên tiếp | Đổi vai: người kia phải sửa 1 bug trong phần của người này |
