# Kiến trúc hiện tại và hướng hoàn thiện — GOM NẮNG

Kiến trúc phục vụ bản nộp cuối kỳ, cập nhật source ngày 26/10/2026 sau US7 giai đoạn 1. Mô tả code không tự xác nhận deploy; riêng migration log đã có [ghi nhận](us7-phase1.md). Xem [requirements](requirements.md), [traceability](traceability.md) và [ADR](adr/README.md).

## 1. Sơ đồ hệ thống hiện tại

```mermaid
flowchart TB
    U["Trình duyệt"] --> FE["Next.js App Router<br/>Routes + presentation + libs/api"]
    FE -->|"HTTP /api, JWT khi cần<br/>Next rewrite"| API["Express + validation + auth"]
    API --> BIZ["Module service + repository"]
    BIZ --> DOMAIN["packages/domain<br/>validation, quyền, trạng thái, checklist"]
    BIZ --> DB[("PostgreSQL/Supabase hoặc PGlite<br/>Nghiệp vụ + chat_chunks vector 1024")]
    API --> CHAT["Chat service + retrieval"]
    CHAT --> PUB["Nguồn dự án công khai + CHAT_GUIDES"]
    PUB --> DB
    CHAT -->|"Đồng bộ chunk, tìm cosine"| DB
    CHAT --> EMB["Ollama embeddings"]
    CHAT --> LOCAL["Ollama chat"]
```

Một tiến trình backend chọn một môi trường DB: có `DATABASE_URL` thì PostgreSQL, không có thì PGlite. Supabase ở đây cung cấp PostgreSQL; không suy ra đã dùng Supabase Auth/Storage. Chat chỉ Qwen qua Ollama cho generation/embeddings; không AI cloud. Google OAuth vẫn phục vụ đăng nhập nghiệp vụ.

Frontend có mock adapter lưu dữ liệu demo trong trình duyệt. Mock không đi qua API/database, không gọi được chatbot và không là bằng chứng tích hợp.

## 2. Trách nhiệm các lớp

| Lớp | Source | Trách nhiệm |
| :-- | :-- | :-- |
| Route web | [fe/src/app](../fe/src/app) | Route mỏng, layout, trang hướng dẫn; nhiều màn nghiệp vụ tải dữ liệu phía client |
| Presentation | [fe/src/presentation](../fe/src/presentation) | Form, dashboard, bảng, dialog, hooks và trạng thái UI |
| HTTP/mock/session | [fe/src/libs](../fe/src/libs) | Chọn adapter, gửi request/JWT, xử lý lỗi và phiên |
| Composition root | [app.ts](../be/src/app.ts), [server.ts](../be/src/server.ts) | Khởi tạo dependencies, DB, model và mount routes |
| Feature modules | [be/src/modules](../be/src/modules) | Nghiệp vụ: route → middleware → controller → service → repository |
| Shared domain | [packages/domain/src](../packages/domain/src) | Types, validation, quyền, trạng thái, views và checklist quy tắc |
| Infrastructure | [be/src/infrastructure](../be/src/infrastructure) | DB driver/schema/migration, audit và logging |

Chat đi qua route → validation/auth → controller → service. Service điều phối helper RAG và retrieval; SQL chỉ mục nằm trong `chat.repository.ts`. Xem [luồng hàm và đối chiếu repo mẫu](rag-structure.md).

Next build có prerender trang tĩnh và render route động; không đồng nghĩa toàn bộ dữ liệu dự án được fetch và render ở server. Khi bảo vệ SSR/SSG, chỉ đúng trang, ví dụ `/help`, và output build thật.

## 3. Luồng tạo và xác minh dự án

1. `NewProjectPage`/`ProjectForm` → `use-project-form` → shared validation → adapter HTTP.
2. Next rewrite `/api/projects` sang backend; middleware xác thực JWT và kiểm body bằng Zod.
3. Service lấy actor từ phiên, kiểm business rules, transaction ghi `projects`, `need_items`, `audit_log`.
4. `POST /api/projects/:id/submit`: khóa dự án, kiểm lại quyền/dữ liệu, gọi `assessProject`, lưu assessment, chuyển `pending_verification` và ghi audit.
5. Người xác minh duyệt/trả lại qua `/review`; domain rule chặn xung đột lợi ích và bắt buộc lý do khi trả lại.

