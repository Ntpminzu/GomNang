# ADR-002 — RAG nguồn công khai và câu trả lời có trích dẫn

- Ngày ghi nhận: 25/10/2026.
- Trạng thái: **Implemented** ở mức pipeline; chưa có eval đầy đủ, human review chờ.
- Liên quan: US-7, AI-01…AI-06, NFR-04; đây là ADR về AI.

## Bối cảnh

Người dùng hỏi thông tin thay đổi theo dự án. Model không có sẵn dữ liệu hiện tại và không được tự đoán trạng thái/số tiền. Cần nguồn mở lại được, giới hạn context và không lấy bản nháp của người khác.

## Lựa chọn thể hiện trong code

Projector chọn các trường dự án công khai cùng hướng dẫn website. Chunk theo từ với mục tiêu 800 ký tự, overlap khoảng 120; embedding 1024 chiều qua Ollama; pgvector cosine search tối đa 5 nguồn, similarity lớn hơn 0,35. Chat có hai adapter Ollama/Gemini; embeddings vẫn Ollama cho cả hai. System guidance yêu cầu chỉ dựa nguồn, không đủ thì nói rõ. Service kiểm số citation và widget hiện link nguồn.

Đây là **baseline cấu hình đang có**, chưa là kết luận 800/120/top-5/0,35 hay model mặc định tối ưu. Trích dẫn hợp lệ về số không bảo đảm khẳng định đúng với nguồn.

## Phương án thay thế và trade-off

| Phương án | Lợi ích | Đánh đổi |
| :-- | :-- | :-- |
| RAG hiện tại | Context có nguồn, có thể cập nhật cùng dữ liệu app; phù hợp capability A | Tốn embedding, retrieval có thể sai; thêm độ trễ và phụ thuộc Ollama |
| Chỉ đưa toàn bộ dữ liệu vào prompt | Luồng ban đầu đơn giản | Context tăng, tốn tokens; vẫn phải kiểm quyền, không có vector search theo đề |
| Model trả lời từ kiến thức sẵn | Ít thành phần ứng dụng | Không biết dữ liệu thật hiện tại, khó truy nguồn và không đạt RAG |
| Chỉ keyword search + template | Dễ dự đoán, có ích cho danh mục/hướng dẫn cụ thể | Hạn chế câu diễn đạt khác và không đủ embeddings/vector search |

Phân tích nhằm giải thích code hiện có; chưa benchmark từng phương án. Nhánh danh mục/lời chào hiện dùng quy tắc, tách khỏi nhánh LLM để không giả số lượt model.

## Hệ quả và kiểm chứng cần bổ sung

- Sync hash/model trong request tránh embed lại chunk không đổi nhưng câu đầu có thể chậm; queue hiện chỉ trong một tiến trình.
- Top-k có thể bỏ sót nguồn; giảm ngưỡng có thể đưa nguồn không liên quan. Cần eval, không chỉnh theo cảm giác rồi ghi đạt.
- Cần ít nhất 20 ca thường/biên/từ chối; chạy baseline và sau một thay đổi, cố định snapshot/model/config, kiểm nguồn hỗ trợ nội dung.
- Test nguồn riêng, injection trong câu hỏi/nguồn, không có dữ kiện, chunk đổi, provider down; giữ số đo riêng với mock adapter.
- Test retrieval đang dùng interface cũ, cần sửa trước khi dùng làm bằng chứng; test cần cập nhật trước nghiệm thu.
- Prompt cần tách file/config và log version; PII trong văn bản/history chưa có bằng chứng đã lọc.

Sources: [retrieval](../../be/src/modules/chat/chat.retrieval.ts), [service](../../be/src/modules/chat/chat.service.ts), [embedding](../../be/src/modules/chat/chat.embedding.ts), [ChatWidget](../../fe/src/presentation/modules/chat/ChatWidget.tsx), [tests](../../be/tests/integration/chat-retrieval.test.ts), [AI design](../ai-design.md).

## Khi xem lại

Khi eval cho thấy sai nguồn/từ chối sai, context thiếu hoặc latency tăng; so sánh thay một yếu tố với cùng bộ eval. Năng lực AI thứ hai là quyết định khác, không được suy từ ADR này.
