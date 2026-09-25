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
| **File sinh ra** | `fe/` — `package.json`, `next.config.mjs`, `tsconfig.json`, `app/layout.tsx`, `app/globals.css`, `app/page.tsx`, `app/projects/[id]/page.tsx`, `app/projects/new/page.tsx`, `components/ui.tsx`, `lib/types.ts`, `lib/mock-data.ts`, `lib/api.ts`, `lib/validate-project.ts`, `lib/validate-project.test.ts`; `docs/week-03.md` |
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
| **File sinh ra** | `packages/domain/` (types, validate-project, rules, assess, views, demo-data + 4 file test); `be/` (10 file trong `src/`, `test/api.test.ts`, `scripts/sql.ts`, 2 migration, 3 body mẫu trong `examples/`); `fe/` (`lib/session.ts`, `lib/use-load.ts`, `lib/api.test.ts`, `components/ProjectForm.tsx`, `ProjectPanels.tsx`, `UserSwitcher.tsx`, trang sửa dự án, trang hàng chờ xác minh); `docs/api-contract.md`, `docs/week-04.md` |
| **File bị sửa** | `fe/lib/api.ts` (viết lại toàn bộ), các trang và `ui.tsx` cũ, `globals.css`, `README.md`, `architecture.md`, `proposal.md`, `backlog.md`, `week-03.md`, `.env.example` |
| **Đã kiểm chứng bằng máy** | `npm test` → 51/51 (domain 27, API 16, mock web 8). `tsc --noEmit` sạch. `next build` thành công 6 route. 25 request curl vào server thật đều ra đúng mã mong đợi. Tắt rồi bật lại server: dữ liệu còn, không nạp lại dữ liệu mẫu. Luồng 3B bấm qua trình duyệt với 3 vai, đúng từng bước. `npm run sql` đọc được database, lệnh sửa sổ ghi vết bị trigger chặn. 6 sơ đồ mermaid parse được |
| **Lỗi phát sinh trong lúc làm và đã sửa** | (1) PGlite không tự tạo thư mục cha của `.data/pglite` → server **không khởi động được ở lần chạy đầu**. Test không bắt được vì test dùng thư mục tạm đã tồn tại — chỉ lộ ra khi chạy server thật. Sửa ở `openDb`, chỗ duy nhất mọi nơi mở database đều đi qua. (2) `@types/express` v5 khai báo tham số đường dẫn là `string \| string[]` → 6 lỗi typecheck; sửa một chỗ ở `idParam` thay vì ép kiểu ở 6 route. (3) Proposal ghi cam kết vượt mức trả `400`; hiện thực theo chính sách mã lỗi là `422` → đã sửa proposal cho khớp |
| **CHƯA kiểm chứng** | Log tắt êm (`shutting down`, `database closed`) trên Windows. Docker — engine trên máy không chạy. Frontend gọi backend thật — chưa có CORS, việc của 4B. Trình đọc màn hình và thiết bị di động thật |
| **Human review** | ⬜ **Chưa hoàn tất.** An rà soát `be` và `packages/domain`; Khanh rà soát `fe` |

### Chỗ nhóm cần đọc kỹ nhất

1. **`packages/domain/src/rules.ts`** — mọi quyết định cho phép hay từ chối đều nằm ở đây. Đặc biệt quy tắc *người phụ trách tài chính không được xác nhận khoản đóng góp bằng tiền*: đây là **cách AI diễn giải BR-003**, đặc tả gốc không viết cụ thể tới mức đó. Nhóm phải quyết định có đồng ý không.
2. **`be/src/modules/contributions/contributions.repository.ts`**, hàm `lockNeedWithTotals` — dùng `SELECT … FOR UPDATE` để hai người không cùng cam kết vượt mục tiêu. Đây là câu hỏi về transaction rất dễ bị hỏi.
3. **`packages/domain/src/assess.ts`** — ngưỡng trùng lặp `0.5` và `0.8`, cùng danh sách từ nối, là AI tự đặt. **Chưa đo trên dữ liệu thật nào.**

### Quyết định AI đã tự đưa ra — nhóm xác nhận hoặc đổi

