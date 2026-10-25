# Bằng chứng cho yêu cầu cuối kỳ

| Bằng chứng | Trạng thái |
| :-- | :-- |
| [US-1: local, Supabase và human review](us1-verification.md) | 130 tests, typecheck/build và E2E 5/5 đạt; migration Supabase xong; human review đã ghi một phần, còn ca cần bổ sung |
| [US-2: tạo/sửa/xoá dự án và human review](us2-verification.md) | 142 tests, typecheck/build và E2E 7/7 đạt; xoá mềm bản nháp theo Q-03; human review chờ người kiểm điền |
| [US-8: đánh giá hồ sơ bằng AI, eval 20 ca và human review](us8-verification.md) | 139 tests, typecheck/build và E2E 6/6 đạt; eval `qwen3:4b` 13/20 → 15/20 sau đổi cách gọi và prompt; Gemini chưa kiểm được; human review chờ người kiểm điền |
| [Kiểm chứng source/test và smoke auth](verification.md) | Domain 41/41, frontend 15/15, backend adapter/lock 6/6; auth smoke cô lập đạt, ngày 25/10/2026 |
| Evaluation AI ≥20 ca, trước/sau cải tiến | Capability 2 (US-8) có [eval 20 ca trước/sau](us8-verification.md#2-evaluation-20-ca--trước-và-sau-đổi-prompt). RAG (US-7) chưa có; thiết kế ở [AI design](../ai-design.md#6-thiết-kế-evaluation-và-telemetry-cần-bổ-sung) |
| Tokens/cost/latency, guardrails/fallback demo | Chưa có số đo/runtime evidence đủ cho bản nộp |
| Container/deploy và hồ sơ PDF/slide/video | Chưa xác nhận hoàn tất; xem [backlog](../backlog.md) |
| Human review | Chủ module chưa ghi xác nhận hoàn tất; xem [AI_USAGE](../../AI_USAGE.md) |

Mỗi bằng chứng cần ngày, commit, môi trường/config đã che secret, lệnh/kịch bản và expected/actual result. Không đưa token/key, URI DB, password, backup hoặc PII vào repo. Tách source inspection, unit/API/E2E, AI eval, deploy và human review; không lấy mock/build làm bằng chứng provider thật.

Script [llm-smoke-test.mjs](../../scripts/llm-smoke-test.mjs) có thể tạo output thí nghiệm nhưng không thay eval của ứng dụng. Chỉ đưa output liên quan bản nộp vào đây, cập nhật hoặc đo lại khi source thay đổi.
