# Architecture — GOM NẮNG

Phiên bản: tuần 2 (đề xuất). Cập nhật lại mỗi khi hiện thực khác thiết kế — mục 10 Course Guide yêu cầu sơ đồ phải khớp với code thật.

---

## 1. Sơ đồ hệ thống

```mermaid
flowchart TB
    subgraph EXP["EXPERIENCE"]
        WEB["Next.js web app<br/>public + quản trị<br/>responsive"]
    end

    subgraph IFACE["INTERFACE"]
        API["REST API<br/>Express 5 + Zod<br/>JSON"]
    end

    subgraph APP["APPLICATION"]
        DOMAIN["Business rules<br/>máy trạng thái dự án và đóng góp<br/>BR-001 BR-002 BR-003"]
        GATE["Gatekeeper service<br/>redact - prompt - validate - fallback"]
        AUTHZ["Authorization<br/>vai trò theo từng dự án"]
    end

    subgraph DATA["DATA"]
        PG[("PostgreSQL<br/>Supabase<br/>pgvector + pg_trgm")]
        OBJ[("Object storage<br/>bucket public<br/>bucket private")]
    end

    subgraph EXT["EXTERNAL SERVICES"]
        IDP["Supabase Auth<br/>Google OAuth"]
        LLM["LLM API<br/>Gemini hoặc Claude"]
        EMB["Embedding API"]
    end

    WEB -->|"HTTPS + JWT"| API
    WEB -->|"đăng nhập"| IDP
    API --> AUTHZ --> DOMAIN
    DOMAIN --> PG
    DOMAIN --> GATE
    GATE -->|"đã lọc dữ liệu cá nhân"| LLM
    GATE -->|"đã lọc dữ liệu cá nhân"| EMB
    GATE --> PG
    API -->|"signed URL"| OBJ
    API -->|"xác minh chữ ký JWKS"| IDP

    style GATE fill:#fff3cd,stroke:#d39e00
    style LLM fill:#fff3cd,stroke:#d39e00
    style EMB fill:#fff3cd,stroke:#d39e00
```

Khối tô vàng là **ranh giới AI**. Mọi thứ ngoài khối đó phải chạy được khi khối đó chết.

## 2. Đường đi của một thao tác — "Gửi dự án đi xác minh"

Đây là bước 2 trong vertical slice, và là đường đi phức tạp nhất của hệ thống.

```mermaid
sequenceDiagram
    autonumber
    participant U as Người điều phối
    participant FE as Next.js
    participant API as Express API
    participant DB as PostgreSQL
    participant G as Gatekeeper
    participant M as LLM API

    U->>FE: bấm "Gửi xác minh"
    FE->>API: POST /api/projects/{id}/submit<br/>Authorization Bearer JWT
    API->>API: verify JWT + kiểm tra vai trò coordinator của dự án này
    API->>DB: SELECT dự án + hạng mục nhu cầu + bằng chứng
    DB-->>API: dữ liệu dự án
    API->>API: quy tắc tĩnh - trường bắt buộc, BR-002, BR-003
    alt vi phạm quy tắc cứng
        API-->>FE: 422 kèm danh sách lỗi
    else qua quy tắc cứng
        API->>DB: UPDATE status = 'pending_verification' + ghi audit log
        API->>G: đánh giá dự án
        G->>G: LỌC dữ liệu cá nhân người thụ hưởng
        G->>M: prompt + schema JSON, timeout 20s
        alt model trả JSON hợp lệ
            M-->>G: verdict JSON
            G->>G: validate bằng Zod
        else lỗi, quá hạn, hoặc JSON sai
            G->>G: retry 1 lần rồi rơi về checklist quy tắc tĩnh
        end
        G->>DB: lưu assessment + nguồn "ai" hoặc "rules"
        API-->>FE: 200 + dự án kèm assessment
        FE-->>U: hiện checklist PASS / NEEDS_INFO / FLAG
    end
```

