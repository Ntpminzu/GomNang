# Database Supabase

Backend dùng `DATABASE_URL` trong `be/.env` để kết nối PostgreSQL. Nếu biến này trống,
backend dùng PGlite tại `DATA_DIR` (mặc định `.data/pglite`). Test vẫn dùng PGlite riêng.
Các biến `host`, `port`, `database`, `user` viết thường trong `.env` không được backend đọc;
chỉ cần URL chứa đầy đủ thông tin. `PORT` viết hoa là cổng HTTP của backend.

Kết nối hiện tại dùng Session Pooler cổng 5432, TLS có kiểm tra CA và hostname.
Chứng chỉ công khai ở `be/certs/prod-ca-2021.crt` lấy từ URL mà dashboard Supabase sử dụng:
https://supabase-downloads.s3-ap-southeast-1.amazonaws.com/prod/ssl/prod-ca-2021.crt

Đã chuyển dữ liệu ngày 18/09/2026 (giờ Việt Nam):

| Bảng | Số dòng |
| --- | ---: |
| users | 6 |
| projects | 3 |
| need_items | 8 |
| contributions | 8 |
| assessments | 3 |
| audit_log | 27 |

Đã đối chiếu mọi giá trị, gồm ID, liên kết, password hash, JSON và thời gian
(đưa múi giờ về UTC khi so sánh, giữ nguyên độ chính xác). Sau khi xác minh,
hai thư mục PGlite local đã được xóa để tránh nhầm database đang sử dụng. Bản sao lưu đầy đủ và JSON tại
`be/.data/supabase-transfer-2026-09-17T18-03-06-441Z/`.
Thư mục `.data` và `.env` được Git bỏ qua; bản sao lưu chứa dữ liệu tài khoản, không commit.

`SEED_ON_EMPTY=false` trong `.env` để không tự thêm dữ liệu demo vào cloud.
Hiện vẫn là môi trường development với `ENABLE_DEV_LOGIN=true` theo cấu hình có sẵn.
Khi triển khai backend công khai, dùng `NODE_ENV=production` và `ENABLE_DEV_LOGIN=false`.
Ứng dụng giữ hệ thống đăng nhập/JWT hiện có, bảng `public.users` không phải Supabase Auth.
Sáu bảng đã bật RLS, không có policy cho client: truy cập qua backend có kiểm tra quyền.

Chạy từ thư mục gốc:

```powershell
npm.cmd start -w gomnang-api
npm.cmd run sql -w gomnang-api -- "select name, status from projects"
```

Quy trình chuyển dữ liệu có thể chạy lại khi cần:

```powershell
npm.cmd run db:transfer -w gomnang-api
npm.cmd run db:transfer -w gomnang-api -- --apply
```

Lệnh đầu chỉ kiểm tra kết nối. `--apply` yêu cầu database local không bị tiến trình khác mở,
tạo bản sao lưu, chạy migration, nhập trong transaction và đối chiếu trước COMMIT.
Nếu bảng đích có dữ liệu khác thì dừng và rollback phần nhập; không ghi đè.
Migration schema chạy trước transaction nhập nên bảng mới có thể còn lại nếu nhập thất bại.
Đây là công cụ chuyển một lần, không đồng bộ hai chiều. Không chạy `db:reset` để chuyển database.

Đã kiểm tra: TypeScript, 17/17 test local, API `/health` và `/api/projects` trả 200 với Supabase.
Đăng nhập dev bằng tài khoản đã chuyển thành công; INSERT/RETURNING và rollback trên PostgreSQL
hoạt động, không giữ lại dòng thử nghiệm; trigger chặn UPDATE lịch sử vẫn hoạt động.