Nguồn: [projects.service.ts](../be/src/modules/projects/projects.service.ts), [verification.service.ts](../be/src/modules/verification/verification.service.ts), [assess.ts](../packages/domain/src/assess.ts). **Checklist hiện dùng quy tắc + Jaccard, không gọi LLM.** LLM gatekeeper chỉ là một phương án AI thứ hai ở [AI design](ai-design.md#7-năng-lực-ai-thứ-hai-chưa-quyết-định), chưa chọn.

## 4. Đường đi của một request RAG

```mermaid
sequenceDiagram
    participant U as Người dùng
    participant FE as ChatWidget
    participant API as Chat route/controller/service
    participant DB as PostgreSQL hoặc PGlite
    participant E as Ollama embeddings
    participant M as Model chat được chọn
    U->>FE: Gửi câu hỏi
    FE->>API: POST /api/chat, history và model
    API->>DB: Metadata pending
    API->>API: Validate input; chat Qwen cho khách
    API->>API: Guard câu hỏi và toàn history; vi phạm thì refused trước AI
    API->>API: Chọn history và dựng query có ngữ cảnh user
    API->>DB: Kiểm index cho embedding model hiện tại
    API->>E: Embed query có ngữ cảnh, không dùng đáp án cũ
    E-->>API: Query vector
    API->>DB: Lọc model/public-status, cosine, ngưỡng rồi top-k
    DB-->>API: Các đoạn nguồn
    API->>API: Guard title/excerpt/ID/URL của nguồn cũ
    alt Không còn nguồn hợp lệ
        API->>DB: Metadata completed/refused
        API-->>FE: Chưa đủ thông tin, status refused
    else Có nguồn
        API->>M: System prompt, history, nguồn và câu hỏi
        M-->>API: JSON nội bộ status, reply và metadata provider
        API->>API: Kiểm schema/trích dẫn; lọc sources được dẫn
        API->>DB: Metadata completed với kết quả cuối
        API-->>FE: Reply/sources, status/reasonCode/requestId/promptVersion hoặc lỗi
    end
    FE-->>U: Câu trả lời và link nguồn hoặc thông báo lỗi
```

Đây là pipeline chung; đã bỏ hai nhánh lời chào/danh mục trả lời cứng. Top 5 là chunk, không chứng minh danh sách đầy đủ/tổng số dự án. Model từ chối được thay bằng thông báo backend; JSON/schema/citation sai là failed, không publish output.

Index chạy riêng bằng `npm.cmd run rag:index`: nguồn công khai → chunks → embedding phần thay đổi → transaction upsert/prune. Request không đọc toàn danh mục, dựng chunk, đồng bộ index hoặc kiểm freshness nội dung. Theo lựa chọn người dùng, được trả lời từ bản index cũ; SQL vẫn lọc trạng thái công khai lúc truy vấn. Chi tiết [index thủ công](rag-manual-index.md).

Giai đoạn 2 thêm guard document trước chunking/chunk trước embedding và guard candidates cũ trước prompt/publish. Không tạo model classifier/judge mới hoặc thêm migration; contact công khai được giữ, nguồn có dấu hiệu không an toàn bị loại. Pattern guard có giới hạn, chưa được eval model thật. Xem [giai đoạn 2](us7-phase2.md).

Nguồn: [chat.service.ts](../be/src/modules/chat/chat.service.ts), [chat.retrieval.ts](../be/src/modules/chat/chat.retrieval.ts). Hiện trả JSON một lần, chưa streaming. Kiểm số trích dẫn hợp lệ chưa kiểm được tính đúng đắn của mọi khẳng định.

## 5. Dữ liệu và tính nhất quán

```mermaid
erDiagram
    users ||--o{ projects : coordinates
    projects ||--o{ need_items : contains
    projects ||--o{ contributions : receives
    need_items ||--o{ contributions : receives
    users ||--o{ contributions : contributes
    projects ||--o{ assessments : assessed
    projects ||--o{ audit_log : records
    projects ||--o{ project_updates : publishes
    projects ||--o{ expenses : records
    need_items ||--o{ expenses : funds
    projects ||--o{ chat_chunks : indexed
```

Quan hệ rút gọn dựa trên [schema.ts](../be/src/infrastructure/database/schema.ts). `chat_chunks.project_id` có thể null với hướng dẫn tĩnh. Upload/storage còn thiếu; không mô tả bảng hoặc thành phần chưa tồn tại như hiện thực.

Số lượng và số dư được tính từ đóng góp/khoản chi. Domain rules và constraints tách người ghi/người duyệt. Repository có khóa trong các luồng ghi cạnh tranh. Audit có cơ chế chống sửa/xóa trong migrations; phải kiểm tại đúng môi trường DB khi nộp, không suy ra migration đã chạy trên mọi deploy.

## 6. Xác thực, quyền và dữ liệu gửi model

- Hiện tại: Google cho user thường, bcrypt cho tài khoản mật khẩu; JWT HS256 có sid/purpose, phiên DB và thu hồi khi logout. Admin/verifier chỉ password; dev-login chỉ user khi môi trường cho phép và luôn tắt ở production. [Auth service](../be/src/modules/auth/auth.service.ts) đọc user và phiên hiện tại từ DB khi xác thực.
- Quyền theo dự án và `role=user/admin/verifier` nằm ở [rules.ts](../packages/domain/src/rules.ts). `identityVerified` giữ riêng điều kiện danh tính/tài chính. Auth có Google cho user, phiên server và admin cấp verifier; chi tiết [US-1 local](us1-local.md).
- Nguồn RAG chọn tên, mục tiêu, trạng thái, nhóm thụ hưởng, địa điểm, thời gian và nhu cầu của dự án công khai; không lấy email/passwordHash/phone của user làm context.
- Văn bản tự do/history có guard theo mẫu, chưa được chứng minh loại mọi PII/secret. Nội dung gửi Qwen/Ollama tới endpoint cấu hình, chỉ local khi endpoint thật sự local.
- API keys ở backend. Có HTTP log và bảng metadata riêng `chat_requests` với version/status/lần gọi/usage generation nếu provider báo. Không lưu nội dung hội thoại/nguồn; cost/embedding tokens/admin analytics còn thiếu.

Chính sách đích và test còn thiếu ở [ai-design](ai-design.md). Không khẳng định đã có hàm redact hoặc hạ địa chỉ tới phường nếu source chưa làm.

## 7. Triển khai và phụ thuộc

Dev: `npm.cmd run dev:be`, `npm.cmd run dev:fe` từ root. Mặc định FE 3000, BE 4000, Ollama URL 11434. PostgreSQL startup chỉ kiểm journal/hash, migration triển khai riêng; PGlite tự migrate. Seed vẫn tùy config và DB rỗng; không khởi động vào DB thật chỉ để kiểm tài liệu.

Có [Compose](../docker-compose.yml), Dockerfile FE/BE và [Render config](../render.yaml). Compose chưa truyền endpoint AI hoặc có service Ollama; DB dùng `postgres:17-alpine` trong khi [migration 0007](../be/drizzle/0007_enable_vector.sql) yêu cầu `vector`. Phải kiểm/bổ sung pgvector và kết nối Ollama chat/embeddings từ container trước khi xem đây là demo cuối kỳ đầy đủ.

Quy trình local/container/hosting, Supabase/PGlite và backup được gộp ở [deployment.md](deployment.md). Docker/hosting cần kiểm chứng trên môi trường dùng để nộp.

## 8. Quyết định kiến trúc

- [ADR-001: PostgreSQL và pgvector](adr/001-postgresql-pgvector.md).
- [ADR-002: Retrieval có nguồn và cấu hình RAG](adr/002-cited-rag.md).
- [ADR-003: Shared domain và backend kiểm quyền](adr/003-shared-domain.md).

ADR ghi lựa chọn, phương án thay thế, trade-off và bằng chứng source; không gán cho nhóm thử nghiệm chưa thực hiện. Các phần AI hỗ trợ và việc kiểm tra/chỉnh sửa được ghi theo module ở [AI_USAGE](../AI_USAGE.md).

## 9. Phần cần bổ sung theo đề

OAuth2/admin đã có source và kiểm tra local theo [US-1](us1-local.md), còn human review. RAG đã tách helper/controller/repository/config, thêm metadata/version/status ở [giai đoạn 1](us7-phase1.md), chờ tự thử. Xóa, pagination, real-time, upload, telemetry đầy đủ/dashboard AI, guardrails, eval 20 ca và năng lực AI thứ hai chưa hoàn thành.

Lộ trình ở [backlog](backlog.md); bằng chứng ở [traceability](traceability.md). Thiết kế đề xuất không phải xác nhận đã triển khai.
