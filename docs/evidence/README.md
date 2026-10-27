# Bằng chứng cho yêu cầu cuối kỳ

**Nghiệm thu mới nhất 26/10: US7 đã đóng theo quyết định người dùng.** [Phiếu manual](us7-manual-evaluation.md) ghi 20/20 đạt theo tự thử, fallback và mở lại Ollama thành công. Các output/ID log/call counts chưa cung cấp không được tự điền; số liệu baseline riêng và mô tả injection gián tiếp còn chờ bổ sung cho hồ sơ cuối kỳ. Bộ snapshot cũ vẫn chưa chạy.

Mới nhất: [schema request_id tự tăng](chat-log-sequence-verification.md), 162 tests/typecheck/build và E2E 4/4; migration thật giữ 38 log và dữ liệu nghiệp vụ. Phiếu thủ công đã đổi sang tra ID số trong DB, không hiện mã trên UI.

Tự thử trên DB thật: [phiếu 20 câu US7 và bảng trước/sau](us7-manual-evaluation.md). Lượt hiện tại 20/20 theo xác nhận người dùng; bảng baseline chưa có số liệu riêng. Nguồn công khai và hướng dẫn tra metadata giữ nguyên.

Cập nhật 26/10 sau các đợt tinh gọn: xem [kiểm chứng US7 hiện tại](us7-verification.md) và raw logs đi kèm. Workspace 160/160, typecheck/build đạt; kết quả E2E và các lần lỗi được ghi riêng. [Bộ evaluation US7 20 câu](../../be/evals/chat/us7-v1.md) đã chốt snapshot/rubric nhưng chưa chạy Qwen thật, chưa có baseline/after. Những đoạn “chưa chạy” dưới đây là ghi nhận tại mốc trước đợt kiểm tra này.

[Quyết định chỉ Qwen/Ollama](../adr/002-llm-selection.md) đã gỡ provider cloud ngày 26/10; các evidence lịch sử nhắc adapter cũ không chứng minh tính năng hiện tại. Chưa chạy automated checks cho lượt gỡ này.

[US7 giai đoạn 3](us7-verification.md): code/runtime guards và fixtures đã chuẩn bị, chưa test/typecheck/build/E2E/eval, model/DB thật. Kết quả cũ không xác nhận bản mới.

[US7 giai đoạn 2 — guard](us7-verification.md): đã sửa source và chuẩn bị ca kiểm tra, chưa chạy tests/typecheck/build/E2E/eval, model thật hoặc index DB thật trong lượt này. Chờ người dùng tự thử; không coi source/test tồn tại là chứng minh an toàn đạt.

Thay đổi mới: [RAG index thủ công](../adr/003-rag-pipeline.md). Chưa chạy CLI hoặc tests/typecheck/build/E2E/eval cho thay đổi này; không dùng kết quả refactor cũ để xác nhận runtime bản mới.

US7 giai đoạn 1 ngày 26/10: [code, migration Supabase và checklist tự thử](us7-verification.md). Migration đã áp dụng, dữ liệu cũ giữ nguyên; chưa chạy test/typecheck/build/E2E/eval cho bản mới, chờ người dùng tự thử.

