# US-1 — chạy local và trạng thái Supabase

Cập nhật 25/10/2026. US-1 dùng Google cho user thường, tài khoản admin/verifier riêng và đổi mật khẩu tự nguyện. [Bằng chứng cập nhật Supabase](evidence/us1-verification.md).

## 1. Tài khoản và mật khẩu

| Role | Cách tạo | Đăng nhập |
| :-- | :-- | :-- |
| user | Đăng ký hoặc Google | Mật khẩu hoặc Google sau liên kết có xác nhận |
| admin | Backend tạo tài khoản riêng | Chỉ mật khẩu |
| verifier | Admin tạo tại /admin/verifiers | Mật khẩu admin cấp; dùng ngay, có thể tự đổi khi muốn |

`identityVerified` tách biệt role và Google email_verified. Vai điều phối/tài chính/đóng góp vẫn thuộc từng dự án. Admin không tự có quyền duyệt; verifier không duyệt dự án mình điều phối/giữ tài chính. Role không tự xác minh danh tính hoặc làm tài khoản đủ điều kiện giữ tiền.

Không có cột `must_change_password`, phiên hạn chế hoặc yêu cầu đổi mật khẩu lần đầu. Verifier có thể chọn **Đổi mật khẩu** trong menu tài khoản, nhập mật khẩu hiện tại/mật khẩu mới/xác nhận. Đổi thành công thu hồi mọi phiên cũ và cấp phiên mới 8 giờ. Admin không có API reset/đổi mật khẩu người khác trong phạm vi này.

Google trùng email user thường cần mật khẩu cũ trước khi liên kết; tài khoản chưa có mật khẩu bị chặn. Admin/verifier không dùng Google hay dev-login.

## 2. Chuẩn bị DB test và admin local

Chạy từ root. Script dùng `be/.data/us1-test`, không lấy DATABASE_URL từ be/.env.

```powershell
npm.cmd run db:prepare:us1 -w gomnang-api
```

Lệnh này chạy migration và nạp mẫu khi DB test trống, không reset. Tắt backend test trước bootstrap vì PGlite chỉ mở được bởi một tiến trình:

```powershell
$env:BOOTSTRAP_ADMIN_EMAIL = 'admin@gomnang.test'
$env:BOOTSTRAP_ADMIN_NAME = 'Quản trị GomNang'
$adminSecret = Read-Host 'Mật khẩu admin' -AsSecureString
$env:BOOTSTRAP_ADMIN_PASSWORD = [System.Net.NetworkCredential]::new('', $adminSecret).Password

# Xem trước; không insert/migrate/seed.
npm.cmd run auth:bootstrap-admin -w gomnang-api
# Tạo tài khoản mới.
npm.cmd run auth:bootstrap-admin -w gomnang-api -- --apply
Remove-Item Env:\BOOTSTRAP_ADMIN_PASSWORD
```

Email đã tồn tại, kể cả khác chữ hoa/thường, bị từ chối; không nâng quyền/đổi mật khẩu tài khoản cũ. Có thể đặt US1_TEST_DATA_DIR giống nhau cho prepare/bootstrap/dev để chọn thư mục test khác.

Hai terminal ở root:

```powershell
npm.cmd run dev:us1
npm.cmd run dev:fe
```

Mở http://localhost:3000/login. Admin vào /admin/verifiers, nhập tên/email/mật khẩu/xác nhận và cấp thông tin riêng cho verifier. Verifier đăng nhập → /verify ngay; đổi mật khẩu khi muốn ở menu tài khoản.

Mật khẩu tối thiểu 8 ký tự, tối đa 72 byte UTF-8; không tự trim mật khẩu. Mất phản hồi khi tạo tài khoản hoặc đổi mật khẩu có thể là thao tác đã lưu: không retry tự động. Có thể đăng nhập lại bằng mật khẩu mới để kiểm tra.

## 3. Supabase đã cập nhật

Ngày 25/10/2026 đã áp migration0010 và0011 lên Supabase được cấu hình, không reset/seed/transfer dữ liệu:

