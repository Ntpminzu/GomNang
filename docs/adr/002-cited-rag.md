# ADR-002 — RAG nguồn công khai và câu trả lời có trích dẫn

- Ngày ghi nhận: 25/10/2026.
- Trạng thái: **Implemented** ở mức pipeline; chưa có eval đầy đủ, human review chờ.
- Liên quan: US-7, AI-01…AI-06, NFR-04; đây là ADR về AI.

## Bối cảnh

Người dùng hỏi thông tin thay đổi theo dự án. Model không có sẵn dữ liệu hiện tại và không được tự đoán trạng thái/số tiền. Cần nguồn mở lại được, giới hạn context và không lấy bản nháp của người khác.

## Lựa chọn thể hiện trong code

Projector chọn các trường dự án công khai cùng hướng dẫn website. Chunk theo từ với mục tiêu 800 ký tự, overlap khoảng 120; embedding 1024 chiều qua Ollama; pgvector cosine search tối đa 5 nguồn, similarity lớn hơn 0,35. Chat chỉ Qwen qua Ollama, không chọn provider khác. System guidance yêu cầu chỉ dựa nguồn, không đủ thì nói rõ. Service kiểm số citation và widget hiện link nguồn.

Đây là **baseline cấu hình đang có**, chưa là kết luận 800/120/top-5/0,35 hay model mặc định tối ưu. Trích dẫn hợp lệ về số không bảo đảm khẳng định đúng với nguồn.

## Phương án thay thế và trade-off

| Phương án | Lợi ích | Đánh đổi |
| :-- | :-- | :-- |
| RAG hiện tại | Context có nguồn, có thể cập nhật cùng dữ liệu app; phù hợp capability A | Tốn embedding, retrieval có thể sai; thêm độ trễ và phụ thuộc Ollama |
| Chỉ đưa toàn bộ dữ liệu vào prompt | Luồng ban đầu đơn giản | Context tăng, tốn tokens; vẫn phải kiểm quyền, không có vector search theo đề |
| Model trả lời từ kiến thức sẵn | Ít thành phần ứng dụng | Không biết dữ liệu thật hiện tại, khó truy nguồn và không đạt RAG |
| Chỉ keyword search + template | Dễ dự đoán, có ích cho danh mục/hướng dẫn cụ thể | Hạn chế câu diễn đạt khác và không đủ embeddings/vector search |

Phân tích nhằm giải thích code hiện có; chưa benchmark từng phương án. US7 giai đoạn 1 ngày 26/10 đã bỏ nhánh danh mục/lời chào riêng. Model sinh JSON nội bộ, backend kiểm schema/citation; không tính envelope nhỏ này thành capability US8. Top-k chỉ hỗ trợ liệt kê theo nguồn tìm được, không chứng minh danh sách đầy đủ/tổng số.

## Hệ quả và kiểm chứng cần bổ sung

Quyết định mới ngày 26/10 thay thế các ghi nhận tự sync bên dưới: dùng [lệnh index thủ công](../rag-manual-index.md), chat được phép dùng nội dung cũ. Giữ pgvector và SQL public-status filter; không kiểm freshness nội dung từng lượt. CLI có session lock, chỉ embedding phần đổi và atomic upsert/prune; không schema/seed/reset. Prompt chat hiện là `gomnang-rag-v2`. Các đoạn về sync trong request ở dưới là bối cảnh refactor trước quyết định này.

- Sync hash/model trong request tránh embed lại chunk không đổi nhưng câu đầu có thể chậm; queue hiện chỉ trong một tiến trình.
- Refactor 25/10 giữ pgvector/tự sync, tách `answerQuestion`, helper history/query/messages/citation và SQL repository theo [cấu trúc RAG](../rag-structure.md). Query ghép tối đa hai câu user trước; SQL lọc trạng thái công khai trước LIMIT. Không copy index JSON hoặc quy tắc Section 11 của Lumen.
- Top-k có thể bỏ sót nguồn; giảm ngưỡng có thể đưa nguồn không liên quan. Cần eval, không chỉnh theo cảm giác rồi ghi đạt.
- Cần ít nhất 20 ca thường/biên/từ chối; chạy baseline và sau một thay đổi, cố định snapshot/model/config, kiểm nguồn hỗ trợ nội dung.
- Test nguồn riêng, injection trong câu hỏi/nguồn, không có dữ kiện, chunk đổi, provider down; giữ số đo riêng với mock adapter.
- Test retrieval/index/helper theo interface mới, dùng fixture; cần eval và provider thật trước nghiệm thu.
- Giai đoạn 1 thêm version chat/query, metadata DB và trạng thái/UI từ chối/lỗi. Chưa có guard đầy đủ văn bản/history/nguồn hoặc kiểm output lộ prompt; chưa nghiệm thu model thật. Cho phép liên hệ cố ý công khai trong nội dung dự án, vẫn loại dữ liệu tài khoản/secret/ngoài phạm vi công khai.

Sources: [retrieval](../../be/src/modules/chat/chat.retrieval.ts), [service](../../be/src/modules/chat/chat.service.ts), [embedding](../../be/src/modules/chat/chat.embedding.ts), [ChatWidget](../../fe/src/presentation/modules/chat/ChatWidget.tsx), [tests](../../be/tests/integration/chat-retrieval.test.ts), [AI design](../ai-design.md).

## Khi xem lại

Khi eval cho thấy sai nguồn/từ chối sai, context thiếu hoặc latency tăng; so sánh thay một yếu tố với cùng bộ eval. Năng lực AI thứ hai là quyết định khác, không được suy từ ADR này.
