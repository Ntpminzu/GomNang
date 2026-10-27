# ADR-002 — Selection of Large Language Model for AI Chatbot

**Lựa chọn mô hình LLM cho chatbot GomNang**

- Ngày lập bản ghi: 27/10/2026.
- Trạng thái: **Implemented** — phản ánh cấu hình và adapter hiện tại.
- Phạm vi: model sinh câu trả lời của chatbot; chiến lược embedding/retrieval ở [ADR-003](003-rag-pipeline.md).

## 1. Bối cảnh

Chatbot GomNang cần trả lời tiếng Việt về hướng dẫn sử dụng và dữ liệu dự án công khai. Model phải sử dụng nguồn do backend cung cấp, trích dẫn nguồn và từ chối khi không đủ thông tin. Nhóm cần cân đối chất lượng, tốc độ trên phần cứng hiện có, chi phí và dữ liệu gửi tới nơi chạy model.

Sau quyết định tinh gọn ngày 26/10/2026, chatbot chỉ giữ một đường gọi Qwen qua Ollama. Mục tiêu là giảm cấu hình và các nhánh xử lý provider, đồng thời có thể chạy demo với model do nhóm tự vận hành.

## 2. Tiêu chí lựa chọn

| Tiêu chí | Nhu cầu của GomNang |
| :-- | :-- |
| Chất lượng | Hiểu câu hỏi tiếng Việt, dùng đúng context, trả JSON nội bộ và dẫn nguồn |
| Tốc độ/tài nguyên | Có thể chạy trên máy demo; xử lý được trong giới hạn thời gian của ứng dụng |
| Chi phí | Không phụ thuộc hóa đơn API theo token để chạy bản demo local |
| Quyền riêng tư | Kiểm soát endpoint nhận câu hỏi, history và các trích đoạn nguồn |
| Tích hợp | Backend gọi được qua HTTP, lấy usage và xử lý timeout/lỗi provider |

## 3. Các phương án

| Phương án | Ưu điểm | Hạn chế |
| :-- | :-- | :-- |
| LLM cloud qua API | Không phải vận hành model trên máy demo; có thể thử model khác theo nhu cầu | Phụ thuộc mạng, quota, giá và chính sách provider; dữ liệu được gửi ra dịch vụ ngoài |
| **Qwen3 4B qua Ollama** | Giữ một adapter; tự quản lý endpoint; không có hóa đơn API theo token khi chạy local | Phụ thuộc RAM/VRAM/CPU/GPU; model nhỏ có thể suy luận sai và phản hồi chậm |
| Model local lớn hơn | Là phương án cần thử khi model hiện tại không đạt chất lượng | Cần thêm bộ nhớ/tài nguyên; chưa có benchmark đối chứng trong dự án |

Đây là phân tích phương án, không phải bảng xếp hạng chất lượng đã đo giữa các nhà cung cấp hoặc các kích thước model.

## 4. Quyết định

Sử dụng **`qwen3:4b` chạy qua Ollama** làm model generation mặc định của chatbot.

- Backend đọc `OLLAMA_BASE_URL` và `OLLAMA_MODEL`; mặc định model là `qwen3:4b`.
- Backend gọi Ollama `/api/chat`; frontend chỉ gọi API của GomNang.
- Chat dùng `stream: false`, `think: true` và JSON mode. Backend nhận toàn bộ kết quả rồi kiểm schema/nội dung/citation trước khi trả cho UI.
- Prompt tập trung trong `chat.config.ts`, hiện có version `gomnang-rag-v5`; metadata request ghi phiên bản prompt và thông tin model.
- Embedding là model riêng `qwen3-embedding:0.6b`, không sử dụng model generation thay cho model embedding.
- Không duy trì dropdown provider hoặc adapter cloud trong chatbot hiện tại.

Ollama là runtime phục vụ model; **Qwen3 là model**. Việc có thể đổi tên model qua biến môi trường không đồng nghĩa model thay thế đã được kiểm chứng.

## 5. Lý do lựa chọn

Qwen/Ollama phù hợp hướng triển khai hiện hữu và mục tiêu giữ hệ thống đơn giản cho nhóm hai người. Chạy tại máy nhóm giúp kiểm soát dữ liệu và tránh phụ thuộc API tính phí theo token. RAG cung cấp dữ liệu riêng của ứng dụng, nên model không cần tự biết thông tin dự án từ dữ liệu huấn luyện.

Lựa chọn này là sự cân đối theo phạm vi prototype, không phải kết luận Qwen3 4B có chất lượng cao nhất hoặc tốc độ tốt nhất. Chất lượng cuối cùng còn phụ thuộc nguồn, retrieval, prompt và kiểm output.

## 6. Hệ quả và giới hạn

- **Chất lượng:** RAG và schema giảm một số lỗi nhưng không bảo đảm câu trả lời đúng. Backend phải giữ cơ chế thiếu nguồn thì từ chối, kiểm citation và guardrails.
- **Tốc độ:** README ghi nhận chat trong Docker khoảng 88–113 giây/câu trên máy đã thử, có trường hợp chạm timeout. Đây là kết quả của môi trường đó, không phải tốc độ mặc định được bảo đảm.
- **Chi phí:** chạy local không có hóa đơn API; điện, phần cứng và vận hành vẫn có chi phí, chưa được đo trong dự án.
- **Quyền riêng tư:** chỉ giữ dữ liệu trong máy khi endpoint Ollama thực sự chạy local. Nếu trỏ tới máy từ xa thì câu hỏi, history được chọn và context vẫn đi tới endpoint đó. Không gửi dữ liệu tài khoản không cần thiết.
- **Triển khai:** backend container/hosting cần truy cập được Ollama và có sẵn cả model generation lẫn embedding. Deploy web/API thành công chưa chứng minh AI hoạt động.
- **Fallback:** khi model lỗi, UI báo lỗi rõ; các chức năng nghiệp vụ không phụ thuộc AI vẫn hoạt động. Không có cơ chế tự chuyển sang cloud.

## 7. Bằng chứng và điều kiện xem lại

Source: [env.ts](../../be/src/config/env.ts), [chat.model.ts](../../be/src/modules/chat/chat.model.ts), [chat.config.ts](../../be/src/modules/chat/chat.config.ts), [chat.service.ts](../../be/src/modules/chat/chat.service.ts), [chat.embedding.ts](../../be/src/modules/chat/chat.embedding.ts).

Kiểm chứng: [adapter tests](../../be/tests/integration/chat-model.test.ts), [manual evaluation](../evidence/us7-manual-evaluation.md), [README chạy Docker](../../README.md). Bộ thủ công được người dùng xác nhận 20/20; chưa có đầy đủ số liệu baseline và output/log đối chứng từng ca để khẳng định mức cải thiện hay so sánh model.

Xem lại khi latency không phù hợp demo, chất lượng không đạt bộ eval, phần cứng thay đổi hoặc cần triển khai AI trên hosting. Khi đổi model, chạy lại cùng dataset và ghi model, prompt, phần cứng, pass rate, latency, tokens và phạm vi chi phí.