| Quyết định | Vì sao AI chọn | Đổi có tốn không |
| :-- | :-- | :-- |
| PGlite thay cho Postgres trong Docker | Docker engine trên máy không chạy; người khác clone về chạy ngay | Rẻ — cùng là PostgreSQL |
| Tách `packages/domain`, chuyển repo sang npm workspaces | Để form và API dùng đúng một bản quy tắc | Trung bình |
| `/api/users` không trả email | Email là dữ liệu cá nhân, không cần để chọn người phụ trách tài chính | Rẻ |
| Mã UUID cố định cho dữ liệu mẫu | Để ví dụ trong API contract chạy lại được | Rẻ |
| Người điều phối góp **tiền** vào chính dự án mình thì không ai xác nhận được | Hệ quả của hai quy tắc cùng lúc — AI ghi nhận là giới hạn, chưa sửa | Cần nhóm chốt quy tắc |

---

> **Ghi chú khi khôi phục (2026-09-25).** Sáu mục dưới đây, từ 2026-09-14 (Homework 4B) đến 2026-09-15 (đăng nhập bằng mật khẩu), được ghi trên nhánh main cũ, lúc repo còn dùng `backend/` `frontend/` `shared/`. Ngày 2026-09-25 main chuyển sang nguyên cây của An (merge `3c905e8`), nên code các mục này mô tả — file Docker, giao diện shadcn/ui, đăng nhập mật khẩu bằng scrypt… — không còn trong cây làm việc. Xem lại trong lịch sử ở commit `75f5379`: `git show 75f5379:<đường dẫn>`. Các mục giữ nguyên văn lúc ghi, kể cả bảng "File cũ nằm ở đâu bây giờ". File deploy đã được khôi phục và sửa cho hợp `be/` `fe/` — xem mục 2026-09-25 bên dưới.

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
| **Human review** | ⬜ **Chưa hoàn tất.** An rà soát Dockerfile, `db/client.ts`, Compose, `render.yaml`; Khanh rà soát `src/lib/api-client.ts`, `src/lib/session.ts` |

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

## 2026-09-15 — Tái cấu trúc repo

