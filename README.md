# GOM NẮNG

Nền tảng kết nối và tổ chức các hoạt động thiện nguyện cộng đồng, được xây dựng cho môn **New Technologies in Software Engineering** — HK1 2026–2027.

## Trạng thái bài tập

| Phần | Trạng thái kỹ thuật | Việc còn lại để nộp |
| :-- | :-- | :-- |
| 3A — UI skeleton | Đạt: điều hướng, form validation, mock data và các trạng thái giao diện | Human review và video 60 giây |
| 3B — frontend prototype | Đạt: luồng ba vai bằng mock, cùng API contract, 8 test mock | Human review, video và ghi commit nộp chính xác |
| 4A — backend slice | Đạt: API, JWT, Zod, PGlite, migration, transaction, audit, health/log và 16 test HTTP | Human review, chụp bằng chứng và ghi commit nộp chính xác |
| 4B — tích hợp | Đã chạy local FE → BE → DB bằng HTTP và có E2E; chưa phải hồ sơ 4B hoàn chỉnh | Docker hoặc cách đóng gói tương đương, deploy/lý do local, video và tài liệu vận hành |

Phân tích chi tiết và bằng chứng kiểm tra mới nhất nằm tại [docs/week-03-04-review.md](docs/week-03-04-review.md).

## Cấu trúc repo

```text
be/                  Express, module nghiệp vụ, Drizzle và PGlite
fe/                  Next.js App Router, libs và presentation/modules
packages/domain/     Kiểu dữ liệu, validation và quy tắc thuần dùng chung
docs/                Đề xuất, kiến trúc, API contract và bằng chứng từng tuần
scripts/             Công cụ cấp repo và LLM smoke test
```

Backend đi theo luồng `route → middleware → controller → service → repository → database`. Frontend giữ `src/app` làm route mỏng, giao diện trong `src/presentation`, còn HTTP/mock/session trong `src/libs`.

## Cài đặt

Cần Node.js 22.18 trở lên. Trong PowerShell, chạy từ thư mục gốc:

```powershell
npm.cmd install
Copy-Item be\.env.example be\.env
```

Điền `JWT_SECRET` dài ít nhất 32 ký tự vào `be/.env`. Có thể tạo bằng:

```powershell
node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"
```

## Chạy FE–BE–DB thật

Mở hai cửa sổ PowerShell tại thư mục gốc:

```powershell
# Terminal 1
npm.cmd run dev:be
```

```powershell
# Terminal 2
npm.cmd run dev:fe
```

Mở `http://localhost:3000`. Frontend mặc định dùng HTTP; Next.js chuyển tiếp `/api/*` tới backend ở `http://localhost:4000`. Kiểm tra backend:

```powershell
Invoke-RestMethod http://localhost:4000/health
```

Database local nằm trong `be/.data/pglite` và không được commit. PGlite chỉ cho một tiến trình mở thư mục này; tắt server bằng `Ctrl+C` trước khi chạy tiến trình backend khác hoặc thao tác với dữ liệu.

## Chạy lại prototype mock của bài 3B

Tạo `fe/.env.local`:

```dotenv
NEXT_PUBLIC_API_MODE=mock
```

Sau đó chỉ cần chạy `npm.cmd run dev:fe`. Chế độ mock lưu dữ liệu demo trong trình duyệt và không cần backend. Xóa file hoặc đổi giá trị thành `http`, rồi khởi động lại Next.js để trở về tích hợp thật.

## Kiểm tra

```powershell
npm.cmd test
npm.cmd run typecheck
npm.cmd run build
npm.cmd run test:e2e
```

- `npm.cmd test`: 27 test domain + 16 test API + 8 test mock.
- `npm.cmd run test:e2e`: tự mở backend/frontend riêng và kiểm tra luồng tạo → gửi xác minh → duyệt → cam kết → bàn giao → xác nhận, gồm cả lỗi cam kết vượt số lượng.

## Cấu hình

| File | Nội dung |
| :-- | :-- |
| `be/.env.example` | PORT, JWT secret, đường PGlite, dev login và seed |
| `fe/.env.example` | Chọn `http`/`mock` và backend origin |
| `fe/next.config.mjs` | Rewrite `/api/*` sang backend |
| `be/drizzle.config.ts` | Schema và migration Drizzle |

Không commit `.env`, database local, API key hay dữ liệu định danh người thụ hưởng.

## Tài liệu chính

| File | Nội dung |
| :-- | :-- |
| [docs/week-03-04-review.md](docs/week-03-04-review.md) | Kết luận bài 3/4 và luồng tạo dự án chi tiết |
| [docs/kientruc.md](docs/kientruc.md) | Cấu trúc module sau khi tổ chức lại |
| [docs/api-contract.md](docs/api-contract.md) | Endpoint, request/response và mã lỗi |
| [docs/week-03.md](docs/week-03.md) | Bằng chứng 3A và 3B |
| [docs/week-04.md](docs/week-04.md) | Bằng chứng 4A |
| [docs/ai-usage-log.md](docs/ai-usage-log.md) | Nhật ký sử dụng AI và phần human review |
