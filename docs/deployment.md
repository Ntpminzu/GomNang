# Deploy — GOM NẮNG

Ba phần, ba nơi. Làm **đúng thứ tự** dưới đây, vì phần sau cần địa chỉ của phần trước.

```mermaid
flowchart LR
    U["Trình duyệt"] -->|"HTTPS, trang web và /api/*"| V["Vercel<br/>fe — Next.js"]
    V -->|"HTTPS, rewrite /api/*<br/>JSON, Bearer token"| R["Render<br/>be trong Docker<br/>Singapore"]
    R -->|"TLS có kiểm CA, Session pooler"| S[("Supabase<br/>PostgreSQL 17<br/>Singapore")]
    G["GitHub<br/>Ntpminzu/GomNang"] -->|"push nhánh main"| V
    G -->|"push nhánh main"| R
```

Trình duyệt **chỉ gọi Vercel**. Next.js chuyển tiếp `/api/*` sang Render (rewrite trong [`fe/next.config.mjs`](../fe/next.config.mjs)), nên backend không cần CORS và không có CORS.

| Phần | Nơi chạy | Gói | Ai làm |
| :-- | :-- | :-- | :-- |
| Database | Supabase, project **GomNang** | Free | **Đã tạo** — ref `fgabywgcwlqnzbvngiet`, vùng `ap-southeast-1` |
| Backend `be/` | Render, Docker, theo [`render.yaml`](../render.yaml) và [`be/Dockerfile`](../be/Dockerfile) | Free | Nhóm tự đăng nhập và tạo |
| Frontend `fe/` | Vercel, Root Directory `fe` | Hobby | Nhóm tự đăng nhập và tạo |

> **Không bao giờ** dán `DATABASE_URL` hay mật khẩu database vào chat, issue, commit hay file trong repo. Chỉ nhập trên dashboard của Render.