| Mục | Nội dung |
| :-- | :-- |
| **Task** | Đổi cấu trúc repo theo 8 quyết định nhóm chốt qua hai vòng hỏi: một repo; thư mục gốc `frontend/` `backend/` `shared/`; quy tắc nghiệp vụ một bản dùng chung; backend chia theo module; frontend chia theo feature; test nằm cạnh file; tên file có tên module; chỗ đặt dịch vụ AI để tuần 6 quyết |
| **Tool / model** | Claude Code (Claude Opus 5) |
| **Cách làm** | Bước 1 chỉ đổi tên thư mục gốc bằng `git mv` và sửa đường dẫn — commit riêng `cec6cb1`. Bước 2 tách code bên trong thành module và feature, không đổi logic. Bước 3 sửa tài liệu |
| **Đã kiểm chứng bằng máy** | Sau bước 1: `npm test` 56/56, typecheck sạch, `next build` thành công; clone sạch rồi `npm ci` và test lại, pass. Sau bước 2: `npm test` 56/56, typecheck sạch, `next build` 6 route; `docker compose up --build` rồi 17 request curl đi qua đủ 6 module backend, trả đúng mã; 4 trang frontend trả 200. Trên trình duyệt với bản Docker: trang chủ, hàng chờ xác minh, chi tiết dự án chờ duyệt (khối người gác cổng và khối duyệt hiện đúng cho người xác minh), form tạo dự án (tải danh sách thành viên từ API, gửi form rỗng báo 9 lỗi), trang sửa dự án đã công khai (báo không sửa được) |
| **Lỗi phát sinh và đã sửa** | `npm install` không tự xoá 3 mục workspace đường dẫn cũ trong `package-lock.json` — đã xoá tay, cài lại, và kiểm bằng clone sạch |
| **CHƯA kiểm chứng** | Render và Vercel với cấu trúc mới — Root Directory trên Vercel phải là `frontend` |
| **Human review** | ⬜ **Chưa hoàn tất.** Cả hai đọc [architecture.md §7](architecture.md#7-cấu-trúc-code) để nắm bản đồ mới |

### File cũ nằm ở đâu bây giờ

Các mục nhật ký phía trên giữ nguyên đường dẫn lúc ghi. Đối chiếu:

| Trước | Bây giờ |
| :-- | :-- |
| `apps/api/`, `apps/web/`, `packages/domain/` | `backend/`, `frontend/`, `shared/` |
| `src/routes.ts` của backend | `backend/src/modules/{projects,verification,contributions}/*.routes.ts` |
| `src/db/repo.ts` của backend | `*.repository.ts` trong từng module; phần ghép nhiều bảng chuyển lên `*.service.ts` |
| `src/auth.ts` của backend | `backend/src/modules/auth/` — `auth.service.ts`, `auth.middleware.ts`, `auth.routes.ts` |
| `src/http.ts` của backend | `backend/src/common/` — `errors.ts`, `logger.ts`, `cors.ts`, `validation.ts` |
| `test/config.test.ts` của backend | `backend/src/config.test.ts` |
| `app/*/page.tsx` của frontend | `frontend/src/features/*/*Page.tsx`; `frontend/src/app/` chỉ còn file khai báo đường dẫn |
| `components/ProjectPanels.tsx` | tách vào `features/projects/ProjectDetailPage.tsx`, `features/verification/VerificationPanels.tsx`, `features/contributions/ContributionPanels.tsx` |
| `components/ProjectForm.tsx`, `components/UserSwitcher.tsx` | `features/projects/ProjectForm.tsx`, `features/auth/UserSwitcher.tsx` |
| `lib/api.ts` của frontend | `frontend/src/lib/api-client.ts` và `features/*/*.api.ts` |
| `lib/api.test.ts` của frontend | `frontend/test/backend-integration.test.ts` |

---

## 2026-09-15 — Nối backend vào database Supabase thật

| Mục | Nội dung |
| :-- | :-- |
| **Task** | Tạo bảng và dữ liệu trên project Supabase `GomNang`; chạy backend trên database đó; cho web gọi backend, chạy trọn luồng chính |
| **Tool / model** | Claude Code (Claude Opus 5); connector Supabase — chỉ dùng `SELECT` và Security Advisor; trình duyệt tích hợp |
| **File sinh ra hoặc bị sửa** | Không đổi code. `backend/.env` (không commit) thêm dòng `DATABASE_URL`: **Khanh tự dán** chuỗi Session pooler. AI chỉ kiểm hình dạng chuỗi — host, cổng, tên user, có còn chữ `[YOUR-PASSWORD]` không — và không in giá trị ra. Tài liệu: `week-04.md` |
| **Cách làm** | Không tạo bảng bằng tay. Backend tự chạy 3 migration và tự nạp dữ liệu mẫu khi thấy database trống — cùng đường code bản deploy trên Render sẽ chạy |
| **Đã kiểm chứng bằng máy** | Log khởi động `postgres (tls unverified)` và `database was empty, demo data loaded`. Đếm dòng trên Supabase khớp dữ liệu mẫu (5 · 3 · 8 · 6 · 3 · 23), 3 migration, cả 6 bảng bật RLS. Trên web: tạo → gửi xác minh → duyệt → cam kết → bàn giao → xác nhận; mỗi bước đọc lại bằng SQL đều đúng trạng thái và đúng người thực hiện. Log backend không có lỗi. Security Advisor: 1 INFO cố ý, 1 WARN chưa sửa — chi tiết ở `week-04.md`. Thêm 3 agent chỉ đọc cố tìm chỗ sai: mật khẩu không có trong file hay lịch sử git nào; migration, 2 trigger, 15 ràng buộc và RLS đều có trên Supabase; Data API gọi bằng khoá công khai trả rỗng; PGlite trên máy không bị ghi. Khởi động lại backend và web, API vẫn khớp SQL đến từng hạng mục |
| **Lỗi phát sinh và đã sửa** | (1) Lần dán đầu, chuỗi còn nguyên chữ `[YOUR-PASSWORD]` — bước kiểm hình dạng chuỗi bắt được trước khi chạy backend. (2) Agent so khớp API với database bị ngắt giữa chừng vì hết lượt dùng; lúc chạy lại thì hai server đã tắt, nên bước so khớp được làm lại trực tiếp sau khi khởi động lại |
| **CHƯA kiểm chứng** | Render và Vercel; kiểm chứng chứng chỉ TLS bằng `DATABASE_CA_CERT`; thời gian đánh thức service khi ngủ |
| **Human review** | ⬜ **Chưa hoàn tất.** Khanh mở Table Editor trên dashboard Supabase xem lại 6 bảng; An đọc `backend/src/db/client.ts` và `seed.ts` để giải thích được vì sao không phải tạo bảng tay |

---

## 2026-09-15 — Kiểm tra bản deploy Render và Vercel

| Mục | Nội dung |
| :-- | :-- |
| **Task** | Kiểm tra bản deploy nhóm tự tạo; tìm cấu hình sai và chỉ cách sửa |
| **Tool / model** | Claude Code (Claude Opus 5); `curl`; trình duyệt tích hợp; connector Supabase — chỉ `SELECT` |
| **Việc do người làm** | Khanh đăng nhập Render và Vercel, tạo service, nhập mọi biến môi trường. AI không đăng nhập dashboard nào, không nhập secret |
| **File bị sửa** | `docs/deployment.md` — thêm 3 dòng "Bẫy thường gặp"; `docs/week-04.md` — mục Deploy |
| **Đã kiểm chứng bằng máy** | `/health` 200; API trả dự án chỉ có trên Supabase; số dòng Supabase không đổi sau khi Render khởi động. Trên trình duyệt ở tên miền production: 3 dự án tải được, đăng nhập Tâm qua preflight CORS, hàng chờ xác minh 200 |
| **Lỗi phát sinh và đã sửa** | (1) Render bỏ qua hai biến `sync: false` → API chạy PGlite trong container; phát hiện vì API thiếu dự án "Áo mưa". (2) `CORS_ORIGINS` đặt nhầm link có mã deploy. (3) `JWT_SECRET` lộ trong ảnh chụp dashboard → đã đổi |
| **CHƯA kiểm chứng** | `JWT_SECRET` mới có thật sự khác giá trị cũ không — phép thử ký token bằng secret cũ bị bộ phân loại an toàn chặn, nhóm tự đối chiếu trên dashboard. Thời gian đánh thức service. Luồng ghi dữ liệu trên bản deploy |
| **Human review** | ⬜ **Chưa hoàn tất.** Khanh mở bản deploy trên máy khác hoặc trình duyệt ẩn danh, chạy thử luồng chính trước buổi nộp |

---

## 2026-09-15 — Làm lại giao diện bằng shadcn/ui

| Mục | Nội dung |
| :-- | :-- |
| **Task** | Nâng cấp giao diện frontend bằng design system có sẵn của cộng đồng. Khanh chọn qua khảo sát: shadcn/ui + Tailwind; phong cách ấm, tông nắng; dark mode theo hệ thống kèm nút chuyển; làm toàn bộ màn hình một lần |
| **Tool / model** | Claude Code (Claude Opus 5) cùng workflow nhiều agent: 5 agent chuyển 5 nhóm file song song, mỗi nhóm có 1 agent review chỉ đọc, chuyên tìm chỗ lệch hành vi so với commit trước. CLI `shadcn` 4.21, theme gốc Solar Dusk lấy từ tweakcn.com |
| **Cách làm** | AI dựng phần nền trước: Tailwind 4, `shadcn init` (bản Radix, preset Nova), 14 component shadcn, theme trong `globals.css`, `layout.tsx` với font Be Vietnam Pro và `next-themes`, `components/states.tsx` (khối dùng chung), `theme-toggle.tsx`. Sau đó agent chuyển từng màn hình theo một bản quy ước chung: bảng màu trạng thái, thanh tiến độ, giữ nguyên chữ, id, aria, logic |
| **File sinh ra** | `frontend/components.json`, `postcss.config.mjs`, `src/components/ui/*` (14 file shadcn sinh ra), `src/components/states.tsx`, `src/components/theme-toggle.tsx` |
| **File bị sửa hoặc xoá** | Sửa: `src/app/globals.css` (viết lại), `src/app/layout.tsx`, 10 file trong `src/features/`, `frontend/package.json`, `package-lock.json`, `docs/architecture.md` (D-22, sơ đồ thư mục), `docs/proposal.md`. Xoá: `src/components/ui.tsx` — thay bằng `states.tsx` |
| **Đã kiểm chứng bằng máy** | Review: 0 lỗi phải sửa, 16 góp ý nhỏ; không còn tên class CSS cũ. `tsc` sạch; `npm test` 27 · 22 · 7 pass; `next build` 6 route. Trên trình duyệt với backend nối Supabase: trang chủ, chi tiết dự án, bảng đóng góp và sổ ghi vết ở chế độ sáng; gửi form rỗng hiện 9 lỗi, con trỏ nhảy vào ô "Tên dự án"; chế độ tối với tài khoản người xác minh — khối người gác cổng, khối duyệt, hàng chờ; mở menu giao diện bằng bàn phím, chọn "Sáng" thì đổi ngay và lưu lại; khổ 375px không cuộn ngang ở trang chủ, trang chi tiết, form. Console không có lỗi. Không ghi dữ liệu nào vào database khi kiểm |
| **Lỗi phát sinh và đã sửa** | (1) `shadcn init` dừng lại hỏi preset và đòi có Tailwind trước — đã cài Tailwind rồi truyền `-b radix -p nova`. (2) Lệnh Git Bash ghi nhiều file bằng heredoc bị lỗi cú pháp, không ghi được gì — viết lại bằng công cụ ghi file |
| **CHƯA kiểm chứng** | Trình đọc màn hình thật; chế độ tương phản cao của Windows (review ghi nhận thẻ dự án chỉ có vòng focus bằng box-shadow, chế độ này có thể ẩn đi); build trên Vercel và Docker với phụ thuộc mới |
| **Human review** | ⬜ **Chưa hoàn tất.** Khanh xem giao diện trên máy mình, đọc `components/states.tsx` và phần đầu `globals.css` để giải thích được theme hoạt động thế nào |

---

## 2026-09-15 — Đăng ký và đăng nhập bằng mật khẩu

| Mục | Nội dung |
| :-- | :-- |
| **Task** | Làm màn đăng nhập và đăng ký. Khanh chọn qua khảo sát: làm đủ frontend + backend + database; giữ đăng nhập nhanh bằng tài khoản mẫu trên màn đăng nhập; đăng ký chỉ hỏi tên hiển thị, email, mật khẩu; token vẫn nằm trong localStorage |
| **Tool / model** | Claude Code (Claude Opus 5) cùng workflow nhiều agent: 1 agent backend và 1 agent frontend làm song song, sau đó 1 agent rà bảo mật backend và 1 agent rà frontend (trợ năng, bảo mật, khớp contract), mỗi phía có 1 agent sửa lỗi. Lần chạy đầu bị ngắt giữa chừng vì hết lượt dùng; lần sau tiếp tục trên phần backend đã viết |
| **Cách làm** | AI viết trước `shared/src/validate-auth.ts` (quy tắc hợp lệ dùng chung hai phía, như D-08) và chốt contract hai endpoint, rồi mới giao cho agent. Quyết định kỹ thuật: [architecture.md D-23](architecture.md#6-quyết-định-kỹ-thuật-đã-chốt) |
| **File sinh ra** | `shared/src/validate-auth.ts` + test; `backend/drizzle/0003_user_password.sql` (drizzle-kit sinh); `backend/src/modules/auth/password.ts` + test; `frontend/src/app/login/page.tsx`, `frontend/src/app/register/page.tsx`; `frontend/src/features/auth/` — `LoginPage.tsx`, `RegisterPage.tsx`, `AccountMenu.tsx`, `auth-redirect.ts`, `demo-accounts.ts`; `frontend/test/auth-redirect.test.ts` |
| **File bị sửa hoặc xoá** | Backend: `db/schema.ts`, `users.repository.ts`, `auth.service.ts`, `auth.routes.ts`, `common/errors.ts`, `test/api.test.ts`. Frontend: `layout.tsx`, `auth.api.ts`, `lib/api-client.ts`, `components/states.tsx`, `ProjectForm.tsx`, `EditProjectPage.tsx`, `ContributionPanels.tsx`, `test/backend-integration.test.ts`; xoá `UserSwitcher.tsx`. Tài liệu: `api-contract.md`, `architecture.md` (D-23, sơ đồ thư mục), `README.md`, `deployment.md` |
| **Lỗ hổng do agent rà soát tìm ra và đã sửa** | (1) **Vượt mật khẩu:** `dev-login` nhận mọi email, mà bản deploy bật `dev-login` — ai biết email của người đã đăng ký là vào được tài khoản đó không cần mật khẩu. Nay `dev-login` chỉ nhận tài khoản mẫu chưa có mật khẩu. (2) **Lộ dữ liệu vào log:** lỗi database của drizzle chứa mọi tham số câu SQL (email, hash mật khẩu) và bị ghi nguyên vào log — nay chỉ ghi lỗi gốc của driver, áp dụng cho mọi endpoint. (3) Ký tự NUL trong email hoặc tên gây lỗi 500 — nay trả 400. (4) Người đang đăng nhập gõ sai mật khẩu khi đổi tài khoản thì bị mất phiên — nay chỉ xoá phiên khi chính token bị từ chối. (5) Nút hiện mật khẩu đổi cả nhãn lẫn `aria-pressed`, trình đọc màn hình đọc sai trạng thái |
| **Đã kiểm chứng bằng máy** | `npm test`: shared 34 · backend 37 · frontend 13 pass; `tsc` sạch cả backend và frontend; `next build` có thêm `/login`, `/register`. Gọi thẳng API trên backend chạy PGlite tạm (không đụng Supabase): đăng ký 201, response không có chữ "password"; email trùng khác hoa thường → 409; `dev-login` với tài khoản có mật khẩu → 404; sai mật khẩu, email lạ, tài khoản mẫu → 401 với body giống hệt nhau; đăng nhập email có khoảng trắng và chữ hoa vẫn vào được; mật khẩu 3 ký tự → 422. Trên trình duyệt: đăng ký form rỗng báo 3 lỗi và nhảy vào ô tên; nhập lại mật khẩu sai báo lỗi; đăng ký hợp lệ → về trang chủ, header hiện menu tài khoản; đăng xuất; sai mật khẩu hiện `INVALID_CREDENTIALS`; đăng nhập đúng; khách vào trang tạo dự án thấy "Cần đăng nhập" kèm link `/login?next=/projects/new`; đăng nhập nhanh Lê Minh Tâm từ `/login?next=/verify` về đúng hàng chờ xác minh |
| **CHƯA kiểm chứng** | Migration `0003` trên Supabase thật và bản deploy (sẽ tự chạy khi Render deploy). Trình đọc màn hình thật. Góp ý nhỏ chưa làm: nút tài khoản mẫu mất focus khi lỗi; "Đổi tài khoản" và thông báo 401 chưa giữ trang đang xem trong `?next` |
| **Giới hạn đã biết** | Chưa giới hạn số lần đăng nhập sai, chưa xác nhận email, chưa có quên mật khẩu. Đăng ký với email đã có trả 409, nên vẫn dò được email nào đã đăng ký — chấp nhận ở bản đồ án |
| **Human review** | ⬜ **Chưa hoàn tất.** An đọc `password.ts`, `auth.service.ts` và phần sửa `common/errors.ts`; Khanh đọc `LoginPage.tsx`, `auth-redirect.ts` (chặn chuyển hướng sang trang lạ) |

---

## 2026-09-15 — Tổ chức module, tích hợp FE–BE–DB và đánh giá bài 3/4

| Mục | Nội dung |
| :-- | :-- |
| **Task** | Chuyển repo sang `be/`, `fe/`; tách backend theo module và frontend theo `libs`/`presentation`; nối HTTP; đánh giá mức hoàn thành bài 3, 4 và phân tích luồng Tạo dự án |
| **Tool / model** | Codex (GPT-6) |
| **File sinh ra hoặc bị sửa** | Cấu trúc module BE/FE, adapter mock/HTTP, session provider, Next.js rewrite, Playwright E2E, README, tài liệu kiến trúc và `week-03-04-review.md` |
| **Đã kiểm chứng bằng máy** | `npm.cmd test` 51/51; `npm.cmd run typecheck` đạt; `npm.cmd run build` đạt; `npm.cmd run test:e2e` 1/1; backend mặc định mở PGlite mới và `/health` trả DB ok |
| **Lỗi phát hiện và đã sửa** | SessionProvider không cập nhật sau hydration trong luồng HTTP; origin 127.0.0.1 bị Next dev chặn; dữ liệu PGlite cũ không mở được. Đã sửa provider, cho phép origin E2E và dùng thư mục dữ liệu mặc định mới để bảo toàn thư mục cũ |
| **Human review** | ⬜ **Chưa hoàn tất.** Tài liệu do AI phân tích giúp học luồng, không thay thế việc Khanh/An tự đọc và ghi phát hiện của mình |

---

## 2026-09-25 — Gộp nhánh của An vào main, khôi phục file deploy và nhật ký

| Mục | Nội dung |
| :-- | :-- |
| **Task** | Gộp nhánh `BE_An` vào main, lấy nguyên cây của An. Nhóm chốt qua khảo sát: "lấy nguyên cây của An", merge vào main rồi push. Trước khi merge, fast-forward main lên `feat/auth-password`. Sau đó khôi phục file deploy, sửa cho hợp `be/` `fe/`; khôi phục các mục nhật ký của main cũ |
| **Tool / model** | Claude Code (Claude Opus 5.5) cùng workflow nhiều agent |
| **File sinh ra hoặc bị sửa** | Merge commit `3c905e8`. Khôi phục từ main cũ và sửa cho hợp `be/` `fe/`: `be/Dockerfile`, `fe/Dockerfile`, `.dockerignore`, `docker-compose.yml`, `render.yaml`, `docs/deployment.md`; sửa `.env.example` (thêm lại `JWT_SECRET` cho Compose). Không sửa code nào trong `be/src`, `fe/src`, `packages/`. `docs/ai-usage-log.md`: khôi phục 6 mục 2026-09-14 → 2026-09-15, thêm ghi chú và mục này; không sửa mục nào An đã ghi |
| **Đã kiểm chứng bằng máy** | Cây sau merge giống hệt `origin/BE_An` (`git diff` rỗng). `npm ci` đạt; `npm test` 27 · 17 · 8 pass; typecheck sạch; `next build` của `fe` đạt, 8 route |
| **Kiểm chứng file deploy** | `docker compose up -d --build --wait`: cả 3 service healthy. `GET :4000/health` 200; web `:3000` trả 200 ở `/`, `/login`, `/register`, `/verify`, `/projects/new`; `GET :3000/api/projects` đi qua proxy của Next tới backend → 200, 4 dự án. Qua proxy: đăng nhập tài khoản mẫu 200; đăng ký 201; đăng nhập đúng 200; sai mật khẩu 401 `INVALID_CREDENTIALS`; `/api/users` có token 200, không token 401. Hai container chạy bằng user `node`. Chạy lại với volume trống: backend tự nạp dữ liệu mẫu. Image backend không có `DATABASE_URL`, `NODE_ENV=production`: dùng PGlite, đăng nhập tài khoản mẫu bị tắt (404) đúng thiết kế. `npm test` và typecheck vẫn đạt |
| **CHƯA kiểm chứng** | Bản deploy sau merge. Ngay sau khi push, Vercel vẫn phục vụ bản cũ; Render không trả lời trong 150 giây |
| **Human review** | ⬜ **Chưa hoàn tất.** An đọc lại `be/Dockerfile`, `fe/Dockerfile`, `render.yaml`, `docker-compose.yml`, `docs/deployment.md` bản mới; Khanh cấu hình lại Vercel |

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
