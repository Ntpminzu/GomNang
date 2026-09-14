# AI usage log — GOM NẮNG

Theo mục 8 Course Guide: ghi lại việc dùng AI đáng kể, gồm *task, tool/model, file sinh ra hoặc bị sửa, phần con người đã rà soát, và các chỉnh sửa đã thực hiện*.

---

## 2026-09-08 — Soạn hồ sơ Homework 2B

| Mục | Nội dung |
| :-- | :-- |
| **Task** | Đọc bản đặc tả bài toán, slide môn học và course guide; soạn đề xuất dự án, sơ đồ kiến trúc, backlog 8 tuần và script LLM smoke test |
| **Tool / model** | Claude Code (Claude Opus 5) |
| **File sinh ra** | `README.md`, `.env.example`, `.gitignore`, `docs/proposal.md`, `docs/architecture.md`, `docs/backlog.md`, `docs/week-02.md`, `docs/ai-usage-log.md`, `scripts/llm-smoke-test.mjs` |
| **Đầu vào đã cung cấp cho AI** | Đặc tả bài toán trên Google Docs của nhóm, 2 file slide PDF của môn học, course & homework plan. Không có dữ liệu cá nhân của người thật |
| **Đã kiểm chứng bằng máy** | `node --check scripts/llm-smoke-test.mjs` — cú pháp hợp lệ. Chạy thử 2 nhánh lỗi: provider không hợp lệ và thiếu API key, cả hai thoát sạch với mã 1 |
| **CHƯA kiểm chứng** | Nhánh gọi model thật của cả 4 provider — chưa có API key. Số liệu độ trễ **chưa tồn tại**, không được điền tay |
| **Human review** | ⬜ **Chưa hoàn tất.** Khanh và An phải đọc lại toàn bộ trước khi nộp |

### Việc con người bắt buộc phải làm trước khi nộp

1. **Đọc và sửa `docs/proposal.md`** — đặc biệt §3 user stories và §4 vertical slice. Đây là phần giảng viên sẽ hỏi ngẫu nhiên; nếu có câu nào nhóm không giải thích được thì phải viết lại theo cách nhóm hiểu, hoặc bỏ.
2. **Kiểm tra lại các con số và tên riêng** — tên model trong `scripts/llm-smoke-test.mjs` (`gemini-2.5-flash`, `claude-sonnet-5`, `gpt-4o-mini`) do AI đề xuất theo trí nhớ, **phải đối chiếu với tài liệu provider tại thời điểm chạy**; model bị đổi tên hoặc ngừng phục vụ là chuyện thường.
3. **Kiểm tra lập luận về gói miễn phí của Render** trong `docs/architecture.md` §5 — đang ghi là "cần đo lại con số thật khi đăng ký". Đo rồi mới được phát biểu trước lớp.
4. **Chạy smoke test và điền phần "Nhận xét"** trong `docs/evidence/llm-smoke-test.md` bằng chữ của mình.
5. ~~**Chia lại owner trong `docs/backlog.md`**~~ — ✅ đã sửa ngày 2026-09-11: AI gán ngược vai trò. Thực tế **Khanh làm frontend, An làm backend**. Toàn bộ backlog, README và các file bằng chứng đã được đổi lại cho đúng.

### Chỉnh sửa con người đã thực hiện

_(ghi vào đây khi sửa: ai sửa, sửa gì, vì sao)_

| Ngày | Người sửa | File | Sửa gì và vì sao |
| :-- | :-- | :-- | :-- |
| | | | |

---

## 2026-09-11 — Homework 3A: dựng khung giao diện

