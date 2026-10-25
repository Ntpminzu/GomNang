# US-1 — bằng chứng kiểm tra và mẫu human review

Cập nhật: 25/10/2026 (Asia/Saigon). Source: working tree trên base commit **dd15850**; thay đổi US-1 chưa commit. Môi trường kiểm: Windows/PowerShell, Node.js 22.21.0, Next.js 16.3.5; PGlite test cô lập và Supabase cho các phép kiểm được ghi rõ dưới đây.

**Trạng thái:** Đã triển khai code và cập nhật schema Supabase. Người dùng đã ghi kết quả kiểm thủ công một phần, gồm Google đăng nhập với role user; chưa đủ bằng chứng và chữ ký để xác nhận hoàn thành toàn bộ US-1.

## 1. Kết quả kỹ thuật đã có

| Phép kiểm                               | Kết quả thực tế                                                  | Giới hạn                                                       |
| :-------------------------------------- | :--------------------------------------------------------------- | :------------------------------------------------------------- |
| `npm.cmd test`                          | **130/130 đạt**: 42 domain, 65 backend, 23 frontend              | Backend dùng PGlite test và mock provider/adapter theo từng ca |
| `npm.cmd run typecheck`                 | **Đạt**                                                          | Backend và frontend                                            |
| `npm.cmd run build`                     | **Đạt**                                                          | Next.js build; chưa chứng minh deploy                          |
| `npm.cmd run test:e2e`                  | **5/5 đạt**                                                      | Chromium, backend/DB test cô lập, Google provider giả          |
| CLI chuẩn bị DB test và bootstrap admin | Preview không ghi; apply tạo admin; apply lại trả `EMAIL_EXISTS` | DB test riêng, không phải Supabase                             |
| Local HTTP smoke                        | Health/admin login/admin API/logout và token thu hồi đạt         | DB test riêng                                                  |
| Giao diện admin trên mobile             | Đã kiểm ảnh 375 × 812, không tràn ngang                          | Kiểm render, chưa thay human review                            |

Lượt kiểm ban đầu trước thay đổi mật khẩu tùy chọn có 129 tests (42 domain, 64 backend, 23 frontend), typecheck/build và 5/5 E2E đạt. Bảng trên là kết quả **mới hơn**, sau migration 0011 và bỏ đổi mật khẩu bắt buộc. Không dùng kết quả ban đầu để khẳng định hành vi hiện tại.

### Truy vết tiêu chí US-1

| Tiêu chí                                       | Bằng chứng tự động                                                                                                                                                            | Cần xác nhận thủ công                                           |
| :--------------------------------------------- | :---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :-------------------------------------------------------------- |
| A1 — Google, phiên, logout                     | [Auth API](../../be/tests/integration/auth.test.ts), [browser auth](../../fe/e2e/auth-flow.spec.ts): Google giả, JWT/SID, liên kết email, logout, expiry                      | Google thật bằng user thường, callback, duy trì phiên và logout |
| A2 — role và quyền                             | Auth/domain/API tests: role injection, admin-only, password-only cho admin/verifier, quyền theo dự án                                                                         | Admin và verifier đăng nhập thật; sai quyền qua URL/API         |
| A3 — dữ liệu riêng và lỗi phiên                | [FE session tests](../../fe/tests/auth-session.test.ts): 401/5xx, race khi logout; API tests kiểm dữ liệu riêng                                                               | Tải lại trang, logout rồi mở URL riêng                          |
| A4 — cấu hình và secret                        | Dev-login bị tắt ở production; response auth no-store; log không ghi OAuth query/SQL nhạy cảm                                                                                 | Kiểm cấu hình local và không đưa secret vào bằng chứng          |
| A5 — admin cấp verifier, đổi mật khẩu tùy chọn | Admin UI/E2E và auth tests: tạo verifier, dùng ngay, đổi tự nguyện, thu hồi phiên cũ; [migration test](../../be/tests/integration/auth-migration.test.ts) kiểm bỏ cột/type cũ | Admin tạo verifier thật; verifier đăng nhập và tự đổi mật khẩu  |

