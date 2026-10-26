# US-2 — bằng chứng kiểm tra và mẫu human review

Cập nhật: 25/10/2026 (Asia/Saigon). Nhánh `Khanh_Newtech`, sau commit US-8 **bb5e778**. Môi trường: Windows 11, Node.js 22.21.0, Next.js 16.3.5, PGlite demo cục bộ; E2E dùng DB test cô lập.

**Trạng thái:** Tạo, xem, sửa đã có từ trước và vẫn đạt test hồi quy. Lần này bổ sung **xoá** theo Q-03, chốt ngày 25/10/2026 ở [ADR-005](../adr/005-project-soft-delete.md): chỉ người điều phối, chỉ bản nháp, xoá mềm, sổ ghi vết giữ một dòng. Chờ người kiểm điền human review; chưa đổi US-2 sang trạng thái nghiệm thu.

## 1. Kết quả kỹ thuật đã có

| Phép kiểm                  | Kết quả thực tế                                                                                                                                                                            | Giới hạn                                     |
| :------------------------- | :----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :------------------------------------------- |
| `npm.cmd test`             | **142/142 đạt**: 46 domain, 71 backend, 25 frontend                                                                                                                                        | Backend dùng PGlite test                     |
| `npm.cmd run typecheck`    | **Đạt**                                                                                                                                                                                    | Backend và frontend                          |
| `next build`               | **Đạt**                                                                                                                                                                                    | Build ra thư mục tạm; chưa chứng minh deploy |
| `npm.cmd run test:e2e`     | **7/7 đạt**, gồm luồng xoá mới: hộp thoại xác nhận, "Quay lại" giữ nguyên, xoá xong về Việc của tôi, mở lại link thấy "Không tìm thấy"                                                     | DB test cô lập                               |
| Test có bắt được lỗi không | Tạm bỏ điều kiện lọc dự án đã xoá ở `findProject` → test API đỏ. Tạm bỏ điều kiện lọc ở Việc của tôi → test API đỏ ở đúng câu "không còn trong Việc của tôi". Đã khôi phục code            | Kiểm bằng tay một lần                        |
| Chạy thật trên app         | Đăng nhập tài khoản mẫu Khanh, tạo bản nháp thử, bấm "Xoá bản nháp" → xác nhận → về `/me`; backend ghi log `project deleted`; gọi lại `GET /api/projects/{id}` trả 404 `PROJECT_NOT_FOUND` | PGlite demo trên máy dev                     |
| Giao diện                  | [Ảnh hộp thoại xoá ở 375 px](us2/delete-draft-dialog-375.jpg). Chữ đỏ của nút xoá đo được tương phản khoảng 6,5:1 trên nền trắng; nút được focus mặc định là "Quay lại"                    | Đo một lần ở chế độ sáng                     |

### Truy vết tiêu chí US-2

| Tiêu chí                                  | Bằng chứng tự động                                                                                                                                                                                                                                                                                                                                                                                          | Cần xác nhận thủ công |
| :---------------------------------------- | :---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :-------------------- |
| A1 — tạo bản nháp bền vững                | [API test](../../be/tests/integration/api.test.ts) "HỢP LỆ: tạo dự án → 201, là bản nháp, có một dòng sổ ghi vết"; [validation tests](../../packages/domain/src/validate-project.test.ts); E2E tạo dự án                                                                                                                                                                                                    | H1                    |
| A2 — nhu cầu tiền, người giữ tiền         | API test BR-002/BR-003: người giữ tiền chưa xác minh hoặc trùng người điều phối bị từ chối; `coordinatorId` trong body bị bỏ qua                                                                                                                                                                                                                                                                            | H2                    |
| A3 — sửa đúng quyền, lỗi rõ, giữ nội dung | [Domain test](../../packages/domain/src/rules.test.ts) "chỉ người điều phối sửa được, và chỉ khi còn là bản nháp"; API test 422 kèm lỗi từng trường; [mock test](../../fe/tests/mock-api.test.ts) lỗi theo trường                                                                                                                                                                                           | H3, H4                |
| A4 — xoá theo Q-03                        | Domain test `canDeleteProject` mọi trạng thái và vai. API test "Q-03 xoá bản nháp": khách 401, người ngoài 404, người điều phối 204, sau đó GET/PUT/submit/xoá lại đều 404, không còn trong Việc của tôi, dòng dự án còn `deleted_at`, sổ ghi vết có đúng một dòng `deleted`, dự án đã công khai 409 `PROJECT_NOT_DRAFT`. Mock test cùng mã lỗi. [E2E](../../fe/e2e/project-flow.spec.ts) xoá qua giao diện | H5, H6, H7            |

## 2. Thiết kế đã chốt cho xoá