| Mục | Nội dung |
| :-- | :-- |
| **Task** | Dựng 3 màn hình Next.js chạy bằng dữ liệu giả, một form có validation theo quy tắc nghiệp vụ, đủ 4 trạng thái loading/empty/success/error, bố cục responsive |
| **Tool / model** | Claude Code (Claude Opus 5) |
| **File sinh ra** | `frontend/` — `package.json`, `next.config.mjs`, `tsconfig.json`, `app/layout.tsx`, `app/globals.css`, `app/page.tsx`, `app/projects/[id]/page.tsx`, `app/projects/new/page.tsx`, `components/ui.tsx`, `lib/types.ts`, `lib/mock-data.ts`, `lib/api.ts`, `lib/validate-project.ts`, `lib/validate-project.test.ts`; `docs/week-03.md` |
| **File bị sửa** | `README.md`, `docs/proposal.md` (§6 bỏ Tailwind), `docs/backlog.md` |
| **Đã kiểm chứng bằng máy** | `npm test` → 11/11 pass. `npx next build` → biên dịch và kiểm kiểu thành công, 4 route. Chạy thật trên trình duyệt: form rỗng cho 9 lỗi + nhảy con trỏ; BR-003 báo đúng khi người phụ trách tài chính trùng người điều phối; nút gửi khoá lại khi đang gửi rồi ra màn hình thành công; trạng thái rỗng và trạng thái lỗi hiện đúng; 12/12 ô nhập có `<label for>`; ở 375px không tràn ngang và hai bảng tự cuộn trong khung riêng |
| **CHƯA kiểm chứng** | Chưa có kiểm thử trình duyệt tự động (Playwright) — mọi thao tác ở trên do người/agent bấm tay. Chưa kiểm với trình đọc màn hình thật. Chưa kiểm trên thiết bị di động thật, chỉ mới giả lập 375px |
| **Human review** | ⬜ **Chưa hoàn tất.** Khanh là chủ sở hữu phần frontend, phải đọc lại toàn bộ trước Thứ Sáu. An phụ trách backend nhưng vẫn phải nắm luồng màn hình vì lớp kiểm tra ngẫu nhiên thành viên |

### Ba câu cả hai cần trả lời được trước khi lên lớp

Khanh trả lời với tư cách người viết; An trả lời với tư cách người bị hỏi ngẫu nhiên.

1. Vì sao thanh tiến độ có **hai lớp** màu, và vì sao *đã cam kết* chưa được tính như *đã bàn giao*?
2. Vì sao `validateProjectForm` nhận tham số `today` thay vì gọi `new Date()` bên trong hàm?
   *(gợi ý: liên quan tới việc test cho kết quả ổn định, và tới việc HTML dựng sẵn trên máy chủ phải khớp với HTML trên trình duyệt)*
3. Form đã validate rồi, vì sao tuần 4 vẫn phải validate lại y hệt ở backend?

### Chỗ AI làm mà nhóm nên cân nhắc sửa

- Bộ chuyển **"Chế độ demo"** là thứ chỉ phục vụ trình bày trên lớp. Phải gỡ khỏi bản deploy ở tuần 4, đừng để lọt lên bản chạy thật.
- Dữ liệu giả trong `lib/mock-data.ts` dùng tên của chính hai thành viên. Nếu thấy dễ gây hiểu nhầm khi trình chiếu thì đổi thành tên chung chung.

---

## 2026-09-14 — Homework 3B và 4A