| Bằng chứng | Trạng thái |
| :-- | :-- |
| [US-1: local, Supabase và human review](us1-verification.md) | 130 tests, typecheck/build và E2E 5/5 đạt; migration Supabase xong; human review đã ghi một phần, còn ca cần bổ sung |
| [US-2: tạo/sửa/xoá dự án và human review](us2-verification.md) | Test, typecheck và E2E đạt; xoá mềm bản nháp theo Q-03; human review 26/10 trên DB An: H1–H7 Pass, chờ H8 đọc source |
| [US-4: xác minh trước khi công khai, human review](us4-verification.md) | Test trả lại → gửi lại; human review 26/10: H1–H5 Pass, chờ H6 đọc source; ghi nhận dự án thử bị đổi trạng thái bằng Table Editor |
| [US-6: việc của tôi và hồ sơ công khai, human review](us6-verification.md) | Test đổi tài khoản; human review 26/10: H1–H4 Pass (vai Hoa Mai kiểm thêm qua API), chờ H5 đọc source |
| [US-5: tải và xem chứng từ chi theo quyền, human review](us5-verification.md) | Lưu file trong PostgreSQL theo Q-04; human review 26/10: H1, H3–H6 Pass, chờ H2 (ảnh lớn/PDF) và H7 |
| [US-3: tìm, lọc, sắp xếp, phân trang và human review](us3-verification.md) | Phân trang ở máy chủ; human review 26/10: H1–H7 Pass (3 trang), chờ H8 đọc source |
| [US-8: đánh giá hồ sơ bằng AI, eval 20 ca và human review](us8-verification.md) | Eval `qwen3:4b` 13/20 → 15/20 (v2) → 17/20 (v2 chạy lại 26/10) → **20/20 (v4, temperature 0, 27/10, hai lần)**; H1–H6, H8, H9 Pass (H5, H6 tự động), chờ H10 |
| [US-10: SSE bảng đóng góp](us10-verification.md) | Có code, 179 workspace tests/typecheck/build đạt; E2E US10 hai phiên/reconnect/restart/snapshot chậm/bảng rỗng và proxy >125 giây đạt qua các lượt; human/deploy còn chờ |
| [Refactor RAG theo repo tham chiếu](rag-refactor-verification.md) | 141 workspace tests, typecheck/build và chat E2E 2/2 đạt với fixture; chưa nghiệm thu toàn bộ US-7 hoặc semantic model thật |
| [Kiểm chứng source/test và smoke auth](verification.md) | Domain 41/41, frontend 15/15, backend adapter/lock 6/6; auth smoke cô lập đạt, ngày 25/10/2026 |
| Evaluation AI ≥20 ca, trước/sau cải tiến | Capability 2 (US-8) có [eval 20 ca trước/sau](us8-verification.md#2-evaluation-20-ca--trước-và-sau-đổi-prompt) và [prompt v4 20/20](us8-verification.md#2c-prompt-v4--2020-trên-qwen34b-27102026). RAG (US-7) chưa có; thiết kế ở [AI design](../ai-design.md#6-thiết-kế-evaluation-và-telemetry-cần-bổ-sung); capability 1 (US-7): [Manual-live-v1](us7-manual-evaluation.md): 20/20 theo người dùng sau cập nhật prompt, baseline riêng chưa có số liệu; bộ snapshot vẫn NOT_RUN |
| Tokens/cost/latency, guardrails/fallback demo | Fallback/phục hồi đã được người dùng xác nhận; injection gián tiếp thiếu mô tả cụ thể, số đo cost/latency cho bản nộp còn cần bổ sung; US-8 lưu token, latency, chi phí mỗi lần gọi ở bảng `ai_requests` ([US-8 §2b](us8-verification.md)) |
| Container/deploy và hồ sơ PDF/slide/video | Chưa xác nhận hoàn tất; xem [backlog](../backlog.md) |
| Human review | US7 đã được người dùng nghiệm thu/đóng; không suy ra các module khác hoặc toàn dự án đã nghiệm thu. Xem [AI_USAGE](../../AI_USAGE.md) |

Mỗi bằng chứng cần ngày, commit, môi trường/config đã che secret, lệnh/kịch bản và expected/actual result. Không đưa token/key, URI DB, password, backup hoặc PII vào repo. Tách source inspection, unit/API/E2E, AI eval, deploy và human review; không lấy mock/build làm bằng chứng provider thật.

Script [llm-smoke-test.mjs](../../scripts/llm-smoke-test.mjs) có thể tạo output thí nghiệm nhưng không thay eval của ứng dụng. Chỉ đưa output liên quan bản nộp vào đây, cập nhật hoặc đo lại khi source thay đổi.