**Điểm cần nhớ khi bảo vệ:** model **không** ghi trạng thái dự án. Nó chỉ ghi một bản ghi `assessment`. Việc đổi trạng thái sang `published` chỉ xảy ra khi một người xác minh bấm duyệt. Đây là cách chặn prompt injection ở mức kiến trúc chứ không phải ở mức prompt.

## 3. Dữ liệu — mô hình rút gọn

```mermaid
erDiagram
    users ||--o{ project_members : "tham gia"
    projects ||--o{ project_members : "có"
    projects ||--o{ need_items : "khai báo"
    need_items ||--o{ contributions : "nhận"
    users ||--o{ contributions : "tạo"
    projects ||--o{ ledger_entries : "sổ thu chi"
    projects ||--o{ evidence_files : "bằng chứng"
    projects ||--o{ assessments : "đánh giá gác cổng"
    projects ||--o{ audit_log : "vết thay đổi"
    contributions ||--o{ audit_log : "vết thay đổi"

    users {
        uuid id
        text display_name
        text verification_status
        int reputation_score
    }
    projects {
        uuid id
        text name
        text status
        uuid coordinator_id
        uuid treasurer_id
        vector embedding
    }
    need_items {
        uuid id
        text label
        text unit
        numeric target_qty
        numeric committed_qty
        numeric delivered_qty
    }
    contributions {
        uuid id
        text kind
        numeric quantity
        text status
        uuid confirmed_by
    }
    audit_log {
        uuid id
        text entity
        text from_state
        text to_state
        uuid actor_id
        timestamptz at
    }
```

`audit_log` là bảng **chỉ ghi thêm** — không có API nào sửa hay xoá nó. Đây là cách hiện thực NFR "Minh bạch" của đề bài.

## 4. Dữ liệu KHÔNG được gửi ra mô hình bên ngoài

Danh sách này là hợp đồng. Hàm lọc phải có test riêng.

| Trường | Xử lý trước khi gửi |
| :-- | :-- |
| Họ tên đầy đủ người thụ hưởng | Bỏ hoàn toàn |
| Số điện thoại, email, số tài khoản | Bỏ hoàn toàn |
| Địa chỉ nhà người thụ hưởng | Hạ độ chi tiết còn phường/quận |
| Ảnh người thụ hưởng, ảnh giấy tờ | Không gửi, kể cả khi dùng model đa phương thức |
| Ảnh CCCD/thẻ sinh viên của thành viên | Không gửi |
| Nội dung tin nhắn riêng giữa thành viên | Không gửi |

Được gửi: tên dự án, mục tiêu, mô tả hoạt động, danh sách hạng mục nhu cầu, thời gian, địa điểm ở mức phường, loại nhóm thụ hưởng.

## 5. Quyết định triển khai

```mermaid
flowchart LR
    DEV["máy cá nhân<br/>docker compose"] --> GH["GitHub"]
    GH -->|"push nhánh main"| V["Vercel<br/>Next.js"]
    GH -->|"push nhánh main"| R["Render<br/>Docker image<br/>Singapore"]
    R --> S[("Supabase<br/>Postgres + Storage + Auth<br/>Singapore")]
    V -->|"gọi API"| R
```

**Chọn App Platform, đóng gói bằng Docker.**

| Tiêu chí (slide 31) | Lập luận |
| :-- | :-- |
| Problem fit | 1 API + 1 DB + 2 người + 8 tuần. Ràng buộc lớn nhất là **thời gian**, không phải lưu lượng |
| Evidence | Sẽ đo và trình 3 số: thời gian từ `git push` tới khi sống, p95 latency đo từ TP.HCM, chi phí thật một tháng |
| Trade-offs | Mất quyền kiểm soát hạ tầng và khả năng tinh chỉnh sâu. Được 0 giờ vận hành, TLS/scale/log có sẵn |
| Maturity | Mô hình PaaS đã chín từ 2007; không phải công nghệ đang thử nghiệm |
| Risk | Lock-in — hoá giải bằng Dockerfile: chuyển sang Cloud Run hay Kubernetes là đổi cấu hình, không viết lại |
| Alternatives | VM: tốn một tuần cho nginx/certbot/systemd/backup mà không được chấm điểm. Kubernetes: giải bài toán nhiều service nhiều team mà nhóm không có; control plane tốn tiền. Serverless functions: timeout ngắn xung khắc với request LLM 10–30 giây, và mỗi instance mở một connection Postgres nên phải thêm pooler |