| Mục | Nội dung |
| :-- | :-- |
| **Task** | Tách quy tắc nghiệp vụ ra package dùng chung; dựng backend Express + PostgreSQL (4A); dựng mock API theo contract và các màn hình còn thiếu của luồng (3B); viết API contract và bằng chứng nộp bài |
| **Tool / model** | Claude Code (Claude Opus 5) |
| **File sinh ra** | `shared/` (types, validate-project, rules, assess, views, demo-data + 4 file test); `backend/` (10 file trong `src/`, `test/api.test.ts`, `scripts/sql.ts`, 2 migration, 3 body mẫu trong `examples/`); `frontend/` (`lib/session.ts`, `lib/use-load.ts`, `lib/api.test.ts`, `components/ProjectForm.tsx`, `ProjectPanels.tsx`, `UserSwitcher.tsx`, trang sửa dự án, trang hàng chờ xác minh); `docs/api-contract.md`, `docs/week-04.md` |
| **File bị sửa** | `frontend/lib/api.ts` (viết lại toàn bộ), các trang và `ui.tsx` cũ, `globals.css`, `README.md`, `architecture.md`, `proposal.md`, `backlog.md`, `week-03.md`, `.env.example` |
| **Đã kiểm chứng bằng máy** | `npm test` → 51/51 (domain 27, API 16, mock web 8). `tsc --noEmit` sạch. `next build` thành công 6 route. 25 request curl vào server thật đều ra đúng mã mong đợi. Tắt rồi bật lại server: dữ liệu còn, không nạp lại dữ liệu mẫu. Luồng 3B bấm qua trình duyệt với 3 vai, đúng từng bước. `npm run sql` đọc được database, lệnh sửa sổ ghi vết bị trigger chặn. 6 sơ đồ mermaid parse được |
| **Lỗi phát sinh trong lúc làm và đã sửa** | (1) PGlite không tự tạo thư mục cha của `.data/pglite` → server **không khởi động được ở lần chạy đầu**. Test không bắt được vì test dùng thư mục tạm đã tồn tại — chỉ lộ ra khi chạy server thật. Sửa ở `openDb`, chỗ duy nhất mọi nơi mở database đều đi qua. (2) `@types/express` v5 khai báo tham số đường dẫn là `string \| string[]` → 6 lỗi typecheck; sửa một chỗ ở `idParam` thay vì ép kiểu ở 6 route. (3) Proposal ghi cam kết vượt mức trả `400`; hiện thực theo chính sách mã lỗi là `422` → đã sửa proposal cho khớp |
| **CHƯA kiểm chứng** | Log tắt êm (`shutting down`, `database closed`) trên Windows. Docker — engine trên máy không chạy. Frontend gọi backend thật — chưa có CORS, việc của 4B. Trình đọc màn hình và thiết bị di động thật |
| **Human review** | ⬜ **Chưa hoàn tất.** An rà soát `backend` và `shared`; Khanh rà soát `frontend` |

### Chỗ nhóm cần đọc kỹ nhất

1. **`shared/src/rules.ts`** — mọi quyết định cho phép hay từ chối đều nằm ở đây. Đặc biệt quy tắc *người phụ trách tài chính không được xác nhận khoản đóng góp bằng tiền*: đây là **cách AI diễn giải BR-003**, đặc tả gốc không viết cụ thể tới mức đó. Nhóm phải quyết định có đồng ý không.
2. **`backend/src/db/repo.ts`**, hàm `lockNeedWithTotals` — dùng `SELECT … FOR UPDATE` để hai người không cùng cam kết vượt mục tiêu. Đây là câu hỏi về transaction rất dễ bị hỏi.
3. **`shared/src/assess.ts`** — ngưỡng trùng lặp `0.5` và `0.8`, cùng danh sách từ nối, là AI tự đặt. **Chưa đo trên dữ liệu thật nào.**

### Quyết định AI đã tự đưa ra — nhóm xác nhận hoặc đổi

| Quyết định | Vì sao AI chọn | Đổi có tốn không |
| :-- | :-- | :-- |
| PGlite thay cho Postgres trong Docker | Docker engine trên máy không chạy; người khác clone về chạy ngay | Rẻ — cùng là PostgreSQL |
| Tách `shared`, chuyển repo sang npm workspaces | Để form và API dùng đúng một bản quy tắc | Trung bình |
| `/api/users` không trả email | Email là dữ liệu cá nhân, không cần để chọn người phụ trách tài chính | Rẻ |
| Mã UUID cố định cho dữ liệu mẫu | Để ví dụ trong API contract chạy lại được | Rẻ |
| Người điều phối góp **tiền** vào chính dự án mình thì không ai xác nhận được | Hệ quả của hai quy tắc cùng lúc — AI ghi nhận là giới hạn, chưa sửa | Cần nhóm chốt quy tắc |

---

## 2026-09-14 — Homework 4B

