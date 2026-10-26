# Bằng chứng cho yêu cầu cuối kỳ

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
| Evaluation AI ≥20 ca, trước/sau cải tiến | Chưa có kết quả đáp ứng đề; thiết kế ở [AI design](../ai-design.md#6-thiết-kế-evaluation-và-telemetry-cần-bổ-sung) |
| Tokens/cost/latency, guardrails/fallback demo | Chưa có số đo/runtime evidence đủ cho bản nộp |
| Container/deploy và hồ sơ PDF/slide/video | Chưa xác nhận hoàn tất; xem [backlog](../backlog.md) |
| Human review | Chủ module chưa ghi xác nhận hoàn tất; xem [AI_USAGE](../../AI_USAGE.md) |

Mỗi bằng chứng cần ngày, commit, môi trường/config đã che secret, lệnh/kịch bản và expected/actual result. Không đưa token/key, URI DB, password, backup hoặc PII vào repo. Tách source inspection, unit/API/E2E, AI eval, deploy và human review; không lấy mock/build làm bằng chứng provider thật.

Script [llm-smoke-test.mjs](../../scripts/llm-smoke-test.mjs) có thể tạo output thí nghiệm nhưng không thay eval của ứng dụng. Chỉ đưa output liên quan bản nộp vào đây, cập nhật hoặc đo lại khi source thay đổi.