**Bẫy đã biết:** gói miễn phí của Render cho service ngủ sau một khoảng không có traffic, đánh thức mất vài chục giây. Trước buổi demo phải xử lý bằng một trong hai cách: cron ping định kỳ, hoặc nâng gói trả phí đúng tuần đó. *Cần đo lại con số thật khi đăng ký, không lấy theo trí nhớ.*

## 6. Quyết định kỹ thuật đã chốt

| # | Quyết định | Lý do ngắn | Đảo ngược được? |
| :-- | :-- | :-- | :-- |
| D-01 | Hệ thống **không giữ tiền**, chỉ ghi sổ và đối chiếu biên lai | Cắt rủi ro pháp lý và PCI mà vẫn giữ giá trị minh bạch | Khó — ảnh hưởng toàn bộ mô hình |
| D-02 | Web trước, không làm app native | 2 người, 8 tuần | Dễ |
| D-03 | Postgres + pgvector, không thêm vector DB riêng | Một hệ thống ít hơn phải vận hành | Dễ |
| D-04 | LLM chỉ **đề xuất**, người xác minh **quyết định** | Chặn injection ở mức kiến trúc; giữ trách nhiệm ở con người | Không nên đảo |
| D-05 | Mọi lời gọi model đi qua một interface `ModelService` | Đổi provider không đụng vào business logic | — |
| D-06 | `audit_log` chỉ ghi thêm, không sửa không xoá | Hiện thực NFR minh bạch | Không nên đảo |
| D-07 | Express + Zod thay vì Fastify | Giữ số thứ lạ ở mức tối thiểu trong tuần bận nhất | Dễ |
| D-08 | Quy tắc nghiệp vụ tách thành `shared`, backend và frontend import chung | Một quy tắc chỉ có một bản code — form trên trình duyệt và API không thể lệch nhau | Dễ |
| D-09 | Dev và test dùng **PGlite** (PostgreSQL chạy nhúng trong Node) | Người mới clone về chạy ngay, không cài gì thêm. *Lúc chốt có ghi thêm lý do "Docker không bật được engine" — lý do đó sai: engine chỉ chưa được mở, và đã chạy ở Homework 4B.* | Dễ — cùng là PostgreSQL |
| D-10 | Tuần 4 phát token bằng `dev-login` (JWT HS256), chưa nối Supabase Auth | Đủ để kiểm quyền theo vai trò ngay bây giờ; endpoint bị tắt cứng khi `NODE_ENV=production` | Dễ |
| D-11 | Sổ ghi vết chặn UPDATE / DELETE / TRUNCATE bằng trigger trong PostgreSQL; BR-003 có thêm CHECK constraint | Chặn ngay ở database, không phụ thuộc việc code backend có nhớ kiểm hay không | Không nên đảo |
| D-12 | So trùng tên dự án bằng Jaccard viết trong JS, chưa dùng `pg_trgm` | Không cần extension, chạy giống hệt ở mock frontend, đủ nhanh tới vài nghìn dự án | Dễ — có ghi chú `ponytail:` trong code |
| D-13 | Số lượng cam kết / bàn giao / xác nhận luôn **tính** từ bảng đóng góp, không lưu thành cột | Con số trên màn hình không bao giờ lệch với sổ đóng góp | Dễ |
| D-14 | Frontend gọi thẳng backend; backend bật CORS cho đúng origin của web, không dùng thư viện `cors` | Web và API deploy ở hai nơi. CORS chỉ cần vài header; origin lạ không nhận header nào | Dễ — đổi sang proxy của Next nếu muốn cùng origin |
| D-15 | Bỏ mock API của 3B, thay bằng client `fetch` thật; test frontend chạy trên backend thật trong cùng tiến trình | Chỉ còn một đường code; frontend và backend lệch contract là test hỏng ngay | Dễ — mock vẫn nằm trong lịch sử git |
| D-16 | Backend nhận hai driver: PGlite khi không có `DATABASE_URL`, `node-postgres` khi có | Dev và test không cần cài gì; Docker Compose và bản deploy chạy PostgreSQL thật | Dễ |
| D-17 | Docker Compose chạy Postgres 17 thật, không dùng PGlite trong container | Chạy thử đúng đường code sẽ chạy trên Supabase trước khi deploy | Dễ |
| D-18 | Bật Row Level Security, không tạo policy, trên mọi bảng (migration `0002`) | Supabase tự mở schema `public` qua Data API cho ai có anon key. RLS không policy chặn đường đó; backend là chủ bảng nên không bị ảnh hưởng | Không nên đảo |
| D-19 | Bản deploy cho đăng nhập bằng tài khoản mẫu, bật bằng biến riêng `ALLOW_DEMO_LOGIN_IN_PRODUCTION=true` | Demo được đủ luồng trên link công khai; toàn dữ liệu giả. Không có biến đó thì production vẫn tắt, server ghi cảnh báo khi bật | Dễ — đặt biến thành `false` |
| D-20 | Kết nối Supabase có mã hoá TLS nhưng chưa kiểm chứng chứng chỉ nếu thiếu `DATABASE_CA_CERT` | Chạy được ngay, không phải tải file chứng chỉ; server ghi cảnh báo mỗi lần khởi động | Dễ — dán chứng chỉ CA của Supabase vào biến |
| D-21 | Một repo; thư mục gốc `frontend/` `backend/` `shared/`; backend chia theo module, frontend chia theo feature; test nằm cạnh file | Mỗi tuần chỉ nộp 1 URL và 1 commit hash; đổi API sửa cả hai phía trong một commit; frontend và backend cùng một bản đồ tính năng nên dễ tìm, dễ giải thích | Trung bình — chỉ di chuyển file, không đổi logic |

