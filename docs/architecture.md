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
| D-08 | Quy tắc nghiệp vụ tách thành `packages/domain`, backend và frontend import chung | Một quy tắc chỉ có một bản code — form trên trình duyệt và API không thể lệch nhau | Dễ |
| D-09 | Dev và test dùng **PGlite** (PostgreSQL chạy nhúng trong Node) thay vì Postgres trong Docker | Docker Desktop trên máy nhóm không bật được engine; người mới clone về chạy ngay, không cài gì thêm | Dễ — cùng là PostgreSQL, Homework 4B chỉ đổi driver |
| D-10 | Tuần 4 phát token bằng `dev-login` (JWT HS256), chưa nối Supabase Auth | Đủ để kiểm quyền theo vai trò ngay bây giờ; endpoint bị tắt cứng khi `NODE_ENV=production` | Dễ |
| D-11 | Sổ ghi vết chặn UPDATE / DELETE / TRUNCATE bằng trigger trong PostgreSQL; BR-003 có thêm CHECK constraint | Chặn ngay ở database, không phụ thuộc việc code backend có nhớ kiểm hay không | Không nên đảo |
| D-12 | So trùng tên dự án bằng Jaccard viết trong JS, chưa dùng `pg_trgm` | Không cần extension, chạy giống hệt ở mock frontend, đủ nhanh tới vài nghìn dự án | Dễ — có ghi chú `ponytail:` trong code |
| D-13 | Số lượng cam kết / bàn giao / xác nhận luôn **tính** từ bảng đóng góp, không lưu thành cột | Con số trên màn hình không bao giờ lệch với sổ đóng góp | Dễ |
| D-14 | Sổ thu chi theo kiểu Open Collective: mỗi hạng mục tiền là một quỹ; **số dư tính** từ tiền đã xác nhận trừ khoản chi đã duyệt, không lưu cột số dư | Cùng lý do D-13; khoản chờ duyệt giữ chỗ nên không thể chi quá tiền thật đã nhận | Dễ |
| D-15 | Người ghi chi (tài chính) và người duyệt chi (điều phối) là hai người, giữ ở cả domain rule lẫn CHECK `expenses_reviewer_not_recorder` | Mở rộng BR-003 sang dòng tiền ra, không phụ thuộc code nhớ kiểm | Không nên đảo |
| D-16 | Huỷ dự án tự huỷ mọi cam kết chưa bàn giao, ghi vết từng cái; đồ đã bàn giao giữ nguyên | Không để cam kết "treo" mãi khi dự án đã dừng; đồ đã trao cần con người xử lý hoàn trả | Dễ |
| D-17 | "Việc của tôi" **suy ra** từ dữ liệu bằng chính các hàm luật (`allowedTransitions`…), không có bảng task riêng | Việc hiện ra luôn đúng là việc người đó được phép làm; không có dữ liệu thứ hai để lệch | Dễ |
| D-18 | Hồ sơ công khai chỉ đếm dự án đã công khai và đóng góp **đã được người khác xác nhận** | Uy tín không tự khai được — giống huy hiệu của GlobalGiving | Dễ |
| D-19 | Ca tình nguyện lưu thành một cột `jsonb` trên `need_items`, không tách bảng | Mỗi hạng mục công sức một ca là đủ cho quy mô khu phố; muốn nhiều ca thì tạo nhiều hạng mục | Dễ — tách bảng `shifts` khi cần nhiều ca cho một hạng mục |

## 7. Cấu trúc code — cập nhật sau tích hợp tuần 4

```mermaid
flowchart LR
    subgraph WEB["fe — Next.js"]
        PAGES["src/app + presentation/modules"]
        ADAPTER["libs/api<br/>mock hoặc HTTP"]
    end
    subgraph API["be — Express"]
        ROUTES["route + middleware + controller"]
        SERVICE["service + domain rules"]
        REPO["repository"]
    end
    DOMAIN["packages/domain<br/>kiểu dữ liệu, validate,<br/>phân quyền, người gác cổng"]
    DB[("PGlite<br/>PostgreSQL nhúng")]

    PAGES --> ADAPTER
    ADAPTER -->|"mock"| DOMAIN
    ADAPTER -->|"HTTP qua Next rewrite"| ROUTES
    ROUTES --> SERVICE
    SERVICE --> DOMAIN
    SERVICE --> REPO
    REPO --> DB
```

Mỗi request vào backend đi qua các lớp có trách nhiệm riêng:

| Bước | File | Trả lỗi |
| :-- | :-- | :-- |
| 1. Xác thực và kiểm **định dạng** request | `be/src/modules/*/*.route.ts`, `*.middleware.ts`, `*.schema.ts` | 400 / 401 |
| 2. Chuyển HTTP sang lời gọi nghiệp vụ | `be/src/modules/*/*.controller.ts` | — |
| 3. Kiểm quyền/quy tắc và quản lý transaction | `be/src/modules/*/*.service.ts`, `packages/domain` | 403 / 409 / 422 |
| 4. Truy vấn DB và ghi sổ audit | `be/src/modules/*/*.repository.ts`, `be/src/infrastructure/audit/` | — |

Mock của frontend bỏ bước 1 và thay bước 3 bằng localStorage, nhưng gọi **đúng** bước 2 — nên với cùng một thao tác, mock và backend từ chối cùng một lý do, cùng một mã lỗi. Chính sách mã lỗi đầy đủ: [`api-contract.md` §2](api-contract.md#2-chính-sách-mã-trạng-thái).