## 2. Supabase và dữ liệu

Đã áp `be/scripts/deploy-us1-schema.ts --apply` trực tiếp, commit migrations **0010–0011**; journal có 12 migrations. Trước commit đã đối chiếu count/digest đầy đủ: **7 users, 28 projects, 83 need_items, 9 contributions, 25 assessments, 108 audit_log, 26 chat_chunks**, expenses/project_updates đều 0. Người dùng cũ giữ ID, password hash và các dữ liệu nghiệp vụ; trường `verified` chuyển sang `identity_verified`, `is_verifier` sang `role`. Không chạy reset hoặc seed.

Sau migration: 4 user, 3 verifier, 0 admin. Sau đó, theo yêu cầu của chủ dự án, đã tạo riêng 1 admin. Lần kiểm sau cùng có **8 tài khoản: 4 user, 3 verifier, 1 admin**; role admin và password hash được xác nhận trên DB. Không ghi mật khẩu vào tài liệu.

Schema hiện không có `must_change_password`, `auth_sessions.purpose` hoặc `session_purpose`. Verifier dùng ngay mật khẩu admin cấp; đổi mật khẩu là tùy chọn. Đổi thành công thu hồi phiên cũ và cấp phiên mới 8 giờ. Cả 11 bảng ứng dụng bật RLS; bảng auth riêng không có public policy.

Backup trước migration: `be/.data/supabase-us1-2026-10-25T11-41-55-543Z/application.dump` (187326 bytes), cùng manifest/result trong thư mục gitignore. Archive đã được kiểm bằng `pg_restore --list`; **chưa thử restore**. Backup chỉ gồm schema/dữ liệu ứng dụng, không gồm toàn bộ nền tảng Supabase.

HTTP smoke qua ứng dụng kết nối Supabase: `/health` và `/api/projects` trả 200; `/api/auth/me` và `/api/admin/verifiers` trả 401 khi chưa đăng nhập. Chưa kiểm đăng nhập admin/verifier qua HTTP trên Supabase bằng công cụ tự động.

## 3. Human review — người phụ trách điền

**Người kiểm BE:** [Tên]  
**Người kiểm FE:** [Tên]  
**Ngày/giờ:** [dd/mm/yyyy, múi giờ]  
**Môi trường:** [localhost frontend URL, backend URL, DB test/Supabase]  
**Commit hoặc working tree:** [mã commit / chưa commit]  
**Dữ liệu thử:** [vai trò hoặc email đã che, không ghi mật khẩu/token/secret]

Điền **kết quả thực tế** và **Pass / Fail / Chưa kiểm** sau khi tự thao tác. Ghi mã lỗi hoặc ảnh minh họa đã che thông tin nếu có. Nếu dùng DB khác Supabase, nêu rõ ở cột ghi chú.

| Ca                                   | Thao tác và kết quả mong đợi                                                              | Kết quả thực tế                                   | Trạng thái   | Ghi chú                                                          |
| :----------------------------------- | :---------------------------------------------------------------------------------------- | :------------------------------------------------ | :----------- | :--------------------------------------------------------------- |
| H1 — Google user mới                 | Gmail chưa có tài khoản → đăng nhập → role user; tải lại còn phiên                        | Đã đăng nhập thành công , role : user             | Đã kiểm      | [Điền]                                                           |
| H2 — Google email trùng user cũ      | Tài khoản user có mật khẩu → xác nhận mật khẩu cũ trước khi liên kết; thử sai mật khẩu    | Nếu trùng sẽ bắt đăng nhập bằng email và mật khẩu | Đã kiểm      | không có                                                         |
| H3 — Google với admin/verifier       | Chọn email nhân sự → bị từ chối `PASSWORD_LOGIN_REQUIRED`                                 | [Điền]                                            | Chưa kiểm    | Đã có ảnh lỗi trong hội thoại; người kiểm tự xác nhận và ghi lại |
| H4 — Admin cấp verifier              | Admin đăng nhập bằng mật khẩu → `/admin/verifiers` → tạo tài khoản thử                    | Đã tạo thành công                                 | Đã kiểm      | ko có                                                            |
| H5 — Verifier và phân quyền          | Verifier đăng nhập bằng mật khẩu cấp → vào `/verify` ngay; không vào `/admin/verifiers`   | Đã đăng nhập thành công                           | Đã kiểm      | không                                                            |
| H6 — Đổi mật khẩu tự nguyện          | Sai mật khẩu hiện tại bị báo lỗi; đổi đúng; mật khẩu mới đăng nhập được, cũ bị từ chối    | Báo đúng lỗi                                      | Đã kiểm kiểm | [Điền]                                                           |
| H7 — Logout/phiên                    | Đăng xuất rồi mở lại URL riêng → yêu cầu đăng nhập; tải lại khi còn phiên → vẫn đăng nhập | Thành công                                        | Đã kiểm      | [Điền]                                                           |
| H8 — Quyền dự án và identityVerified | Thử URL/API ngoài quyền; kiểm role không tự làm tài khoản đủ điều kiện tài chính          | Báo ko có quyền đúng mong đợi                     | Đã kiểm      | [Điền]                                                           |