- users có role và identity_verified; không còn verified/is_verifier/must_change_password.
- auth_sessions giữ sid/method/expiry/revoked, không có purpose.
- oauth_identities lưu provider+subject; hai bảng auth bật RLS và không có browser policy.
- Tại thời điểm migration, giữ nguyên 7 user, 28 dự án và toàn bộ dữ liệu nghiệp vụ đối chiếu. Role cũ ánh xạ thành 4 user, 3 verifier; migration không tự tạo admin hoặc cấp mật khẩu cho tài khoản cũ. Sau đó chủ dự án đã yêu cầu tạo riêng 1 admin trên Supabase; hiện có 8 tài khoản.

`dev:us1` vẫn dùng DB test riêng. Muốn backend đọc Supabase, dùng `dev:be` với DATABASE_URL đúng trong be/.env. Khuyến nghị SEED_ON_EMPTY=false khi dùng DB có dữ liệu.

Runner triển khai US1 và lệnh npm cũ đã được retire: chúng chỉ hỗ trợ journal/baseline 0009–0011, không chạy được trên checkout hiện tại có migration 0013. Không có lệnh thay thế bootstrap DB PostgreSQL mới trong đợt dọn này. Runner chat-log chỉ triển khai bước 0013 từ baseline 0012; không dùng nó thay runner US1. PostgreSQL startup chỉ kiểm journal/hash; DB thiếu migration cần kế hoạch triển khai riêng.

Lịch sử US1: khi apply trên baseline0009, runner đã lưu backup custom public+drizzle, kiểm archive, khóa bảng ngăn ghi, áp0010+0011 và so digest/count trước commit. Giữ SQL/snapshots/journal và [evidence gốc](evidence/us1-verification.md); không dùng db:transfer --apply cho thay đổi schema này.

Theo yêu cầu người dùng, lần apply trực tiếp không dùng Docker và không thực hiện khôi phục thử. Archive đã được pg_restore --list kiểm tra, không khẳng định restore đã chạy. Backup không phải toàn bộ Supabase Auth/Storage.

## 4. Google thật

Chỉ điền trong be/.env; không commit hoặc gửi secret vào chat:

```dotenv
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
FRONTEND_ORIGIN=http://localhost:3000
```

Trong Google Cloud, OAuth client web dùng callback chính xác:
`http://localhost:3000/api/auth/google/callback`.

Dùng nhất quán localhost khi thử thủ công. Thiếu cấu hình một phần làm backend từ chối khởi động; cả hai credential rỗng thì Google tắt. Khởi động lại backend sau khi điền.

Kiểm Google user mới, đăng nhập lại cùng ID, liên kết email trùng bằng mật khẩu cũ, hủy/provider lỗi và logout. Provider giả trong E2E không thay các bước thật.

## 5. Phiên và lỗi

- Bearer JWT HS256, issuer gomnang-api, sid; backend đọc phiên/role từ DB, phiên8giờ, không refresh.
- JWT cũ thiếu sid bị401. Token limited cũ bị thu hồi; purpose=password_change/giá trị lạ bị401 dù cột purpose đã bỏ. JWT cũ purpose=full vẫn dùng được nếu sid hợp lệ.
- Logout thu hồi phiên hiện tại; không hoàn tác request đã được xác thực trước đó.
- Sai mật khẩu hiện tại:422 CURRENT_PASSWORD_INVALID, giữ phiên để nhập lại. Mật khẩu mới trùng:422 PASSWORD_REUSED. Schema sai:400. User/admin gọi đổi mật khẩu verifier:403.
- Token/phiên sai/hết hạn/revoked:401 → xóa phiên FE. DB/hạ tầng lỗi:5xx → giữ phiên.
- OAuth flow một lần, cookie HttpOnly/state/PKCE/nonce, TTL5phút trong một backend process; restart yêu cầu bắt đầu lại. JWT không nằm trên URL, log không chứa query OAuth/password/hash.
- SQL migration lịch sử0010 giữ nguyên.0011 thu hồi phiên hạn chế trước khi bỏ cột/type. DB test cũ lên cấp qua migration, không cần xóa dữ liệu.

## 6. Kiểm tra

```powershell
npm.cmd test
npm.cmd run typecheck
npm.cmd run build
npm.cmd run test:e2e
```

E2E dùng backend test riêng, không load be/.env, DATABASE_URL rỗng và DATA_DIR tạm. Mock chỉ là mô phỏng; phân quyền và đổi mật khẩu được kiểm qua HTTP/DB test. Google thật và đăng nhập tài khoản Supabase cần bằng chứng riêng.
