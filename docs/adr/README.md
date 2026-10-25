# Architecture Decision Records — GOM NẮNG

Ngày lập bộ ADR: 25/10/2026. Các ADR-001…003 giải thích lựa chọn thể hiện trong source và các trade-off, không phải bằng chứng đã benchmark mọi phương án. Khanh/An cần đọc và ghi xác nhận; chỉ ghi Accepted khi nhóm đã xác nhận.

| ADR | Nội dung | Trạng thái |
| :-- | :-- | :-- |
| [001](001-postgresql-pgvector.md) | PostgreSQL + pgvector, PGlite cho môi trường phù hợp | Implemented — ghi nhận source; human review chờ |
| [002](002-cited-rag.md) | RAG nguồn công khai, chunking/retrieval/citation | Implemented — cấu hình baseline chưa được eval đầy đủ |
| [003](003-shared-domain.md) | Shared domain, backend giữ quyền kiểm tra cuối | Implemented — ghi nhận source; human review chờ |
| [004](004-structured-assessment.md) | Structured output cho người gác cổng hồ sơ (capability AI thứ hai) | Implemented 25/10/2026 — chờ An xác nhận trong human review US-8 |
| [005](005-project-soft-delete.md) | Xoá dự án: chỉ bản nháp, xoá mềm (Q-03) | Implemented 25/10/2026 — chờ human review US-2 |

`Proposed`: phương án chưa chốt. `Implemented`: tìm thấy trong source, không đồng nghĩa đã đo hoặc deploy đạt. `Accepted`: chỉ ghi khi nhóm thực sự xác nhận, kèm ngày/người. `Superseded`: liên kết ADR thay thế, giữ lịch sử.

Năng lực AI thứ hai đã chốt ngày 25/10/2026 là **Structured output** ([ADR-004](004-structured-assessment.md)). Phân tích các phương án ở [ai-design](../ai-design.md#7-năng-lực-ai-thứ-hai-chưa-quyết-định).

Mỗi ADR mới cần: trạng thái/ngày/owner, bối cảnh và ràng buộc, lựa chọn, phương án thay thế, lý do và trade-off, hệ quả, bằng chứng source/test và điều kiện xem lại. Ghi rõ đâu là phân tích hiện tại, đâu là quyết định đã được con người thông qua.
