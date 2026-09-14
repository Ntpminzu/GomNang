# GOM NẮNG

**Nền tảng kết nối và tổ chức các hoạt động thiện nguyện cộng đồng.**
*A platform to connect and organize community volunteer activities.*

Đồ án môn **New Technologies in Software Engineering** — HK1 2026–2027
Khoa Công nghệ Thông tin, Trường Đại học Sư phạm Kỹ thuật TP.HCM

| Thành viên | MSSV | Vai trò chính |
| :-- | :-- | :-- |
| Võ Tuấn Khanh | 23110031 | Frontend, UX, bộ ca kiểm thử |
| Phạm Văn Bảo An | 23110001 | Backend, dữ liệu, triển khai, tích hợp AI |

> Cả hai thành viên đều phải giải thích được toàn bộ kiến trúc — môn học kiểm tra ngẫu nhiên (mục 9, Course Guide).

---

## Trạng thái hiện tại

Tuần 4 — **Homework 4B**: frontend đã nối vào backend thật và dữ liệu bền vững. Hệ thống đóng gói bằng Docker và chạy được bằng một lệnh. Bản deploy: xem [docs/deployment.md](docs/deployment.md).

## Cấu trúc repo

```
GomNang/
├── frontend/            Next.js 16 — Khanh
│   ├── src/app/         chỉ khai báo đường dẫn
│   ├── src/features/    auth · projects · verification · contributions
│   ├── src/components/  khối giao diện dùng chung
│   ├── src/lib/         gọi API, phiên đăng nhập, tải dữ liệu
│   └── test/            client frontend gọi backend thật
├── backend/             Express 5 + Drizzle — An
│   ├── src/modules/     auth · users · projects · verification · contributions · audit
│   ├── src/common/      CORS, lỗi, log, kiểm định dạng request
│   ├── src/db/          kết nối, schema, dữ liệu mẫu
│   ├── drizzle/         migration SQL
│   └── test/            test xuyên module qua HTTP
├── shared/              quy tắc nghiệp vụ dùng chung: kiểu dữ liệu, validate, phân quyền, người gác cổng
├── docs/                đề xuất, kiến trúc, API contract, deploy, bằng chứng từng tuần
├── scripts/             LLM smoke test
├── docker-compose.yml   chạy cả hệ thống: web + API + PostgreSQL
└── render.yaml          cấu hình deploy backend lên Render
```