| Mục | Nội dung |
| :-- | :-- |
| **Task** | Nối frontend vào backend thật; thêm CORS; thêm driver PostgreSQL thật; bật RLS; đóng gói Docker; viết Compose và cấu hình deploy; tạo database Supabase; viết hướng dẫn deploy |
| **Tool / model** | Claude Code (Claude Opus 5), cùng connector Supabase để tạo project |
| **File sinh ra** | `backend/Dockerfile`, `frontend/Dockerfile`, `.dockerignore`, `docker-compose.yml`, `render.yaml`, `backend/drizzle/0002_enable_rls.sql`, `backend/test/config.test.ts`, `frontend/.env.example`, `docs/deployment.md` |
| **File bị sửa** | Backend: `config.ts`, `http.ts`, `app.ts`, `server.ts`, `auth.ts`, `db/client.ts`, `test/api.test.ts`, `.env.example`. Frontend: `lib/api.ts`, `lib/session.ts`, `lib/use-load.ts`, `lib/api.test.ts` (viết lại toàn bộ), `UserSwitcher.tsx`, `ProjectForm.tsx`, `ProjectPanels.tsx`, `ui.tsx`, 5 trang, `layout.tsx`, `globals.css`, `next.config.mjs`, `tsconfig.json`. Tài liệu: `README.md`, `architecture.md`, `api-contract.md`, `week-04.md`, `backlog.md`, `week-03.md` |
| **Tài nguyên tạo bên ngoài repo** | Project Supabase `GomNang` (ref `fgabywgcwlqnzbvngiet`, $0/tháng) — tạo sau khi nhóm chọn "Deploy thật" |
| **Đã kiểm chứng bằng máy** | `npm test` 56/56; typecheck API sạch; `next build` sạch. `docker compose build` thành công, `up --wait` cả 3 service healthy. 13 request curl vào container trả đúng mã. Preflight CORS đúng; origin lạ không nhận header. Cả 6 bảng bật RLS trong Postgres thật; trigger chặn `UPDATE audit_log`; restart container dữ liệu còn. Trình duyệt: đăng nhập qua `dev-login` thật, nút theo vai đúng. Tắt container API: trang chủ hiện lỗi kèm "Thử lại", form giữ nguyên nội dung |
| **Lỗi phát sinh và đã sửa** | (1) Lần `compose up` đầu thất bại vì cổng 4000 đang bị một preview server chiếm — đã tắt preview server rồi chạy lại. (2) Ở 4A, AI kết luận "Docker engine không chạy được"; thực tế chỉ là Docker Desktop chưa được mở. Kết luận sai đó đã được ghi thêm vào lý do của D-09 — đã sửa ở `architecture.md` và `week-04.md` |
| **CHƯA kiểm chứng** | Build và chạy trên Render; build monorepo trên Vercel; kết nối TLS tới Supabase; thời gian đánh thức service khi ngủ; Security Advisor của Supabase sau khi có bảng. `DATABASE_CA_CERT` chưa từng được thử |
| **Human review** | ⬜ **Chưa hoàn tất.** An rà soát Dockerfile, `db/client.ts`, Compose, `render.yaml`; Khanh rà soát `lib/api.ts`, `lib/session.ts` |

### Quyết định AI đã tự đưa ra — nhóm xác nhận hoặc đổi

| Quyết định | Vì sao AI chọn | Đổi có tốn không |
| :-- | :-- | :-- |
| Xoá hẳn mock API và thanh "Chế độ demo" | Một đường code duy nhất; lỗi mạng giờ demo được bằng cách tắt API thật | Rẻ — mock còn trong commit `f2630a8` |
| CORS tự viết, không cài thư viện `cors` | Chỉ vài header, dễ giải thích từng dòng | Rẻ |
| Docker Compose dùng Postgres 17 thật, không dùng PGlite | Chạy thử đúng đường code của bản deploy | Rẻ |
| Mật khẩu Postgres của Compose ghi thẳng trong `docker-compose.yml` | Chỉ dùng trong container local; cổng database không mở ra ngoài máy | Rẻ — đổi sang biến trong `.env` |
| TLS tới Supabase chưa kiểm chứng chứng chỉ khi thiếu CA | Chạy được ngay; có cảnh báo trong log | Rẻ |
| Token lưu trong localStorage | Gọn cho bản demo | Trung bình — đổi sang cookie cần sửa cả backend |

---

## Mẫu cho các lần sau

```
## YYYY-MM-DD — <tiêu đề công việc>

| Mục | Nội dung |
| :-- | :-- |
| Task | |
| Tool / model | |
| File sinh ra hoặc bị sửa | |
| Đã kiểm chứng bằng máy | |
| Human review | ai đọc, phát hiện gì |
| Chỉnh sửa đã thực hiện | |
```
