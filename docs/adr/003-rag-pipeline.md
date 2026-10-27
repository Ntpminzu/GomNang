# ADR-003 — RAG Pipeline Design and Retrieval Strategy

**Thiết kế pipeline RAG và chiến lược truy xuất nguồn dữ liệu**

- Ngày lập bản ghi: 27/10/2026.
- Trạng thái: **Implemented** — các thông số dưới đây phản ánh source hiện tại, chưa được chứng minh tối ưu.
- Liên quan: US-7; lựa chọn model generation ở [ADR-002](002-llm-selection.md).

## 1. Bối cảnh

LLM không tự biết dữ liệu dự án GomNang và có thể tạo thông tin không có thật. Chatbot cần tìm nguồn thuộc ứng dụng, chỉ sử dụng dữ liệu được phép công khai và giúp người dùng mở lại nguồn để kiểm tra. Đưa toàn bộ dữ liệu vào mỗi request làm context tăng theo số dự án; chỉ tìm từ khóa có thể bỏ sót cách diễn đạt khác nhau.

## 2. Các phương án

| Phương án | Ưu điểm | Hạn chế |
| :-- | :-- | :-- |
| Trả lời bằng kiến thức sẵn của LLM | Ít thành phần | Không biết dữ liệu riêng của GomNang; khó truy nguồn |
| Đưa toàn bộ dữ liệu vào prompt | Luồng ban đầu đơn giản | Context tăng, lẫn dữ liệu không liên quan và vẫn cần lọc quyền |
| Chỉ keyword search và template | Dễ dự đoán cho một số câu hỏi | Hạn chế diễn đạt ngữ nghĩa; không có đủ embeddings/vector search theo yêu cầu RAG |
| **RAG với embedding và pgvector** | Chọn đoạn liên quan, giới hạn context và giữ metadata nguồn | Phụ thuộc model embedding, chất lượng truy xuất và việc cập nhật index |

## 3. Quyết định

Sử dụng RAG gồm hai luồng tách biệt: **lập chỉ mục thủ công** và **trả lời câu hỏi trên chỉ mục đã có**. Lưu vector trong bảng `chat_chunks` của database ứng dụng bằng pgvector, thay vì vận hành thêm một vector database riêng.

### 3.1. Nguồn dữ liệu

- Hướng dẫn website trong `CHAT_GUIDES`.
- Nội dung dự án thuộc các trạng thái công khai: `published`, `in_progress`, `completed`, `cancelled`.
- Document dự án gồm tên, trạng thái, mục tiêu, nhóm thụ hưởng, địa điểm, thời gian và các nhu cầu đóng góp.
- Không lập chỉ mục bảng tài khoản, mật khẩu, JWT hay dự án nháp/chờ xác minh. Document hiện không cung cấp tiền thực nhận hoặc số dư theo thời gian thực.

### 3.2. Thông số đang sử dụng

| Thành phần | Giá trị/chiến lược | Lý do và đánh đổi |
| :-- | :-- | :-- |
| Chunk size | Mục tiêu tối đa **800 ký tự**, chia theo từ | Giữ đoạn tương đối ngắn; đoạn quá ngắn mất ngữ cảnh, quá dài pha nhiều nội dung |
| Chunk overlap | Khoảng **120 ký tự**, giữ theo ranh giới từ | Giữ ngữ cảnh gần điểm cắt; tạo phần trùng và thêm chi phí embedding/lưu trữ |
| Embedding model | **`qwen3-embedding:0.6b`** qua Ollama | Tách biểu diễn ngữ nghĩa khỏi model generation; phụ thuộc endpoint và model đã tải |
| Vector dimensions | **1024** | Adapter kiểm đúng số chiều, khớp schema `chat_chunks` |
| Query embedding | Thêm instruction riêng cho câu hỏi | Hướng embedding tìm đoạn hướng dẫn/dự án phù hợp |
| Vector search | **Cosine distance** với pgvector | Sắp xếp theo độ gần vector; không đồng nghĩa đo độ đúng của câu trả lời |
| Ngưỡng nhận nguồn | **Similarity > 0,35**, tương đương distance < 0,65 | Loại kết quả quá xa; có thể bỏ sót nguồn hữu ích hoặc vẫn nhận nguồn nhiễu |
| Top-K | Tối đa **5 chunk** | Giới hạn context; có thể thiếu nguồn khi câu hỏi cần nhiều đoạn |
| Batch embedding khi index | Tối đa **32 chunk/lần** | Chia khối xử lý tài liệu thay đổi; chưa có benchmark chứng minh batch tối ưu |

800/120 là số **ký tự**, không phải token. Chunking giữ nguyên từ, nên một từ dài hơn giới hạn có thể tạo chunk vượt 800 ký tự. Top-K tính theo chunk, không phải số dự án khác nhau; nhiều chunk có thể thuộc cùng một dự án.

### 3.3. Lập chỉ mục

```text
CHAT_GUIDES + dự án công khai
→ tạo document → kiểm nguồn → chunking 800/120
→ so content hash và embedding model
→ embedding các chunk mới/thay đổi
→ lưu vector + metadata và loại chunk không còn trong nguồn
```

