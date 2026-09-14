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

Tuần 4:
- **Homework 3B** — frontend chạy đủ luồng người dùng trên mock API, mock tuân đúng API contract.
- **Homework 4A** — backend thật: API có validation, phân quyền, dữ liệu bền vững, log, health check và test tự động.

Frontend **chưa nối** vào backend. Việc đó là Homework 4B.

## Cấu trúc repo

```
packages/domain/   Quy tắc nghiệp vụ dùng chung: kiểu dữ liệu, validate, phân quyền, người gác cổng, dữ liệu mẫu
apps/api/          Backend — Express 5, zod, Drizzle ORM, PGlite
apps/web/          Frontend — Next.js 16, đang chạy bằng mock API cùng contract với backend
docs/              Đề xuất, kiến trúc, API contract, backlog, bằng chứng từng tuần
scripts/           LLM smoke test
```

## Cài đặt

Cần **Node.js 22.18 trở lên** — backend chạy thẳng file TypeScript, không có bước build. Từ thư mục gốc repo:

```bash
npm install
```

## Chạy backend

```bash
cp apps/api/.env.example apps/api/.env
```

Mở `apps/api/.env`, điền `JWT_SECRET` — lệnh tạo chuỗi ngẫu nhiên có sẵn trong file. Thiếu biến này thì server từ chối khởi động. Sau đó:

```bash
npm run dev:api
```

API chạy ở http://localhost:4000. Lần đầu chạy, server tự tạo database trong `apps/api/.data/` và nạp dữ liệu mẫu.

```bash
curl http://localhost:4000/health
```

Xoá sạch dữ liệu để bắt đầu lại từ dữ liệu mẫu (tắt server trước):

```bash
npm run db:reset -w gomnang-api
```

Ví dụ gọi từng endpoint bằng curl, kèm response thật: [docs/api-contract.md §6](docs/api-contract.md#6-ví-dụ-ghi-lại-từ-server-thật).

## Chạy frontend

```bash
npm run dev:web
```

Mở http://localhost:3000. **Không cần bật backend** — tuần này frontend dùng mock API, dữ liệu lưu ngay trong localStorage của trình duyệt.

- Góc trên bên phải: chọn tài khoản mẫu để đóng vai người điều phối, người đóng góp hoặc người xác minh.
- Nút **Đặt lại dữ liệu**: xoá mọi thay đổi, nạp lại dữ liệu mẫu.
- Thanh **Chế độ demo** trên mỗi trang: giả lập mạng chậm, không có dữ liệu, máy chủ lỗi.

## Chạy test

```bash
npm test
```

Chạy lần lượt ba bộ: quy tắc nghiệp vụ (`packages/domain`), backend qua HTTP thật trên database trong RAM (`apps/api`), và mock API của frontend (`apps/web`). Kiểm kiểu backend:

```bash
npm run typecheck
```

## Cấu hình nằm ở đâu

| File | Dùng cho | Commit? |
| :-- | :-- | :-- |
| `apps/api/.env.example` | Tên và ý nghĩa các biến của backend | Có |
| `apps/api/.env` | Giá trị thật, gồm `JWT_SECRET` | **Không** — đã có trong `.gitignore` |
| `apps/api/drizzle.config.ts` | Nơi đọc schema và nơi ghi migration | Có |
| `apps/web/next.config.mjs` | Cấu hình Next.js | Có |
| `.env.example` ở thư mục gốc | Biến cho LLM smoke test | Có |

Frontend tuần này không cần biến môi trường nào.

## Tài liệu

| File | Nội dung |
| :-- | :-- |
| [docs/proposal.md](docs/proposal.md) | Đề xuất dự án: vấn đề, người dùng, user stories, vertical slice, lựa chọn công nghệ, năng lực AI |
| [docs/architecture.md](docs/architecture.md) | Sơ đồ kiến trúc, đường đi của request, ranh giới AI, cấu trúc code, quyết định kỹ thuật |
| [docs/api-contract.md](docs/api-contract.md) | Endpoint, chính sách mã lỗi, request/response ghi từ server thật |
| [docs/backlog.md](docs/backlog.md) | Backlog 8 tuần kèm người phụ trách |
| [docs/week-02.md](docs/week-02.md) | Bằng chứng Homework 2B |
| [docs/week-03.md](docs/week-03.md) | Bằng chứng Homework 3A và 3B |
| [docs/week-04.md](docs/week-04.md) | Bằng chứng Homework 4A |
| [docs/ai-usage-log.md](docs/ai-usage-log.md) | Nhật ký sử dụng AI trong quá trình phát triển |
| [docs/evidence/](docs/evidence/) | Kết quả smoke test LLM (sinh ra khi chạy script) |

## Chạy LLM smoke test

Cần một API key. Khuyến nghị Google AI Studio (có gói miễn phí): https://aistudio.google.com/apikey

```bash
LLM_PROVIDER=gemini GEMINI_API_KEY=<key> node scripts/llm-smoke-test.mjs --runs 3
```

Script hỗ trợ `gemini`, `anthropic`, `openai` (hoặc endpoint tương thích qua `OPENAI_BASE_URL`) và `ollama`. Kết quả ghi vào `docs/evidence/`.

## Nguyên tắc bảo mật của repo

- Không commit `.env`, API key hay bất kỳ credential nào. Chỉ commit file `.env.example`.
- Không commit thư mục `apps/api/.data/` — đó là database local.
- Không commit ảnh giấy tờ tuỳ thân, địa chỉ hoặc thông tin liên hệ của người thụ hưởng.
- Không gửi dữ liệu định danh người thụ hưởng tới mô hình bên ngoài — xem "Dữ liệu không được gửi ra ngoài" trong [docs/architecture.md](docs/architecture.md).
