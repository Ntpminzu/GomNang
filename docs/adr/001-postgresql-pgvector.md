# ADR-001 — PostgreSQL và pgvector trong cùng data store

- Ngày ghi nhận: 25/10/2026.
- Trạng thái: **Implemented**, đối chiếu source; human review chờ Khanh/An.
- Liên quan: US-2, US-7, NFR-02/06 trong [requirements](../requirements.md).

## Bối cảnh

Dự án có quan hệ user–project–need–contribution, thu chi và audit cần transaction. RAG cần lưu embeddings/metadata nguồn. Nhóm hai người cần cách chạy dev/test và triển khai có thể giải thích được.

## Lựa chọn thể hiện trong code

Dùng Drizzle với PostgreSQL và extension `vector`; bảng `chat_chunks` lưu vector 1024 chiều trong cùng DB nghiệp vụ. `openDb` chọn PostgreSQL khi được truyền URL, còn lại mở PGlite. PGlite nạp extension pgvector riêng trước migration. Đây là hai môi trường khác nhau; test PGlite không chứng minh PostgreSQL/Supabase đã được migrate đúng.

## Phương án thay thế và trade-off

| Phương án | Lợi ích | Đánh đổi |
| :-- | :-- | :-- |
| PostgreSQL + pgvector hiện tại | Giảm số hệ thống, liên kết nguồn với dự án, tận dụng SQL/transaction | Phải cài extension ở môi trường demo; tìm vector chia tài nguyên với nghiệp vụ |
| PostgreSQL + vector DB riêng | Tách lưu trữ/tìm vector, mở đường tối ưu riêng | Thêm vận hành, đồng bộ quyền/xóa nguồn và kết nối; chưa có số đo chứng minh cần |
| Chỉ keyword/rule retrieval | Ít phụ thuộc model embedding | Không đáp ứng đầy đủ năng lực RAG gồm embeddings/vector search theo đề |

Bảng là phân tích cho bản nộp, không phải báo cáo thử nghiệm các hệ thống trên. Duy trì lựa chọn hiện hữu có lợi vì đã có code và giảm thay đổi trước hạn 27/10; chưa khẳng định nhanh hơn/rẻ hơn bằng số đo.

## Hệ quả và kiểm chứng

- Schema và model embedding phải thống nhất 1024 chiều; đổi chiều cần thiết kế migration/reindex có scope riêng.
- Index lưu hash/model để cập nhật chunk đổi; phải xóa nguồn không còn công khai và test quyền.
- PGlite persistent cần một tiến trình giữ DB, có file lock; database RAM chỉ dùng test.
- Compose đang chọn `postgres:17-alpine` và chưa mô tả đủ môi trường vector/model; cần kiểm/bổ sung trước demo. Không reset dữ liệu để thử.
- Chưa có benchmark quy mô/latency và bằng chứng container/deploy mới trong đợt này.

Sources: [client.ts](../../be/src/infrastructure/database/client.ts), [pglite.ts](../../be/src/infrastructure/database/pglite.ts), [schema.ts](../../be/src/infrastructure/database/schema.ts), [migration vector](../../be/drizzle/0007_enable_vector.sql), [chat vector store](../../be/drizzle/0008_chat_vector_store.sql), [lock test](../../be/tests/integration/database-lock.test.ts).

## Khi xem lại

Khi dữ liệu/tải tăng có số đo bottleneck, đổi embedding dimensions/model hoặc cần nhiều tiến trình; đánh giá lại truy vấn/index/vận hành dựa trên phép đo. Khanh/An cần xác nhận lý do lựa chọn và giới hạn trước bảo vệ.