Chạy `npm.cmd run rag:index` khi chuẩn bị nguồn lần đầu hoặc sau khi nội dung thay đổi. CLI dùng session lock để tránh hai lượt index cùng chạy và lưu thay đổi bằng transaction. Metadata gồm ID chunk, projectId, title, URL, content, hash, embedding model và thời điểm cập nhật.

Không index trong request hỏi đáp. Thiết kế này giảm công việc cập nhật nguồn trên đường trả lời, đổi lại dữ liệu có thể cũ cho tới lần index tiếp theo. Đổi system prompt không tự yêu cầu reindex; đổi embedding model hoặc số chiều cần kiểm tương thích và lập lại chỉ mục phù hợp.

### 3.4. Truy xuất và trả lời

```text
Câu hỏi + history hợp lệ → guard đầu vào
→ tạo câu truy xuất → query embedding
→ lọc model và trạng thái công khai tại database
→ cosine search, ngưỡng > 0,35, top 5 chunk
→ kiểm nguồn → prompt + context → Qwen
→ kiểm JSON/nội dung/citation → trả câu trả lời và link nguồn
```

Với câu nối tiếp, query có thể ghép tối đa hai câu hỏi user trước; câu đổi chủ đề không tự ghép history. History gửi model tối đa 6 message, tổng 4000 ký tự và mỗi message tối đa 1000 ký tự. History giúp hiểu tham chiếu, không được coi là bằng chứng.

SQL lọc embedding model và trạng thái công khai **trước khi lấy top-K**. Nếu index cho model chưa được chuẩn bị, backend báo `CHAT_INDEX_NOT_READY`. Nếu không tìm được nguồn phù hợp, backend từ chối và không gọi generation.

Model trả JSON nội bộ `{status, reply}`. Với `answered`, backend yêu cầu citation `[1]`, `[2]`… thuộc nguồn hiện tại; UI hiển thị link các nguồn được dẫn. Khi nguồn thiếu dữ kiện được hỏi, kể cả đã tìm đúng dự án, chatbot phải dùng `refused`. Nguồn top-K không chứng minh tổng số hoặc danh sách đầy đủ dự án.

## 4. Lý do lựa chọn

RAG gắn câu trả lời với dữ liệu ứng dụng và giúp người dùng kiểm tra nguồn. pgvector dùng chung PostgreSQL giúp nhóm không phải vận hành kho vector độc lập, đồng thời thuận tiện lọc trạng thái dự án bằng SQL. Cấu hình 800/120/top-5/0,35 là điểm khởi đầu cân đối context và phạm vi truy xuất cho prototype; cần evaluation để xác định nên điều chỉnh yếu tố nào.

## 5. Hệ quả và giới hạn

- Chỉ mục có thể cũ; chatbot phải nhắc kiểm tra trang dự án khi cần dữ liệu hiện tại. Bộ lọc công khai lúc query không đồng nghĩa kiểm freshness toàn bộ nội dung.
- Citation hợp lệ chỉ chứng minh mã trích dẫn nằm trong nguồn, chưa chứng minh từng khẳng định được nguồn hỗ trợ.
- Nguồn, câu hỏi và history đều là dữ liệu không đáng tin; cần guard injection và kiểm output. Guard theo mẫu có thể bỏ sót hoặc chặn nhầm.
- Embedding và generation làm tăng latency; tăng top-K hoặc chunk size có thể tăng context và thời gian xử lý.
- Không có reranker hay hybrid keyword/vector search trong luồng hiện tại. Chỉ bổ sung khi kết quả eval cho thấy cần thiết.

## 6. Bằng chứng và điều kiện xem lại

Source: [chat.config.ts](../../be/src/modules/chat/chat.config.ts), [chunking/index/retrieval](../../be/src/modules/chat/chat.retrieval.ts), [SQL vector search](../../be/src/modules/chat/chat.repository.ts), [embedding adapter](../../be/src/modules/chat/chat.embedding.ts), [history và prompt context](../../be/src/modules/chat/chat.rag.ts), [chat.service.ts](../../be/src/modules/chat/chat.service.ts), [schema](../../be/src/infrastructure/database/schema.ts), [CLI index](../../be/scripts/index-chat.ts).

Kiểm thử: [retrieval](../../be/tests/integration/chat-retrieval.test.ts), [manual index](../../be/tests/integration/chat-manual-index.test.ts), [output](../../be/tests/integration/chat-output.test.ts), [guard](../../be/tests/integration/chat-guard.test.ts). [Bộ manual 20 ca](../evidence/us7-manual-evaluation.md) đã được người dùng xác nhận đạt; baseline riêng và một số đối chứng từng ca vẫn thiếu. Không dùng kết quả đó để khẳng định các thông số retrieval đã tối ưu.

Xem lại khi eval ghi nhận thiếu nguồn, sai nguồn, từ chối nhầm, dữ liệu tăng hoặc latency không phù hợp. Cố định dataset/model/snapshot, đổi từng yếu tố như chunk size, overlap, ngưỡng hoặc top-K và báo kết quả trước–sau.
