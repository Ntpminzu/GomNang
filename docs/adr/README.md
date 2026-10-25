# Architecture Decision Records — GOM NẮNG

Ngày lập bộ ADR: 25/10/2026. Các ADR-001…003 giải thích lựa chọn thể hiện trong source và các trade-off, không phải bằng chứng đã benchmark mọi phương án. Khanh/An cần đọc và ghi xác nhận; chỉ ghi Accepted khi nhóm đã xác nhận.

| ADR | Nội dung | Trạng thái |
| :-- | :-- | :-- |
| [001](001-postgresql-pgvector.md) | PostgreSQL + pgvector, PGlite cho môi trường phù hợp | Implemented — ghi nhận source; human review chờ |
| [002](002-cited-rag.md) | RAG nguồn công khai, chunking/retrieval/citation | Implemented — cấu hình baseline chưa được eval đầy đủ |
| [003](003-shared-domain.md) | Shared domain, backend giữ quyền kiểm tra cuối | Implemented — ghi nhận source; human review chờ |

`Proposed`: phương án chưa chốt. `Implemented`: tìm thấy trong source, không đồng nghĩa đã đo hoặc deploy đạt. `Accepted`: chỉ ghi khi nhóm thực sự xác nhận, kèm ngày/người. `Superseded`: liên kết ADR thay thế, giữ lịch sử.

Năng lực AI thứ hai vẫn **chưa quyết định**; không có ADR chấp nhận Structured output/tools/multimodal/multi-agent ở đợt này. Các phương án ở [ai-design](../ai-design.md#7-năng-lực-ai-thứ-hai-chưa-quyết-định).

Mỗi ADR mới cần: trạng thái/ngày/owner, bối cảnh và ràng buộc, lựa chọn, phương án thay thế, lý do và trade-off, hệ quả, bằng chứng source/test và điều kiện xem lại. Ghi rõ đâu là phân tích hiện tại, đâu là quyết định đã được con người thông qua.
