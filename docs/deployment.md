# Deploy — GOM NẮNG

Ba phần, ba nơi. Làm **đúng thứ tự** dưới đây, vì phần sau cần địa chỉ của phần trước.

```mermaid
flowchart LR
    U["Trình duyệt"] -->|"HTTPS"| V["Vercel<br/>frontend"]
    U -->|"HTTPS, JSON, Bearer token"| R["Render<br/>backend trong Docker<br/>Singapore"]
    R -->|"TLS, Session pooler"| S[("Supabase<br/>PostgreSQL 17<br/>Singapore")]
    G["GitHub<br/>Ntpminzu/GomNang"] -->|"push nhánh main"| V
    G -->|"push nhánh main"| R
```

| Phần | Nơi chạy | Gói | Ai làm |
| :-- | :-- | :-- | :-- |
| Database | Supabase, project **GomNang** | Free | **Đã tạo** — ref `fgabywgcwlqnzbvngiet`, vùng `ap-southeast-1` |
| Backend | Render, Docker, theo [`render.yaml`](../render.yaml) | Free | Nhóm tự đăng nhập và tạo |
| Frontend | Vercel | Hobby | Nhóm tự đăng nhập và tạo |

> **Không bao giờ** dán `DATABASE_URL` hay mật khẩu database vào chat, issue, commit hay file trong repo. Chỉ nhập trên dashboard của Render.

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

**Không cần tạo bảng.** Backend tự chạy migration mỗi lần khởi động, và tự nạp dữ liệu mẫu khi database còn trống.

## Bước 2 — Deploy backend lên Render

1. Đăng nhập https://dashboard.render.com bằng tài khoản GitHub **Ntpminzu**.
2. **New → Blueprint** → chọn repo `Ntpminzu/GomNang`. Repo private nên Render sẽ xin quyền đọc repo — cấp quyền cho riêng repo này là đủ.
3. Render đọc [`render.yaml`](../render.yaml) và hỏi hai biến:

   | Biến | Điền |
   | :-- | :-- |
   | `DATABASE_URL` | Chuỗi đã chuẩn bị ở Bước 1 |
   | `CORS_ORIGINS` | Tạm điền `http://localhost:3000` — sẽ sửa ở Bước 4 |

   Các biến còn lại đã có sẵn trong blueprint. `JWT_SECRET` do Render tự sinh ngẫu nhiên.
4. Bấm **Apply**. Lần build đầu mất vài phút.
5. Mở tab **Logs** của service `gomnang-api`. Deploy đúng thì có đủ ba dòng sau:
   ```
   {"level":"warn","msg":"postgres TLS certificate is not verified; set DATABASE_CA_CERT to verify it"}
   {"level":"warn","msg":"demo login is enabled in production: anyone can sign in as a demo account",...}
   {"level":"info","msg":"api started",...,"database":"postgres (tls unverified)",...}
   ```
   Lần khởi động đầu có thêm dòng `database was empty, demo data loaded`.
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
   | Root Directory | `frontend` |
   | Framework Preset | Next.js (Vercel tự nhận) |
   | Environment Variable `NEXT_PUBLIC_API_URL` | Địa chỉ Render ở Bước 2, **không** có dấu `/` ở cuối |

   Để nguyên lệnh build và lệnh cài đặt mặc định. Vercel tự nhận ra repo là npm workspaces.
4. Bấm **Deploy**. Xong thì chép địa chỉ production, dạng `https://gom-nang.vercel.app`.

## Bước 4 — Cho phép web gọi API

1. Quay lại Render → service `gomnang-api` → **Environment**.
2. Sửa `CORS_ORIGINS` thành đúng địa chỉ Vercel ở Bước 3, không có dấu `/` ở cuối.
   Muốn giữ cả bản chạy local thì ngăn cách bằng dấu phẩy: `https://gom-nang.vercel.app,http://localhost:3000`
3. **Save Changes** — Render tự deploy lại.

## Bước 5 — Kiểm tra đầu cuối

1. Mở địa chỉ Vercel. Danh sách dự án hiện ra — nghĩa là web gọi được API và API đọc được Supabase.
2. Vào **Đăng nhập** → **Dùng tài khoản mẫu** (hoặc tự **Đăng ký** một tài khoản), chạy thử luồng: tạo dự án → gửi xác minh → đổi sang người xác minh để duyệt → cam kết đóng góp.
3. Ghi địa chỉ web và địa chỉ API vào [`week-04.md`](week-04.md), mục Homework 4B.

---

## Bẫy thường gặp

