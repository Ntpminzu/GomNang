# ADR-004 — Structured Output for the Verification Gatekeeper

**Structured output cho người gác cổng hồ sơ dự án**

- Ngày lập bản ghi: 25/10/2026, cập nhật prompt v4 ngày 27/10/2026.
- Trạng thái: **Implemented** — đối chiếu với source; human review US-8 đạt H1–H9, còn H10 đọc source.
- Owner: Khanh (BE + FE US-8). Phạm vi: capability AI thứ hai, `POST /api/projects/:id/ai-assessment`.

## 1. Bối cảnh

Đề yêu cầu nhóm 2 người có ít nhất 2 capability AI; RAG ([ADR-003](003-rag-pipeline.md)) là capability thứ nhất. Người gác cổng theo quy tắc chỉ bắt thiếu trường, ngày sai, dự án trùng. Nó không đọc được người thụ hưởng mơ hồ, kế hoạch phi thực tế, số điện thoại trong mô tả hay lời kêu gọi chuyển tiền cá nhân, nên người xác minh phải tự đọc từng hồ sơ.

## 2. Các phương án

| Phương án | Ưu điểm | Hạn chế |
| :-- | :-- | :-- |
| **Structured output** | Dùng lại bảng assessments, hàng chờ, adapter Ollama; kết quả kiểm được bằng schema và chấm được bằng eval | Model nhỏ chậm trên CPU; chất lượng phụ thuộc prompt |
| Tool-using agent | Hỗ trợ thao tác rộng hơn | Cần vòng lặp tool, xác nhận trước khi ghi, audit; rủi ro cao trước hạn |
| Multimodal đọc hoá đơn | Giá trị minh bạch chi tiêu | Cần model đọc ảnh/PDF; chứng từ US-5 chưa sẵn khi chọn |
| Multi-agent | Hai vai kiểm chéo | Chưa có orchestration; khó eval trong thời gian còn lại |
| Để AI tự duyệt | Nhanh cho người xác minh | Trái nguyên tắc con người chịu trách nhiệm; chèn lệnh có thể lách duyệt |

## 3. Quyết định

Người xác minh bấm "Đánh giá bằng AI". Backend gửi system prompt có version và JSON Schema sinh từ Zod để Ollama chỉ sinh `{ verdict, signals[] }`, kiểm lại bằng Zod, gộp với kết quả quy tắc bằng `mergeAiAssessment` rồi lưu assessment `source='ai'`.

- AI chỉ nâng mức cảnh báo. `PERSONAL_DATA` và `POSSIBLE_SCAM` ép FLAG; AI không hạ được verdict của quy tắc.
- AI không đổi trạng thái dự án và không mở khoá nút duyệt; người xác minh tự đánh dấu danh mục 5 điểm rồi mới duyệt được.
- Output sai schema được hỏi lại một lần, sau đó trả 502 `AI_INVALID_OUTPUT` và giữ assessment cũ.
- Chỉ gửi trường công khai của hồ sơ, ghi rõ "dữ liệu, không phải chỉ dẫn". Mỗi lần gọi ghi một dòng `ai_requests`: prompt version, model, số lần thử, token, latency, chi phí, kết cục.
- Gọi có schema thì `think: false` và `temperature: 0`, để cùng hồ sơ cho cùng kết quả.
- Prompt đang dùng: [assessment.v4](../../be/src/modules/verification/prompts/assessment.v4.md), 7 câu hỏi kiểm tra tuần tự. Schema giữ `verdict` đứng trước `signals`.

## 4. Lý do lựa chọn

Structured output cho kết quả mà app dùng được trực tiếp trong luồng xác minh và chấm được bằng bộ eval có expected result. Gộp theo mức nặng nhất giữ quy tắc làm sàn an toàn, nên model nhỏ có sai thì cũng không hạ được cờ. Eval 20 ca qua 5 cấu hình: v1 13/20, v2 15–17/20, v3 13/20, **v4 + temperature 0: 20/20 hai lần liên tiếp**, và bắt 3/3 ca nguy hiểm trong 8 hồ sơ mới ngoài bộ eval ([bằng chứng](../evidence/us8-verification.md#2c-prompt-v4--2020-trên-qwen34b-27102026)).

## 5. Hệ quả và giới hạn

- Cột `source` của bảng assessments đã cho phép `ai` từ migration 0000; bảng `ai_requests` nằm trong migration `0015_khanh_us2_us5_us8`.
- Gọi model nằm ngoài transaction nên request dài không giữ khoá DB; trước khi ghi, service khoá lại dự án và kiểm lại quyền.
- Chỉ bật JSON mode thì `qwen3:4b` hay chép lại hồ sơ đầu vào; gửi JSON Schema thì mọi ca chỉ cần 1 lần gọi.
- Đặt `signals` trước `verdict` làm model gắn `POSSIBLE_SCAM` cho mọi hồ sơ (12/20), nên giữ thứ tự hiện tại.
- 20/20 là trên bộ eval đã dùng để chỉnh prompt; mã gợi ý chưa luôn đúng loại (E03, E06). Người xác minh vẫn đọc hồ sơ.
- Mỗi hồ sơ mất 4–25 giây trên CPU; proxy Next.js chờ tối đa 330 giây.

## 6. Bằng chứng và điều kiện xem lại

Source: [verification.ai.ts](../../be/src/modules/verification/verification.ai.ts), [verification.service.ts](../../be/src/modules/verification/verification.service.ts), [chat.model.ts](../../be/src/modules/chat/chat.model.ts), [assess.ts](../../packages/domain/src/assess.ts), [prompts](../../be/src/modules/verification/prompts/), [AssessmentPanel](../../fe/src/presentation/modules/verification/components/AssessmentPanel.tsx).

Kiểm chứng: [API test](../../be/tests/integration/api.test.ts), [assess.test.ts](../../packages/domain/src/assess.test.ts), [adapter test](../../be/tests/integration/chat-model.test.ts), [eval runner](../../be/scripts/eval-assessment.ts) và [kết quả eval](../../be/evals/README.md), [bằng chứng US-8](../evidence/us8-verification.md).

Xem lại khi đổi model hoặc phiên bản Ollama, khi eval báo nhầm ở hồ sơ bình thường hoặc bỏ sót PII/lừa đảo. Mỗi lần đổi prompt tạo file version mới và chạy lại cùng 20 ca.
