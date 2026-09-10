# GOM NẮNG

**Nền tảng kết nối và tổ chức các hoạt động thiện nguyện cộng đồng.**
*A platform to connect and organize community volunteer activities.*

Đồ án môn **New Technologies in Software Engineering** — HK1 2026–2027
Khoa Công nghệ Thông tin, Trường Đại học Sư phạm Kỹ thuật TP.HCM

| Thành viên | MSSV | Vai trò chính |
| :-- | :-- | :-- |
| Võ Tuấn Khanh | 23110031 | Backend, dữ liệu, triển khai, tích hợp AI |
| Phạm Văn Bảo An | 23110001 | Frontend, UX, bộ ca kiểm thử, tài liệu |

> Cả hai thành viên đều phải giải thích được toàn bộ kiến trúc — môn học kiểm tra ngẫu nhiên (mục 9, Course Guide).

---

## Trạng thái hiện tại

Tuần 3 — **Homework 3A: UI skeleton**.
Frontend chạy được với dữ liệu giả. Backend và cơ sở dữ liệu bắt đầu ở tuần 4.

## Cấu trúc repo

```
apps/web/        Next.js frontend (tuần 3+)
apps/api/        Backend Express — sẽ tạo ở tuần 4
docs/            Đề xuất, kiến trúc, backlog, bằng chứng từng tuần
scripts/         Script tiện ích (LLM smoke test)
```

## Chạy web app

Cần Node.js ≥ 20.

```bash
cd apps/web; npm install; npm run dev
```

Mở http://localhost:3000. Không cần API key hay database — tuần 3 chạy hoàn toàn bằng dữ liệu giả.

Chạy test validation (dùng bộ test có sẵn của Node, không cần thư viện ngoài):

```bash
cd apps/web; npm test
```

## Tài liệu

| File | Nội dung |
| :-- | :-- |
| [docs/proposal.md](docs/proposal.md) | Đề xuất dự án: vấn đề, người dùng, user stories, vertical slice, lựa chọn công nghệ, năng lực AI |
| [docs/architecture.md](docs/architecture.md) | Sơ đồ kiến trúc, đường đi của một request, ranh giới AI, quyết định kỹ thuật |
| [docs/backlog.md](docs/backlog.md) | Backlog 8 tuần kèm người phụ trách |
| [docs/week-02.md](docs/week-02.md) | Bằng chứng nộp bài tuần 2 (Homework 2B) |
| [docs/week-03.md](docs/week-03.md) | Bằng chứng nộp bài tuần 3 (Homework 3A) |
| [docs/ai-usage-log.md](docs/ai-usage-log.md) | Nhật ký sử dụng AI trong quá trình phát triển |
| [docs/evidence/](docs/evidence/) | Kết quả smoke test LLM (sinh ra khi chạy script) |

## Chạy LLM smoke test

Cần Node.js ≥ 20 và một API key. Khuyến nghị Google AI Studio (có gói miễn phí): https://aistudio.google.com/apikey

```bash
cp .env.example .env
```

Điền `GEMINI_API_KEY` vào `.env`, rồi chạy:

```bash
LLM_PROVIDER=gemini GEMINI_API_KEY=$(grep GEMINI_API_KEY .env | cut -d= -f2) node scripts/llm-smoke-test.mjs --runs 3
```

Trên PowerShell:

```bash
$env:LLM_PROVIDER="gemini"; $env:GEMINI_API_KEY="<key-cua-ban>"; node scripts/llm-smoke-test.mjs --runs 3
```

Script hỗ trợ `gemini`, `anthropic`, `openai` (hoặc endpoint tương thích qua `OPENAI_BASE_URL`) và `ollama`.
Kết quả ghi vào `docs/evidence/llm-smoke-test.json` và `docs/evidence/llm-smoke-test.md`.

## Nguyên tắc bảo mật của repo

- Không commit `.env`, API key, hay bất kỳ credential nào. Chỉ commit `.env.example` (tên biến, không có giá trị).
- Không commit ảnh giấy tờ tuỳ thân, địa chỉ hoặc thông tin liên hệ của người thụ hưởng.
- Không gửi dữ liệu định danh người thụ hưởng tới mô hình bên ngoài — xem "Dữ liệu không được gửi ra ngoài" trong [docs/architecture.md](docs/architecture.md).