## 7. Cấu trúc code

Cập nhật ngày 2026-09-15, sau khi nhóm chốt cấu trúc repo (D-21).

```
GomNang/
├── shared/src/                  quy tắc nghiệp vụ dùng chung — test nằm cạnh file
│   ├── types.ts                 hợp đồng dữ liệu frontend ⇄ backend
│   ├── validate-project.ts      validate dự án (US-1)
│   ├── rules.ts                 phân quyền, máy trạng thái dự án và đóng góp
│   ├── assess.ts                người gác cổng, bản thuần quy tắc
│   ├── views.ts                 ghép dòng dữ liệu thành hình dạng API trả về
│   └── demo-data.ts             dữ liệu mẫu dùng chung
├── backend/
│   ├── src/
│   │   ├── app.ts · server.ts · config.ts
│   │   ├── common/              cors · errors · logger · validation
│   │   ├── db/                  client · schema · seed
│   │   └── modules/
│   │       ├── auth/            auth.routes · auth.middleware · auth.service
│   │       ├── users/           users.routes · users.repository
│   │       ├── projects/        projects.routes · projects.service · projects.repository
│   │       ├── verification/    verification.routes · verification.service · verification.repository
│   │       ├── contributions/   contributions.routes · contributions.service · contributions.repository
│   │       └── audit/           audit.repository
│   ├── test/api.test.ts         test xuyên module, gọi qua HTTP thật
│   └── drizzle/                 migration SQL
└── frontend/
    ├── src/
    │   ├── app/                 chỉ khai báo đường dẫn — mỗi page.tsx một dòng
    │   ├── features/
    │   │   ├── auth/            UserSwitcher · auth.api
    │   │   ├── projects/        trang danh sách, chi tiết, tạo, sửa · ProjectForm · projects.api
    │   │   ├── verification/    hàng chờ · khối duyệt và người gác cổng · verification.api
    │   │   └── contributions/   khối cam kết và bảng đóng góp · contributions.api
    │   ├── components/ui.tsx    trạng thái tải / rỗng / lỗi, ô nhập
    │   └── lib/                 api-client · session · use-load · use-action · format
    └── test/                    client frontend gọi backend thật
```

