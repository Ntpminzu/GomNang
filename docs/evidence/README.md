# Bằng chứng cho yêu cầu cuối kỳ

**Nghiệm thu mới nhất 26/10: US7 đã đóng theo quyết định người dùng.** [Phiếu manual](us7-manual-evaluation.md) ghi 20/20 đạt theo tự thử, fallback và mở lại Ollama thành công. Các output/ID log/call counts chưa cung cấp không được tự điền; số liệu baseline riêng và mô tả injection gián tiếp còn chờ bổ sung cho hồ sơ cuối kỳ. Bộ snapshot cũ vẫn chưa chạy.

Mới nhất: [schema request_id tự tăng](chat-log-sequence-verification.md), 162 tests/typecheck/build và E2E 4/4; migration thật giữ 38 log và dữ liệu nghiệp vụ. Phiếu thủ công đã đổi sang tra ID số trong DB, không hiện mã trên UI.

Tự thử trên DB thật: [phiếu 20 câu US7 và bảng trước/sau](us7-manual-evaluation.md). Lượt hiện tại 20/20 theo xác nhận người dùng; bảng baseline chưa có số liệu riêng. Nguồn công khai và hướng dẫn tra metadata giữ nguyên.

Cập nhật 26/10 sau các đợt tinh gọn: xem [kiểm chứng US7 hiện tại](us7-verification.md) và raw logs đi kèm. Workspace 160/160, typecheck/build đạt; kết quả E2E và các lần lỗi được ghi riêng. [Bộ evaluation US7 20 câu](../evaluation/us7-v1.md) đã chốt snapshot/rubric nhưng chưa chạy Qwen thật, chưa có baseline/after. Những đoạn “chưa chạy” dưới đây là ghi nhận tại mốc trước đợt kiểm tra này.

[Quyết định chỉ Qwen/Ollama](../chat-qwen-only.md) đã gỡ provider cloud ngày 26/10; các evidence lịch sử nhắc adapter cũ không chứng minh tính năng hiện tại. Chưa chạy automated checks cho lượt gỡ này.

[US7 giai đoạn 3](../us7-phase3.md): code/runtime guards và fixtures đã chuẩn bị, chưa test/typecheck/build/E2E/eval, model/DB thật. Kết quả cũ không xác nhận bản mới.

[US7 giai đoạn 2 — guard](../us7-phase2.md): đã sửa source và chuẩn bị ca kiểm tra, chưa chạy tests/typecheck/build/E2E/eval, model thật hoặc index DB thật trong lượt này. Chờ người dùng tự thử; không coi source/test tồn tại là chứng minh an toàn đạt.

Thay đổi mới: [RAG index thủ công](../rag-manual-index.md). Chưa chạy CLI hoặc tests/typecheck/build/E2E/eval cho thay đổi này; không dùng kết quả refactor cũ để xác nhận runtime bản mới.

US7 giai đoạn 1 ngày 26/10: [code, migration Supabase và checklist tự thử](../us7-phase1.md). Migration đã áp dụng, dữ liệu cũ giữ nguyên; chưa chạy test/typecheck/build/E2E/eval cho bản mới, chờ người dùng tự thử.

| Bằng chứng | Trạng thái |
| :-- | :-- |
| [US-1: local, Supabase và human review](us1-verification.md) | 130 tests, typecheck/build và E2E 5/5 đạt; migration Supabase xong; human review đã ghi một phần, còn ca cần bổ sung |
| [Refactor RAG theo repo tham chiếu](rag-refactor-verification.md) | 141 workspace tests, typecheck/build và chat E2E 2/2 đạt với fixture; chưa nghiệm thu toàn bộ US-7 hoặc semantic model thật |
| [Kiểm chứng source/test và smoke auth](verification.md) | Domain 41/41, frontend 15/15, backend adapter/lock 6/6; auth smoke cô lập đạt, ngày 25/10/2026 |
| Evaluation AI ≥20 ca, trước/sau cải tiến | [Manual-live-v1](us7-manual-evaluation.md): 20/20 theo người dùng sau cập nhật prompt, baseline riêng chưa có số liệu; bộ snapshot vẫn NOT_RUN |
| Tokens/cost/latency, guardrails/fallback demo | Fallback/phục hồi đã được người dùng xác nhận; injection gián tiếp thiếu mô tả cụ thể, số đo cost/latency cho bản nộp còn cần bổ sung |
| Container/deploy và hồ sơ PDF/slide/video | Chưa xác nhận hoàn tất; xem [backlog](../backlog.md) |
| Human review | US7 đã được người dùng nghiệm thu/đóng; không suy ra các module khác hoặc toàn dự án đã nghiệm thu. Xem [AI_USAGE](../../AI_USAGE.md) |

Mỗi bằng chứng cần ngày, commit, môi trường/config đã che secret, lệnh/kịch bản và expected/actual result. Không đưa token/key, URI DB, password, backup hoặc PII vào repo. Tách source inspection, unit/API/E2E, AI eval, deploy và human review; không lấy mock/build làm bằng chứng provider thật.

Script [llm-smoke-test.mjs](../../scripts/llm-smoke-test.mjs) có thể tạo output thí nghiệm nhưng không thay eval của ứng dụng. Chỉ đưa output liên quan bản nộp vào đây, cập nhật hoặc đo lại khi source thay đổi.