**Rà soát phần đã điền:** H1 đã ghi nhận đăng nhập Google với role user, còn thiếu kết quả tải lại trang. H2 mới nêu nhận định “nếu trùng”, chưa ghi thao tác xác nhận mật khẩu cũ, thử sai mật khẩu và kết quả liên kết của **user thường**; luồng này khác lỗi đăng nhập Google của tài khoản nhân sự. H3 còn trống. H4 ghi nhận tạo verifier thành công. H5 chỉ ghi nhận đăng nhập, chưa ghi kết quả vào `/verify` và từ chối `/admin/verifiers`. H6 chỉ ghi nhận thông báo lỗi, chưa ghi đổi thành công và kiểm mật khẩu cũ/mới. H7 ghi “thành công” nhưng chưa chỉ rõ kết quả tải lại và mở URL riêng sau logout. H8 ghi từ chối quyền, chưa ghi kiểm `identityVerified`. Các trạng thái “Đã kiểm” trong bảng phản ánh lời ghi của người kiểm, **chưa đồng nghĩa toàn bộ kết quả mong đợi của hàng đó đã có bằng chứng**.

**Lỗi phát hiện / cách xử lý:** [Điền; nếu không có, ghi “Không phát hiện trong các ca đã kiểm”]  
**Ca chưa kiểm và lý do:** [Điền]  
**Kết luận US-1:** [Đạt / Chưa đạt / Chờ kiểm bổ sung]  
**Xác nhận BE:** [Tên, ngày, phần đã tự đọc/giải thích]  
**Xác nhận FE:** [Tên, ngày, phần đã tự đọc/giải thích]

Sau khi điền, tóm tắt kết quả và dẫn link file này ở mục **Verification** của Authentication Module trong [AI_USAGE.md](../../AI_USAGE.md). Ghi người/ngày xác nhận ở mục **Human review**. Chỉ đổi trạng thái US-1 trong [traceability.md](../traceability.md) và [backlog.md](../backlog.md) khi các tiêu chí bắt buộc đều đạt.

## 4. Giới hạn hiện tại

Người dùng đã ghi nhận Google thật đăng nhập với role user, nhưng chưa ghi kết quả tải lại hoặc liên kết email trùng user cũ; E2E vẫn dùng Google giả. Trước đây màn Google báo `redirect_uri_mismatch`; sau khi cấu hình callback, người dùng thấy `PASSWORD_LOGIN_REQUIRED` với email nhân sự, đúng chính sách nhưng H3 chưa được điền trong bảng human review. Chưa có tên/ngày và xác nhận đọc source của An/Khanh, restore thử, deploy hosting/container hoặc test nhiều replica. Các fixture vector/adapter mock không chứng minh chất lượng AI.

Graphify đã cập nhật sau thay đổi code: lần gần nhất 1597 nodes, 5604 edges. Công cụ thiếu `tree_sitter_sql`, nên SQL được đọc và kiểm bằng migration test trực tiếp.