```mermaid
flowchart LR
    subgraph WEB["frontend/src"]
        PAGES["features/*<br/>màn hình và khối thao tác"]
        CLIENT["lib/api-client.ts<br/>và features/*/*.api.ts"]
    end
    subgraph API["backend/src/modules/*"]
        ROUTES["*.routes.ts<br/>HTTP và zod"]
        SERVICE["*.service.ts<br/>quy tắc, transaction, sổ ghi vết"]
        REPO["*.repository.ts<br/>truy vấn"]
    end
    DOMAIN["shared/src<br/>kiểu dữ liệu, validate,<br/>phân quyền, người gác cổng"]
    DB[("PostgreSQL<br/>PGlite khi dev và test<br/>Postgres 17 khi Docker và deploy")]

    PAGES --> CLIENT
    PAGES -->|"quyết định hiện nút nào"| DOMAIN
    CLIENT -->|"JSON và Bearer token"| ROUTES
    ROUTES --> SERVICE
    SERVICE --> DOMAIN
    SERVICE --> REPO
    REPO --> DB
```

Mỗi request vào backend đi đúng ba bước, và mỗi bước nằm ở một loại file khác nhau:

| Bước | File | Trả lỗi |
| :-- | :-- | :-- |
| 1. Đọc và kiểm **định dạng** request | `modules/<tên>/<tên>.routes.ts`, dùng `common/validation.ts` (zod) | 400 |
| 2. Hỏi domain xem thao tác có **được phép** không | `<tên>.service.ts` gọi `shared/src/rules.ts` và `validate-project.ts` | 403 / 409 / 422 |
| 3. Ghi dữ liệu trong một transaction, kèm một dòng sổ ghi vết | `<tên>.service.ts` mở transaction; `<tên>.repository.ts` và `audit/audit.repository.ts` ghi | — |

Quy ước:

- Tên file có tên module (`projects.service.ts`), để mở nhiều tab không bị lẫn.
- Module không có quy tắc nghiệp vụ thì không có service: `users` cho route gọi thẳng repository. Module chỉ để ghi và đọc dữ liệu dùng chung thì chỉ có repository: `audit`.
- Repository chỉ truy vấn bảng của mình. Việc ghép nhiều bảng — ví dụ chi tiết dự án gồm hạng mục, đóng góp, sổ ghi vết, đánh giá — nằm ở service.
- Test nằm cạnh file được test. Test chạy xuyên nhiều module nằm ở `backend/test/` và `frontend/test/`.
- File frontend mà test Node import (`lib/api-client.ts`, `lib/session.ts`, `features/*/*.api.ts`) dùng import tương đối, vì Node không hiểu alias `@/` của Next.js.
- Dịch vụ AI tuần 6: chưa chốt nằm trong `backend/src/modules/` hay tách riêng.

Frontend cũng gọi bước 2 — nhưng chỉ để quyết định **hiện nút nào**, không phải để chặn. Chặn thật luôn là backend: sửa code trên trình duyệt để hiện nút "Xác nhận" thì request vẫn nhận 403. Chính sách mã lỗi đầy đủ: [`api-contract.md` §2](api-contract.md#2-chính-sách-mã-trạng-thái).