| Hiện tượng | Nguyên nhân | Cách sửa |
| :-- | :-- | :-- |
| API vẫn chạy, `/health` báo ok, nhưng dự án tạo ra biến mất sau mỗi lần deploy; tab **Environment** không có `DATABASE_URL`, `CORS_ORIGINS` | Hai biến này khai `sync: false` trong `render.yaml`: Render chỉ hỏi **một lần** lúc tạo Blueprint, bỏ trống thì không tạo, các lần sync sau cũng không thêm. Thiếu `DATABASE_URL` thì backend lặng lẽ dùng PGlite trong container — mất khi container khởi động lại | **Environment → Edit → + Add Environment Variable**, thêm đủ hai biến, rồi **Save, rebuild, and deploy**. Log đúng phải có `"database":"postgres (tls unverified)"` |
| Mở link Vercel thì bị chuyển sang trang đăng nhập Vercel; hoặc web báo "Không kết nối được máy chủ", Console có lỗi CORS | Đang dùng link có mã deploy, dạng `gom-nang-frontend-o9f5s0h69-….vercel.app`: link này bị Deployment Protection chặn với người ngoài team và đổi sau mỗi lần deploy | Dùng **tên miền production** — Vercel → project → **Domains**, ví dụ `https://gom-nang-frontend.vercel.app`. `CORS_ORIGINS` trên Render cũng phải là tên miền này |
| Lỡ để lộ giá trị `JWT_SECRET` (chụp màn hình, dán vào chat) | Ai có secret là tự ký được token của bất kỳ tài khoản nào, kể cả người xác minh | Đặt giá trị mới trên Render rồi deploy lại. Mọi phiên đăng nhập cũ bị đăng xuất — chấp nhận được |
| Web báo "Không kết nối được máy chủ" ngay lần mở đầu | Gói miễn phí của Render cho service ngủ khi lâu không có request; lần đánh thức mất khá lâu | Đợi rồi bấm "Thử lại". **Trước buổi demo mở link trước vài phút** |
| Web vẫn báo không kết nối được dù API đã sống | `CORS_ORIGINS` không khớp **chính xác** địa chỉ web — thừa dấu `/`, sai `https`, hoặc đang mở link preview của Vercel | DevTools → Console sẽ có lỗi CORS. Sửa `CORS_ORIGINS` ở Bước 4 |
| Đổi `NEXT_PUBLIC_API_URL` trên Vercel mà web vẫn gọi địa chỉ cũ | Biến này được chép vào code **lúc build** | Vercel → Deployments → **Redeploy** |
| Render deploy xong rồi chết, log có `database connection failed` | Dùng nhầm chuỗi *Direct connection*: máy chủ Supabase gói miễn phí chỉ nhận IPv6 ở đường này, còn Render gọi ra bằng IPv4 | Dùng chuỗi **Session pooler** ở Bước 1 |
| Log có `password authentication failed` | Sai mật khẩu, hoặc mật khẩu có ký tự đặc biệt chưa mã hoá URL | Reset mật khẩu thành chỉ chữ và số, sửa lại `DATABASE_URL` |
| API báo lỗi database sau khi nhóm lâu không dùng | Supabase gói miễn phí tạm dừng project khi lâu không có hoạt động | Dashboard Supabase → **Restore project** |
| Link preview của Vercel (mỗi nhánh một link) không gọi được API | Chỉ địa chỉ production có trong `CORS_ORIGINS` | Chấp nhận, hoặc thêm địa chỉ đó vào `CORS_ORIGINS` |

Các khoảng thời gian ngủ và đánh thức ở trên phụ thuộc chính sách của nhà cung cấp và có thể đổi. **Đo thật trên bản deploy rồi mới ghi vào báo cáo.**

## Bảo mật của bản deploy

| Điểm | Hiện trạng | Nếu muốn chặt hơn |
| :-- | :-- | :-- |
| Đăng nhập | Ai có link cũng đăng nhập được thành 5 tài khoản mẫu (`ALLOW_DEMO_LOGIN_IN_PRODUCTION=true`) — chấp nhận vì toàn dữ liệu giả. Ai cũng tự đăng ký được bằng email bất kỳ; mật khẩu băm bằng scrypt, chưa giới hạn số lần nhập sai | Đặt biến thành `false` sau buổi demo. Thêm giới hạn số lần thử theo IP và xác nhận email |
| Supabase Data API | Mọi bảng bật Row Level Security, không có policy nào → đường truy cập bằng anon key bị chặn hết | Tắt hẳn Data API trong Project Settings |
| TLS tới database | Có mã hoá, **chưa kiểm chứng chứng chỉ** — server ghi cảnh báo mỗi lần khởi động | Tải CA certificate trong Project Settings → Database, dán nội dung vào biến `DATABASE_CA_CERT` trên Render |
| `JWT_SECRET` | Render sinh ngẫu nhiên, không nằm trong repo | — |
| Cổng database | Supabase chỉ nhận kết nối có mật khẩu qua TLS | Bật Network Restrictions, chỉ cho IP của Render |

## Rút lại bản deploy

- Tắt đăng nhập mẫu: Render → Environment → `ALLOW_DEMO_LOGIN_IN_PRODUCTION=false`.
- Tạm ngừng hẳn: Render → Settings → **Suspend Service**; Vercel → Settings → tắt project.
- Xoá dữ liệu: Supabase → Project Settings → **Pause** hoặc **Delete project**. Xoá project là **không lấy lại được**.
