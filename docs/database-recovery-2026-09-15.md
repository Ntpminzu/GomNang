# Khôi phục PGlite ngày 15/09/2026

## Lỗi đã xác nhận

Lỗi `CREATE SCHEMA IF NOT EXISTS "drizzle"` bọc lỗi khởi động PostgreSQL.
Chạy bản sao với `debug: 1` cho thấy:

```text
invalid xl_info in checkpoint record
PANIC: could not locate a valid checkpoint record at 0/177B910
```

Database mới chạy migration và mở lại bình thường. Đã thấy nhiều tiến trình
watch backend; mở trùng hoặc tắt đột ngột là nguyên nhân khả dĩ, chưa chứng minh
được sự kiện cụ thể làm hỏng WAL.

## Dữ liệu và cách khôi phục

- Database gốc từng được giữ tại `be/.data/pglite-corrupt-20260915` trong suốt quá trình phục hồi.
- Trong lúc phục hồi đã tạo bản sao tạm tại `.tmp/pglite-backup-before-lock-fix`.
- Chỉ chạy PostgreSQL 18 `pg_resetwal` trên bản sao `.tmp/pglite-recovery`, sau khi
  `pg_controldata` xác nhận phiên bản và đọc được control file.
- Đã xuất toàn bộ sáu bảng public để đối chiếu trước khi tạo database sạch.
- Tạo database sạch bằng migration, nhập theo thứ tự khóa ngoại trong một
  transaction, không tắt constraint, không nạp dữ liệu demo.
- Đối chiếu từng dòng dưới dạng JSON giữa bản cứu được và database sạch;
  đóng rồi mở lại thành công.

Các bản sao trong `.tmp`, database gốc hỏng và database PGlite sạch chỉ phục vụ
quá trình cứu/chuyển dữ liệu nên đã được xóa sau khi Supabase được xác minh.
Bản backup chuyển đổi thành công vẫn được giữ trong `be/.data/supabase-transfer-*`.

| Bảng | Số dòng khôi phục |
| --- | ---: |
| users | 5 |
| projects | 3 |
| need_items | 8 |
| contributions | 6 |
| assessments | 3 |
| audit_log | 23 |

Không thể chứng minh toàn bộ giao dịch trước sự cố đều còn. Theo
[tài liệu PostgreSQL về pg_resetwal](https://www.postgresql.org/docs/18/app-pgresetwal.html),
WAL hỏng có thể để lại dữ liệu không nhất quán; cần xuất dữ liệu và nhập vào
database sạch. Việc kiểm tra constraint và so sánh dòng đã đạt nhưng không thay
thế đối chiếu nghiệp vụ với dữ liệu người dùng nhớ đã nhập.

## Bản sửa ngăn mở trùng

`openPglite()` dùng `proper-lockfile` để giữ khóa trong suốt vòng đời kết nối.
Backend và SQL CLI dùng chung hàm này. Tiến trình thứ hai bị chặn trước khi
PGlite mở dữ liệu. Đóng kết nối xong mới nhả khóa. Khởi động/migration thất bại
được xử lý để không bỏ quên khóa trong trường hợp thông thường.

## Xác minh

- Backend: 17/17 tests đạt, gồm kiểm tra tiến trình thứ hai bị chặn và mở lại.
- TypeScript backend: đạt.
- Backend khởi động trên dữ liệu khôi phục, `GET /health`: HTTP 200,
  `status=ok`, `db=ok`.
- Chạy SQL CLI khi backend đang mở: bị chặn với thông báo database đang sử dụng.

Chỉ chạy một `npm run dev:be`. Tắt backend bằng Ctrl+C và đợi đóng database
trước khi chạy SQL CLI. Các bản sao chứa dữ liệu tài khoản; giữ chúng ở máy local,
không commit. Không chạy `db:reset` để xử lý lỗi nếu cần giữ dữ liệu.