- **Vì sao xoá mềm:** sổ ghi vết chỉ cho ghi thêm và tham chiếu dự án, nên xoá cứng sẽ phải xoá cả lịch sử.
- **Vì sao chỉ bản nháp:** bản nháp chưa từng công khai và chưa nhận đóng góp. Dự án đã công khai dùng "Huỷ dự án" để người góp vẫn xem lại được.
- **Thay đổi dữ liệu:** migration `0012_project_soft_delete` thêm cột `deleted_at` nullable. Dữ liệu cũ không đổi.
- **Tham khảo:** GoFundMe chỉ cho người tổ chức xoá, giữ bản đã xoá ở tab riêng, và khuyến nghị tắt nhận tiền thay vì xoá ([GoFundMe Help](https://support.gofundme.com/hc/en-us/articles/203604074-How-Do-I-Delete-My-Fundraiser-)).

## 3. Human review

**Người kiểm BE:** [Tên]  
**Người kiểm FE:** [Khanh]  
**Ngày/giờ:** [26/10/2026, vietnam]  
**Môi trường:** [frontend `http://localhost:3000`, backend `http://localhost:4000`, PGlite demo / DB khác]  
**Commit hoặc working tree:** [f7ac5b6]  
**Dữ liệu thử:** [người kiểm thử; không ghi mật khẩu/token/secret]

Chuẩn bị: chạy backend `npm.cmd run dev:be` và frontend `npm.cmd run dev:fe`. Ở `/login`, mục "Dùng tài khoản mẫu" đăng nhập nhanh Khanh (điều phối dự án Hoa Mai) hoặc Hùng (người ngoài). Backend phải khởi động lại sau khi lấy code mới để chạy migration 0012.

Điền **kết quả thực tế** và **Pass / Fail / Chưa kiểm** sau khi tự thao tác.

| Ca                                         | Thao tác và kết quả mong đợi                                                                                                                                                                                                                                                        | Kết quả thực tế | Trạng thái | Ghi chú                                                                                        |
| :----------------------------------------- | :---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :-------------- | :--------- | :--------------------------------------------------------------------------------------------- |
| H1 — Tạo bản nháp                          | Khanh → "Tạo dự án" → điền đủ trường, ít nhất một nhu cầu → "Tạo bản nháp dự án" → trang dự án hiện "Bản nháp — chưa công khai". Tải lại trang, dữ liệu còn nguyên                                                                                                                  | [Điền]          | Chưa kiểm  | [Pass]                                                                                         |
| H2 — Nhu cầu tiền                          | Thêm nhu cầu loại tiền. Để trống "Người phụ trách tài chính", hoặc chọn chính mình → lỗi hiện dưới trường đó, không tạo được. Danh sách chọn chỉ có thành viên đã xác minh danh tính                                                                                                | [Điền]          | Chưa kiểm  | [Pass]                                                                                         |
| H3 — Sửa bản nháp                          | "Sửa dự án" → đổi tên → lưu → trang dự án hiện tên mới. Sau khi "Gửi xác minh", không còn nút sửa                                                                                                                                                                                   | [Điền]          | Chưa kiểm  | [Pass]                                                                                         |
| H4 — Lỗi nhập giữ nội dung                 | Ở form, để trống tên hoặc nhập số lượng 0 → bấm lưu → lỗi hiện dưới đúng trường, các ô khác vẫn giữ chữ đã nhập                                                                                                                                                                     | [Điền]          | Chưa kiểm  | [Pass]                                                                                         |
| H5 — Xoá bản nháp                          | Mở bản nháp của Khanh → "Xoá bản nháp" → hộp thoại "Xoá bản nháp này?" hiện tên dự án. Bấm "Quay lại" thì không có gì thay đổi. Mở lại, bấm "Xoá bản nháp" → về "Việc của tôi", có thông báo "Đã xoá bản nháp.", dự án không còn trong danh sách. Mở lại link cũ → "Không tìm thấy" | [Điền]          | Chưa kiểm  | Ghi lại link trước khi xoá http://localhost:3000/projects/8fce595a-2454-4e83-8c31-0885283aee34 |
| H6 — Không xoá dự án đã gửi hoặc công khai | Bản nháp đã "Gửi xác minh" và dự án Hoa Mai đang kêu gọi: không có nút "Xoá bản nháp"; Hoa Mai chỉ có "Huỷ dự án"                                                                                                                                                                   | [Điền]          | Chưa kiểm  | [Pass]                                                                                         |
| H7 — Người khác không xoá được             | Hùng mở link một bản nháp của Khanh → "Không tìm thấy"; không thấy nút xoá                                                                                                                                                                                                          | [Điền]          | Chưa kiểm  | [Pass]                                                                                         |
| H8 — Đọc source                            | Giải thích: nút FE → `DELETE /api/projects/:id` → khoá dòng dự án → `canDeleteProject` → đặt `deleted_at` + ghi sổ trong một transaction → mọi đường đọc qua `findProject` nên trả 404                                                                                              | [Điền]          | Chưa kiểm  | BE và FE mỗi người tự giải thích                                                               |

**Lỗi phát hiện / cách xử lý:** [Không phát hiện trong các ca đã kiểm]  
**Ca chưa kiểm và lý do:** [Không phát hiện trong các ca đã kiểm]  
**Kết luận US-2:** [Đạt]  
**Xác nhận BE:** [Tên, ngày, phần đã tự đọc/giải thích]  
**Xác nhận FE:** [Khanh, 26/10/2026, phần đã tự đọc/giải thích]

Sau khi điền, ghi tóm tắt bằng một entry mới trong [AI_USAGE.md](../../AI_USAGE.md), không sửa entry cũ. Chỉ đổi trạng thái US-2 trong [traceability.md](../traceability.md) và [backlog.md](../backlog.md) khi các ca bắt buộc đều đạt.

## 4. Giới hạn hiện tại

- **Không có khôi phục trong ứng dụng.** Muốn khôi phục phải sửa `deleted_at` trực tiếp trong DB.
- **Admin chưa gỡ được dự án vi phạm đã công khai.** Đây là quyết định phạm vi của Q-03, ghi ở ADR-005.
- **Truy vấn mới** lấy dự án theo người dùng mà không qua `findProject` phải tự lọc `deleted_at IS NULL`.
- **Bản chạy thử trong trình duyệt** (mock) bỏ hẳn dự án khỏi kho dữ liệu giả thay vì xoá mềm; mã lỗi vẫn giống backend.
- **Migration 0012 chưa chạy trên Supabase.** Sẽ tự chạy khi backend production khởi động bản mới, sau khi nhóm cho phép merge vào main.
- **Chưa có human review**, tên và ngày xác nhận.
