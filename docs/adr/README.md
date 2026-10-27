# Architecture Decision Records — GomNang

Cập nhật 27/10/2026. Bộ ADR phục vụ báo cáo gồm đúng **3 quyết định**, đối chiếu với source hiện tại.

| ADR | Tiêu đề | Nội dung |
| :-- | :-- | :-- |
| [ADR-001](001-feature-based-backend.md) | Transition from Layer-Based to Feature-Based Backend Architecture | Tổ chức theo module chức năng, giữ phân tầng route/controller/service/repository bên trong module |
| [ADR-002](002-llm-selection.md) | Selection of Large Language Model for AI Chatbot | Chọn Qwen3 4B qua Ollama theo chất lượng, tốc độ, chi phí và quyền riêng tư |
| [ADR-003](003-rag-pipeline.md) | RAG Pipeline Design and Retrieval Strategy | Nguồn công khai, chunking, embedding, pgvector, top-K, ngưỡng truy xuất và citation |

Mỗi ADR có bối cảnh, phương án thay thế, quyết định, lý do, hệ quả và bằng chứng source/test. Trạng thái **Implemented** ghi nhận thiết kế đã có trong code; không tự chứng minh benchmark, nghiệm thu hoặc mọi kiểm thử đều đạt. Ngày trên ADR là ngày lập bản ghi, không suy thành ngày triển khai thay đổi.

Các quyết định Structured assessment, xóa mềm và lưu chứng từ được giữ tại [ghi chú hiện thực nghiệp vụ](../implementation-decisions.md), không còn đánh số ADR riêng. Nội dung PostgreSQL/pgvector được giải thích trong ADR-003; shared domain được nhắc trong ADR-001 và [architecture](../architecture.md).