Mỗi module backend gồm tối đa ba file: `<tên>.routes.ts` → `<tên>.service.ts` → `<tên>.repository.ts`. Test nằm cạnh file được test. Chi tiết và lý do: [docs/architecture.md §7](docs/architecture.md#7-cấu-trúc-code).

## Cách 1 — Chạy bằng Docker Compose (giống bản deploy)

Cần **Docker Desktop đang chạy**. Từ thư mục gốc repo:

```bash
cp .env.example .env
```

Mở `.env`, điền `JWT_SECRET` — lệnh tạo chuỗi ngẫu nhiên có sẵn trong file. Sau đó:

```bash
docker compose up --build
```

Lần đầu build mất vài phút. Xong thì mở:

- Web: http://localhost:3000
- API: http://localhost:4000/health

Tắt, **giữ** dữ liệu:

```bash
docker compose down
```

Tắt và **xoá sạch** dữ liệu:

```bash
docker compose down -v
```

## Cách 2 — Chạy dev không cần Docker

Cần **Node.js 22.18 trở lên** — backend chạy thẳng file TypeScript, không có bước build.

```bash
npm install
```

```bash
cp backend/.env.example backend/.env
```

Điền `JWT_SECRET` trong `backend/.env`. Không điền `DATABASE_URL` thì backend dùng PGlite — PostgreSQL chạy nhúng, lưu ở `backend/.data/`, không phải cài gì.

Mở **hai terminal**, mỗi terminal một lệnh:

```bash
npm run dev:backend
```

```bash
npm run dev:frontend
```

Mở http://localhost:3000. Web mặc định gọi backend ở `http://localhost:4000`; muốn đổi thì chép `frontend/.env.example` thành `frontend/.env.local`.

Tắt: `Ctrl+C` ở từng terminal. Xoá sạch dữ liệu dev (tắt backend trước):

```bash
npm run db:reset -w gomnang-backend
```

**Dùng thử:** góc trên bên phải có ô chọn tài khoản mẫu — đăng nhập làm người điều phối, người đóng góp hoặc người xác minh. Ví dụ gọi từng endpoint bằng curl kèm response thật: [docs/api-contract.md §6](docs/api-contract.md#6-ví-dụ-ghi-lại-từ-server-thật).

## Chạy test

```bash
npm test
```

Chạy lần lượt ba bộ:

| Bộ test | Kiểm điều gì |
| :-- | :-- |
| `shared` | Quy tắc nghiệp vụ: validate, phân quyền, chuyển trạng thái, người gác cổng |
| `backend` | Backend qua HTTP thật, database trong RAM: mã lỗi, luồng đầy đủ, CORS, cấu hình, dữ liệu bền vững |
| `frontend` | Client của frontend gọi **backend thật** chạy trong cùng tiến trình: lệch contract là hỏng |

Kiểm kiểu backend:

```bash
npm run typecheck
```

## Cấu hình nằm ở đâu

| File | Dùng khi | Commit? |
| :-- | :-- | :-- |
| `.env.example` → `.env` ở thư mục gốc | Docker Compose (`JWT_SECRET`) và LLM smoke test | Chỉ `.env.example` |
| `backend/.env.example` → `backend/.env` | Chạy backend bằng `npm run dev:backend` | Chỉ `.env.example` |
| `frontend/.env.example` → `frontend/.env.local` | Web cần gọi backend ở địa chỉ khác `localhost:4000` | Chỉ `.env.example` |
| `docker-compose.yml` | Biến của từng container khi chạy Compose | Có |
| `render.yaml` | Biến không bí mật của backend trên Render; biến bí mật nhập trên dashboard | Có |
| Dashboard Render, Vercel | `DATABASE_URL`, `CORS_ORIGINS`, `NEXT_PUBLIC_API_URL` của bản deploy | Không nằm trong repo |

Mọi biến bắt đầu bằng `NEXT_PUBLIC_` đều bị chép vào code chạy trên trình duyệt — không bao giờ để secret ở đó.

## Tài liệu

| File | Nội dung |
| :-- | :-- |
| [docs/proposal.md](docs/proposal.md) | Đề xuất dự án: vấn đề, người dùng, user stories, vertical slice, lựa chọn công nghệ, năng lực AI |
| [docs/architecture.md](docs/architecture.md) | Sơ đồ kiến trúc, đường đi của request, ranh giới AI, cấu trúc code, quyết định kỹ thuật |
| [docs/api-contract.md](docs/api-contract.md) | Endpoint, chính sách mã lỗi, request/response ghi từ server thật |
| [docs/deployment.md](docs/deployment.md) | Deploy lên Supabase, Render, Vercel từng bước |
| [docs/backlog.md](docs/backlog.md) | Backlog 8 tuần kèm người phụ trách |
| [docs/week-02.md](docs/week-02.md) | Bằng chứng Homework 2B |
| [docs/week-03.md](docs/week-03.md) | Bằng chứng Homework 3A và 3B |
| [docs/week-04.md](docs/week-04.md) | Bằng chứng Homework 4A và 4B |
| [docs/ai-usage-log.md](docs/ai-usage-log.md) | Nhật ký sử dụng AI trong quá trình phát triển |
| [docs/evidence/](docs/evidence/) | Kết quả smoke test LLM (sinh ra khi chạy script) |

## Chạy LLM smoke test

Cần một API key. Khuyến nghị Google AI Studio (có gói miễn phí): https://aistudio.google.com/apikey

```bash
LLM_PROVIDER=gemini GEMINI_API_KEY=<key> node scripts/llm-smoke-test.mjs --runs 3
```

Script hỗ trợ `gemini`, `anthropic`, `openai` (hoặc endpoint tương thích qua `OPENAI_BASE_URL`) và `ollama`. Kết quả ghi vào `docs/evidence/`.

## Nguyên tắc bảo mật của repo

- Không commit `.env`, `.env.local`, API key, mật khẩu database hay bất kỳ credential nào. Chỉ commit file `.env.example`.
- Không commit thư mục `backend/.data/` — đó là database local.
- Bản deploy cho đăng nhập bằng tài khoản mẫu (biến `ALLOW_DEMO_LOGIN_IN_PRODUCTION`) — chỉ chấp nhận được vì toàn bộ dữ liệu là dữ liệu giả.
- Không commit ảnh giấy tờ tuỳ thân, địa chỉ hoặc thông tin liên hệ của người thụ hưởng.
- Không gửi dữ liệu định danh người thụ hưởng tới mô hình bên ngoài — xem "Dữ liệu không được gửi ra ngoài" trong [docs/architecture.md](docs/architecture.md).
