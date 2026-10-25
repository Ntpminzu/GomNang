# ADR-004 — Structured output cho người gác cổng hồ sơ

- Ngày: 25/10/2026. Owner: Khanh (BE + FE US-8).
- Trạng thái: **Implemented**. Accepted khi An ghi xác nhận trong human review của [US-8](../evidence/us8-verification.md).
- Liên quan: US-4, US-8, Q-01; đây là capability AI thứ hai.

## Bối cảnh

Đề yêu cầu nhóm 2 người có ít nhất 2 capability AI. RAG (US-7) là capability thứ nhất. Người gác cổng hiện chỉ kiểm theo quy tắc: thiếu trường, ngày sai, dự án trùng. Nó không đọc được nội dung như người thụ hưởng mơ hồ, kế hoạch phi thực tế, số điện thoại trong mô tả hay lời kêu gọi chuyển tiền cá nhân. Người xác minh phải tự đọc từng hồ sơ.

## Quyết định

Thêm capability **C — Structured output**. Người xác minh bấm "Đánh giá bằng AI"; request gửi kèm JSON Schema sinh từ Zod để provider chỉ sinh JSON `{ verdict, signals[] }`; backend kiểm lại bằng Zod; app gộp với kết quả quy tắc rồi lưu thành assessment `source='ai'`.

- AI chỉ nâng mức cảnh báo. `PERSONAL_DATA` và `POSSIBLE_SCAM` ép FLAG. AI không hạ được verdict của quy tắc.
- AI không đổi trạng thái dự án và không gửi email. Người xác minh vẫn quyết định.
- Output sai schema được hỏi lại một lần, sau đó trả 502 `AI_INVALID_OUTPUT` và giữ assessment cũ.
- Chỉ gửi trường công khai của hồ sơ. Prompt là file có version; log ghi version, model, số lần thử, latency.

## Phương án thay thế và trade-off

| Phương án | Lợi ích | Đánh đổi |
| :-- | :-- | :-- |
| C — Structured output (chọn) | Dùng lại assessment, hàng chờ, adapter Ollama/Gemini; kết quả kiểm được bằng schema và eval | Model nhỏ chạy chậm và hay sai khuôn lần đầu; chất lượng phụ thuộc prompt |
| B — Tool-using agent | Hỗ trợ thao tác rộng hơn | Cần vòng lặp tool, xác nhận trước khi ghi, audit; rủi ro cao trước hạn |
| D — Multimodal hóa đơn | Giá trị minh bạch chi tiêu | Phụ thuộc US-5 upload chưa xong |
| E — Multi-agent | Hai vai kiểm chéo | Chưa có orchestration; khó eval trong thời gian còn lại |
| Để AI tự duyệt | Nhanh cho người xác minh | Trái nguyên tắc con người chịu trách nhiệm; injection có thể lách duyệt |

## Hệ quả

- Cột `source` của bảng assessments đã cho phép `ai` từ migration 0000; không cần migration mới.
- Gọi model nằm ngoài transaction, nên request dài không giữ khóa DB. Trước khi ghi, service khóa lại dự án và kiểm lại quyền.
- Chỉ bật JSON mode (`format: 'json'`) thì qwen3:4b hay chép lại hồ sơ đầu vào, phải hỏi lại. Gửi JSON Schema ràng buộc lúc sinh để giảm số lần hỏi lại; xem eval ở [bằng chứng US-8](../evidence/us8-verification.md#2-evaluation-20-ca--trước-và-sau-đổi-prompt).
- Proxy `/api` của Next.js mặc định cắt sau 30 giây; đã nâng `proxyTimeout` lên 150 giây cho model chạy trên máy.
- qwen3:4b trên máy dev mất vài giây tới hơn một phút mỗi hồ sơ. Gemini cần key và gửi hồ sơ công khai tới Google.

Sources: [verification.ai.ts](../../be/src/modules/verification/verification.ai.ts), [verification.service.ts](../../be/src/modules/verification/verification.service.ts), [assess.ts](../../packages/domain/src/assess.ts), [prompts](../../be/src/modules/verification/prompts/), [AssessmentPanel](../../fe/src/presentation/modules/verification/components/AssessmentPanel.tsx), [eval](../../be/scripts/eval-assessment.ts).

## Khi xem lại

Khi eval cho thấy AI báo nhầm nhiều ở hồ sơ bình thường, bỏ sót PII/lừa đảo, hoặc khi đổi model mặc định. Mỗi lần đổi prompt phải tạo file version mới và chạy lại cùng 20 ca.
