# Architecture Decision Records — GomNang

Cập nhật 27/10/2026. Bộ ADR gồm **6 quyết định**, 3 quyết định về AI, đối chiếu với source hiện tại.

| ADR | Tiêu đề | Owner | Nội dung |
| :-- | :-- | :-- | :-- |
| [ADR-001](001-feature-based-backend.md) | Transition from Layer-Based to Feature-Based Backend Architecture | An | Tổ chức backend theo module chức năng, giữ phân tầng route/controller/service/repository bên trong module |
| [ADR-002](002-llm-selection.md) | Selection of Large Language Model for AI Chatbot | An | Chọn Qwen3 4B qua Ollama theo chất lượng, tốc độ, chi phí và quyền riêng tư |
| [ADR-003](003-rag-pipeline.md) | RAG Pipeline Design and Retrieval Strategy | An | Nguồn công khai, chunking, embedding, pgvector, top-K, ngưỡng truy xuất và citation |
| [ADR-004](004-structured-assessment.md) | Structured Output for the Verification Gatekeeper | Khanh | Capability AI thứ hai: JSON Schema + Zod, AI chỉ nâng cảnh báo, prompt v4 + temperature 0 |
| [ADR-005](005-project-soft-delete.md) | Soft Delete for Draft Projects | Khanh | Chỉ xoá bản nháp, xoá mềm để giữ sổ ghi vết chỉ ghi thêm (Q-03) |
| [ADR-006](006-receipt-storage.md) | Store Expense Receipts in PostgreSQL | Khanh | Chứng từ chi lưu trong bảng `files`, quyền xem theo trạng thái khoản chi (Q-04) |

Mỗi ADR có cùng khuôn: bối cảnh, các phương án, quyết định, lý do lựa chọn, hệ quả và giới hạn, bằng chứng và điều kiện xem lại. Trạng thái **Implemented** ghi nhận thiết kế đã có trong code; không tự chứng minh benchmark, nghiệm thu hoặc mọi kiểm thử đều đạt. Ngày trên ADR là ngày lập bản ghi.

Lịch sử: ngày 25/10/2026 bộ ADR gồm 6 bản (PostgreSQL/pgvector, cited RAG, shared domain, structured assessment, soft delete, receipt storage). Ngày 27/10/2026 An viết lại 3 bản đầu thành ADR-001…003 hiện tại; PostgreSQL/pgvector nằm trong ADR-003, shared domain nằm trong ADR-001 và [architecture](../architecture.md). Ba quyết định của Khanh được giữ thành ADR-004…006 theo cùng khuôn.
