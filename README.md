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
be/                  Express, module nghiệp vụ, Drizzle và PostgreSQL
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

Khi `be/.env` có `DATABASE_URL`, backend dùng PostgreSQL trên Supabase. Nếu bỏ
trống biến này, backend dùng PGlite local tại `be/.data/pglite`; chế độ này vẫn
được dùng cho test. Xem [hướng dẫn Supabase](docs/supabase.md) để biết cấu hình,
backup và lệnh kiểm tra.

## Chạy lại prototype mock của bài 3B

Tạo `fe/.env.local`:

```dotenv
NEXT_PUBLIC_API_MODE=mock
```

Sau đó chỉ cần chạy `npm.cmd run dev:fe`. Chế độ mock lưu dữ liệu demo trong trình duyệt và không cần backend. Xóa file hoặc đổi giá trị thành `http`, rồi khởi động lại Next.js để trở về tích hợp thật.

## Chatbot local với Ollama

Chatbot hỗ trợ hỏi cách dùng GOM NẮNG và thông tin dự án công khai. Cần chạy Ollama, backend và frontend trên máy demo. Trong PowerShell:

```powershell
ollama pull qwen3:4b
npm.cmd run dev:be
```

Chạy `npm.cmd run dev:fe` ở terminal khác, mở `http://localhost:3000` và chọn **Hỏi trợ lý** ở góc phải. Backend dùng `OLLAMA_BASE_URL=http://127.0.0.1:11434` và `OLLAMA_MODEL=qwen3:4b` theo mặc định; có thể đổi hai biến trong `be/.env`. Model được phép suy luận; giao diện chỉ hiện câu trả lời cuối. Cuộc trò chuyện chỉ giữ trong trang đang mở, không ghi database. Chế độ `NEXT_PUBLIC_API_MODE=mock` không gọi được chatbot.

Chatbot lập chỉ mục đảo theo từ từ hướng dẫn công khai tại `/help` và **toàn bộ dự án công khai** ở mỗi lượt hỏi, rồi chỉ gửi tối đa 5 đoạn phù hợp cho model. Chỉ mục dựng lại từ dữ liệu hiện tại để dự án vừa đổi trạng thái không bị giữ trong ngữ cảnh cũ; không dùng vector database. Câu trả lời phải có ký hiệu `[1]`, `[2]` tương ứng với đường dẫn nguồn hiển thị trong widget. Nếu không tìm thấy đoạn phù hợp, hoặc model không trích dẫn nguồn hợp lệ, backend trả lời chưa đủ thông tin. Chỉ mục hiện được dựng trong bộ nhớ cho từng request, phù hợp bộ dữ liệu demo; với kho tài liệu lớn cần chuyển sang chỉ mục lưu trong database.

Để bật lựa chọn **Gemini 3.8 Flash**, thêm vào `be/.env` rồi khởi động lại backend:

```dotenv
GEMINI_API_KEY=key-cua-ban
GEMINI_MODEL=gemini-3.8-flash
```

API key chỉ được backend gửi tới Google qua header `x-goog-api-key`, không đưa vào bundle frontend. Nếu chưa có key, lựa chọn Gemini hiện là *chưa cấu hình*. Người dùng cần đăng nhập để chọn Gemini; Ollama vẫn dùng được với khách. Khi chọn Gemini, câu hỏi, lịch sử gần nhất, hướng dẫn và **các đoạn nguồn được tìm thấy** sẽ được gửi tới Google; chọn Ollama thì dùng model local.

## Kiểm tra

```powershell
npm.cmd test
npm.cmd run typecheck
npm.cmd run build
npm.cmd run test:e2e
```

- `npm.cmd test`: test quy tắc domain, API backend và mock frontend.
- `npm.cmd run test:e2e`: tự mở backend/frontend riêng và kiểm tra luồng tạo → gửi xác minh → duyệt → cam kết → bàn giao → xác nhận, gồm cả lỗi cam kết vượt số lượng.

## Cấu hình

| File | Nội dung |
| :-- | :-- |
| `be/.env.example` | PORT, JWT secret, Supabase/PGlite, dev login và seed |
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
| [docs/supabase.md](docs/supabase.md) | Kết nối Supabase, chuyển dữ liệu và backup |
| [docs/ai-usage-log.md](docs/ai-usage-log.md) | Nhật ký sử dụng AI và phần human review |