Đã có service Render và project Vercel tạo từ cấu trúc cũ? Làm theo mục [Chuyển từ cấu trúc cũ](#chuyển-từ-cấu-trúc-cũ-backend-frontend) thay cho Bước 2 và Bước 3.

## Biến môi trường

| Nơi | Biến | Bắt buộc | Ghi chú |
| :-- | :-- | :-- | :-- |
| Render (be) | `NODE_ENV` | Có | `production`. Khi đó đăng nhập mẫu luôn tắt |
| Render (be) | `JWT_SECRET` | Có | Ít nhất 32 ký tự, thiếu thì server không khởi động. Render tự sinh |
| Render (be) | `DATABASE_URL` | Có | Session pooler của Supabase. Bỏ trống thì backend dùng PGlite trong container — mất dữ liệu mỗi lần deploy |
| Render (be) | `SEED_ON_EMPTY` | Không | Mặc định `true`: nạp dữ liệu mẫu khi database trống. Supabase đã có dữ liệu nên để `false` |
| Render (be) | `PORT` | Không | Render tự đặt, backend tự đọc |
| Vercel (fe) | `API_ORIGIN` | Có | Địa chỉ Render, **không** có `/` ở cuối. Đọc **lúc build** |
| Vercel (fe) | `NEXT_PUBLIC_API_MODE` | Không | `http` (mặc định) hoặc `mock`. Đọc **lúc build** |

Các biến khác backend đọc (`DATA_DIR`, `ENABLE_DEV_LOGIN`) chỉ dùng khi chạy local — xem [`be/.env.example`](../be/.env.example).

## Chạy thử cả hệ thống trên máy

```bash
cp .env.example .env              # điền JWT_SECRET theo hướng dẫn trong file
docker compose up --build --wait  # db + backend + frontend
```

Web: http://localhost:3000 · API: http://localhost:4000/health. Compose dùng PostgreSQL 17 riêng, không đụng tới Supabase, và bật đăng nhập mẫu (`NODE_ENV=development`) vì toàn dữ liệu giả. `docker compose down` tắt và giữ dữ liệu; thêm `-v` để xoá.

---

## Bước 1 — Lấy chuỗi kết nối Supabase

1. Mở https://supabase.com/dashboard/project/fgabywgcwlqnzbvngiet
2. Bấm nút **Connect** ở đầu trang.
3. Chọn thẻ **Session pooler** — **không** chọn *Direct connection*. Lý do ở mục "Bẫy thường gặp".
4. Chép chuỗi URI, có dạng:
   `postgresql://postgres.fgabywgcwlqnzbvngiet:[YOUR-PASSWORD]@aws-…pooler.supabase.com:5432/postgres`
5. Thay `[YOUR-PASSWORD]` bằng mật khẩu database.
   - Không biết mật khẩu: **Project Settings → Database → Reset database password**, đặt mật khẩu mới.
   - Mật khẩu có ký tự đặc biệt như `@ # / ? %` thì phải mã hoá URL. Cách dễ nhất: đặt mật khẩu chỉ gồm chữ và số.

**Không cần tạo bảng, không cần thêm `sslmode`.** Backend tự chạy migration mỗi lần khởi động. Với host `*.supabase.com` backend tự bật TLS và kiểm chứng chỉ bằng [`be/certs/prod-ca-2021.crt`](../be/certs/prod-ca-2021.crt).

## Bước 2 — Deploy backend lên Render

1. Đăng nhập https://dashboard.render.com bằng tài khoản GitHub **Ntpminzu**.
2. **New → Blueprint** → chọn repo `Ntpminzu/GomNang`. Repo private nên Render sẽ xin quyền đọc repo — cấp quyền cho riêng repo này là đủ.
3. Render đọc [`render.yaml`](../render.yaml) và hỏi một biến: `DATABASE_URL` — điền chuỗi ở Bước 1.
   Các biến còn lại đã có sẵn trong blueprint. `JWT_SECRET` do Render tự sinh ngẫu nhiên.
4. Bấm **Apply**. Lần build đầu mất vài phút.
5. Mở tab **Logs** của service `gomnang-api`. Deploy đúng thì có dòng:
   ```
   {"level":"info","msg":"api started","port":10000,"env":"production","database":"postgresql","devLogin":false}
   ```
   `"database"` là đường dẫn `/data/pglite` thay vì `postgresql` nghĩa là thiếu `DATABASE_URL` — xem "Bẫy thường gặp".
6. Chép địa chỉ service ở đầu trang, dạng `https://gomnang-api.onrender.com` — tên có thể khác nếu đã có người dùng. Kiểm tra:
   ```bash
   curl https://gomnang-api.onrender.com/health
   ```
   Mong đợi `{"status":"ok","db":"ok",...}`.

## Bước 3 — Deploy frontend lên Vercel

1. Đăng nhập https://vercel.com bằng tài khoản GitHub **Ntpminzu**.
2. **Add New → Project** → import `Ntpminzu/GomNang`, cấp quyền đọc repo nếu được hỏi.
3. Cấu hình trước khi bấm Deploy:

   | Mục | Giá trị |
   | :-- | :-- |
   | Root Directory | `fe` |
   | Framework Preset | Next.js (Vercel tự nhận) |
   | Environment Variable `API_ORIGIN` | Địa chỉ Render ở Bước 2, **không** có dấu `/` ở cuối |
   | Environment Variable `NEXT_PUBLIC_API_MODE` | `http` (bỏ trống cũng được) |

   Để nguyên lệnh build và lệnh cài đặt mặc định. Vercel tự nhận ra repo là npm workspaces. Giữ bật **Include files outside the root directory** (mặc định bật) — `fe` dùng code ở `packages/domain`.
4. Bấm **Deploy**. Xong thì chép địa chỉ production, dạng `https://gom-nang.vercel.app`.

Không có bước cấu hình CORS: trình duyệt gọi `/api/*` trên chính tên miền Vercel.

## Bước 4 — Kiểm tra đầu cuối

1. `curl https://<tên-miền-vercel>/api/projects` trả danh sách dự án JSON — nghĩa là Vercel chuyển tiếp được sang Render và Render đọc được Supabase.
2. Mở địa chỉ Vercel. Danh sách dự án hiện ra.
3. **Đăng ký** một tài khoản rồi **Đăng nhập** bằng mật khẩu, chạy thử luồng tạo dự án → gửi xác minh.
   Menu chọn tài khoản mẫu **không** chạy trên bản production (xem "Bảo mật"). Cần duyệt dự án bằng người xác minh thì làm theo dòng "đăng nhập mẫu" ở bảng Bảo mật.
4. Ghi địa chỉ web và địa chỉ API vào [`week-04.md`](week-04.md), mục Homework 4B.

---

## Chuyển từ cấu trúc cũ (backend/ frontend/)

Service Render và project Vercel đang có được tạo cho thư mục `backend/`, `frontend/`. Từ khi `main` là cấu trúc `be/`, `fe/`, build của cả hai sẽ **thất bại** (không còn thư mục cũ) — bản đang chạy vẫn phục vụ cho tới khi có bản build thành công. Sửa Render trước, chờ deploy xanh, rồi mới sửa Vercel.

### Render — service `gomnang-api`

**Settings → Build & Deploy:**

| Mục | Cũ | Mới |
| :-- | :-- | :-- |
| Dockerfile Path | `./backend/Dockerfile` | `./be/Dockerfile` |
| Docker Build Context Directory | `.` | `.` — giữ nguyên |
| Health Check Path | `/health` | `/health` — giữ nguyên |

Service tạo bằng Blueprint thì push `render.yaml` mới có thể tự đổi Dockerfile Path — vẫn mở Settings kiểm lại.

**Environment:**

| Biến | Làm gì | Lý do |
| :-- | :-- | :-- |
| `NODE_ENV` | Giữ `production` | |
| `JWT_SECRET` | Giữ | Backend mới đòi ít nhất 32 ký tự; giá trị Render sinh đủ dài |
| `DATABASE_URL` | Giữ | Vẫn là Session pooler. Backend mới tự bật TLS có kiểm CA cho host Supabase |
| `SEED_ON_EMPTY` | Đổi thành `false` | Cho khớp `render.yaml`. Supabase đã có dữ liệu nên giá trị này không làm gì thêm |
| `CORS_ORIGINS` | **Xoá** | Backend mới không đọc. Trình duyệt gọi API qua Vercel |
| `ALLOW_DEMO_LOGIN_IN_PRODUCTION` | **Xoá** | Backend mới không đọc. `NODE_ENV=production` là đăng nhập mẫu luôn tắt |

Không cần thêm biến mới. Biến bị bỏ khỏi `render.yaml` không tự mất trên dashboard — phải xoá tay. **Save, rebuild, and deploy**, rồi kiểm tra log và `/health` như Bước 2.

### Vercel — project frontend

| Mục | Làm gì |
| :-- | :-- |
| Settings → Build and Deployment → Root Directory | `frontend` → `fe` |
| Env `NEXT_PUBLIC_API_URL` | **Xoá** — `fe` không đọc |
| Env `API_ORIGIN` | **Thêm**, giá trị = giá trị cũ của `NEXT_PUBLIC_API_URL` (địa chỉ Render, không có `/` ở cuối) |
| Env `NEXT_PUBLIC_API_MODE` | Thêm `http` (tuỳ chọn, mặc định đã là `http`) |

Rồi **Deployments → Redeploy**. Kiểm tra như Bước 4.

### Dữ liệu từ bản cũ

| Hiện tượng | Nguyên nhân | Cách sửa |
| :-- | :-- | :-- |
| Đăng ký, đăng nhập hoặc danh sách thành viên báo lỗi máy chủ; log có `column "phone" does not exist` | Database từng chạy migration `0003_user_password` của backend cũ. Mốc thời gian của nó mới hơn `0002_chubby_metal_master` của `be`, nên drizzle bỏ qua migration thêm cột `phone` | Supabase → **SQL Editor** chạy `ALTER TABLE users ADD COLUMN IF NOT EXISTS phone text;` rồi Render → **Restart service**. Với Compose local: `docker compose down -v` (xoá dữ liệu local) |
| Tài khoản đăng ký trên bản cũ không đăng nhập được | Bản cũ băm mật khẩu bằng scrypt, `be` kiểm bằng bcrypt | Đăng ký lại bằng email khác |

---

## Bẫy thường gặp

| Hiện tượng | Nguyên nhân | Cách sửa |
| :-- | :-- | :-- |
| API vẫn chạy, `/health` báo ok, nhưng dự án tạo ra biến mất sau mỗi lần deploy; tab **Environment** không có `DATABASE_URL` | Biến này khai `sync: false` trong `render.yaml`: Render chỉ hỏi **một lần** lúc tạo Blueprint, bỏ trống thì không tạo, các lần sync sau cũng không thêm. Thiếu `DATABASE_URL` thì backend lặng lẽ dùng PGlite trong container — mất khi container khởi động lại | **Environment → Edit → + Add Environment Variable**, thêm `DATABASE_URL`, rồi **Save, rebuild, and deploy**. Log đúng phải có `"database":"postgresql"` |
| Mở link Vercel thì bị chuyển sang trang đăng nhập Vercel | Đang dùng link có mã deploy, dạng `gom-nang-frontend-o9f5s0h69-….vercel.app`: link này bị Deployment Protection chặn với người ngoài team và đổi sau mỗi lần deploy | Dùng **tên miền production** — Vercel → project → **Domains**, ví dụ `https://gom-nang-frontend.vercel.app` |
| Web báo "Máy chủ phản hồi quá lâu" hoặc "Không kết nối được máy chủ" ngay lần mở đầu | Gói miễn phí của Render cho service ngủ khi lâu không có request; lần đánh thức mất khá lâu, lâu hơn thời gian chờ 15 giây của web | Mở thẳng `https://<render>/health` để đánh thức, đợi rồi bấm "Thử lại". **Trước buổi demo mở link trước vài phút** |
| Web không tải được dự án, báo "Máy chủ không trả dữ liệu JSON hợp lệ" hoặc lỗi kết nối, dù `/health` của Render vẫn ok | Thiếu hoặc sai `API_ORIGIN` trên Vercel (thừa `/`, sai `https`), hoặc đổi biến mà chưa build lại | Sửa `API_ORIGIN`, rồi Vercel → Deployments → **Redeploy** |
| Đổi `API_ORIGIN` hay `NEXT_PUBLIC_API_MODE` trên Vercel mà web vẫn như cũ | Hai biến này được chốt **lúc build** | Vercel → Deployments → **Redeploy** |
| Chọn tài khoản mẫu ở menu thì báo `Không có endpoint POST /api/auth/dev-login.` | `NODE_ENV=production`: backend tắt đăng nhập mẫu | Dùng Đăng ký / Đăng nhập. Muốn bật cho buổi demo: xem bảng Bảo mật |
| Render deploy xong rồi chết, log có `database startup failed` | Dùng nhầm chuỗi *Direct connection*: máy chủ Supabase gói miễn phí chỉ nhận IPv6 ở đường này, còn Render gọi ra bằng IPv4 | Dùng chuỗi **Session pooler** ở Bước 1 |
| Log có `password authentication failed` | Sai mật khẩu, hoặc mật khẩu có ký tự đặc biệt chưa mã hoá URL | Reset mật khẩu thành chỉ chữ và số, sửa lại `DATABASE_URL` |
| Log có `invalid configuration` rồi dừng | Thiếu `JWT_SECRET` hoặc ngắn hơn 32 ký tự | Environment → **Generate** giá trị mới |
| API báo lỗi database sau khi nhóm lâu không dùng | Supabase gói miễn phí tạm dừng project khi lâu không có hoạt động | Dashboard Supabase → **Restore project** |
| Lỡ để lộ giá trị `JWT_SECRET` (chụp màn hình, dán vào chat) | Ai có secret là tự ký được token của bất kỳ tài khoản nào, kể cả người xác minh | Đặt giá trị mới trên Render rồi deploy lại. Mọi phiên đăng nhập cũ bị đăng xuất — chấp nhận được |

Các khoảng thời gian ngủ và đánh thức ở trên phụ thuộc chính sách của nhà cung cấp và có thể đổi. **Đo thật trên bản deploy rồi mới ghi vào báo cáo.**

## Bảo mật của bản deploy

| Điểm | Hiện trạng | Nếu muốn chặt hơn / nới ra |
| :-- | :-- | :-- |
| Đăng nhập mẫu | Tắt: `NODE_ENV=production` thì `POST /api/auth/dev-login` trả 404, bất kể `ENABLE_DEV_LOGIN` | Cần demo luồng duyệt: đặt `NODE_ENV=development` và `ENABLE_DEV_LOGIN=true` trên Render. Khi đó **ai có link cũng đăng nhập được** thành tài khoản mẫu, kể cả người xác minh — đổi lại `production` ngay sau buổi demo |
| Đăng ký | Ai cũng tự đăng ký được bằng email bất kỳ; mật khẩu băm bằng bcrypt; chưa giới hạn số lần nhập sai | Thêm giới hạn số lần thử theo IP và xác nhận email |
| Gọi API từ trang khác | Backend không trả header CORS → trình duyệt chặn trang khác đọc kết quả. Gọi thẳng API (curl) vẫn được, như mọi API công khai | — |
| Supabase Data API | Mọi bảng bật Row Level Security, không có policy nào → đường truy cập bằng anon key bị chặn hết | Tắt hẳn Data API trong Project Settings |
| TLS tới database | Mã hoá và **kiểm chứng chỉ** bằng CA của Supabase trong `be/certs`, kiểm cả hostname | — |
| `JWT_SECRET` | Render sinh ngẫu nhiên, không nằm trong repo | — |
| Cổng database | Supabase chỉ nhận kết nối có mật khẩu qua TLS | Bật Network Restrictions, chỉ cho IP của Render |

## Rút lại bản deploy

- Tạm ngừng hẳn: Render → Settings → **Suspend Service**; Vercel → Settings → tắt project.
- Xoá dữ liệu: Supabase → Project Settings → **Pause** hoặc **Delete project**. Xoá project là **không lấy lại được**.
