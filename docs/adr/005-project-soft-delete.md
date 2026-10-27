# ADR-005 — Soft Delete for Draft Projects

**Xoá dự án: chỉ bản nháp, xoá mềm**

- Ngày lập bản ghi: 25/10/2026.
- Trạng thái: **Implemented** — đối chiếu với source; human review US-2 đạt các ca thao tác.
- Owner: Khanh (US-2). Phạm vi: `DELETE /api/projects/:id`, quyết định Q-03.

## 1. Bối cảnh

US-2 cần xoá dữ liệu chính. Bảng `audit_log` chỉ cho ghi thêm: trigger PostgreSQL chặn UPDATE, DELETE, TRUNCATE, và mỗi dòng tham chiếu `projects.id` không cascade. Xoá cứng dự án đã có sổ ghi vết sẽ phá cam kết "lịch sử không sửa được". Dự án đã công khai có thể đã nhận đóng góp, nên người góp cần thấy lại.

## 2. Các phương án

| Phương án | Ưu điểm | Hạn chế |
| :-- | :-- | :-- |
| **Xoá mềm bản nháp** | Giữ sổ ghi vết nguyên vẹn; thay đổi nhỏ: một cột, hai điều kiện lọc | Dữ liệu vẫn nằm trong DB; truy vấn mới phải nhớ lọc |
| Xoá cứng bản nháp | Dữ liệu biến mất thật | Phải xoá cả sổ ghi vết, trái trigger chỉ ghi thêm |
| Cho xoá cả dự án đã công khai | Linh hoạt cho người điều phối | Người góp mất dấu khoản đã góp; trùng vai với Huỷ dự án |
| Thêm trạng thái `deleted` vào enum | Dùng lại kiểm tra theo trạng thái | Phải sửa mọi bảng nhãn và luồng trạng thái ở FE và domain |

Tham khảo: GoFundMe chỉ cho người tổ chức xoá và khuyến nghị tắt nhận tiền thay vì xoá ([Delete your fundraiser](https://support.gofundme.com/hc/en-us/articles/203604074-How-Do-I-Delete-My-Fundraiser-)).

## 3. Quyết định

- Chỉ **người điều phối** được xoá, và chỉ khi dự án là **Bản nháp**. Dự án bị trả lại cũng quay về Bản nháp.
- Dự án đã gửi xác minh hoặc đã công khai không xoá được (409 `PROJECT_NOT_DRAFT`); dự án đã công khai dùng **Huỷ dự án** để giữ lịch sử.
- Xoá là **xoá mềm**: đặt `projects.deleted_at` và ghi một dòng sổ ghi vết `draft → deleted` trong cùng transaction.
- Mọi đường đọc/sửa đi qua `findProject` nên dự án đã xoá trả 404; trang Việc của tôi cũng lọc ra. Không có nút khôi phục.
- Giao diện bắt xác nhận trong hộp thoại; nút được focus mặc định là "Quay lại".

## 4. Lý do lựa chọn

Xoá mềm là cách duy nhất vừa đáp ứng CRUD của US-2 vừa giữ trigger chỉ ghi thêm của sổ ghi vết. Giới hạn ở bản nháp vì bản nháp chưa từng công khai, chưa có người góp; dự án đã công khai đã có luồng Huỷ có lý do.

## 5. Hệ quả và giới hạn

- Migration `0015_khanh_us2_us5_us8` thêm cột `deleted_at` nullable, không đổi dữ liệu cũ.
- Truy vấn mới lấy dự án theo người dùng mà không qua `findProject` phải tự lọc `deleted_at IS NULL`.
- Dữ liệu bản nháp đã xoá vẫn nằm trong DB; chưa có quy trình xoá hẳn theo yêu cầu dữ liệu cá nhân.

## 6. Bằng chứng và điều kiện xem lại

Source: `canDeleteProject` trong [rules.ts](../../packages/domain/src/rules.ts), `deleteProject` trong [projects.service.ts](../../be/src/modules/projects/projects.service.ts), [projects.repository.ts](../../be/src/modules/projects/projects.repository.ts), [dashboard.repository.ts](../../be/src/modules/dashboard/dashboard.repository.ts), [DraftPanel](../../fe/src/presentation/modules/projects/components/DraftPanel.tsx), [migration 0015](../../be/drizzle/0015_khanh_us2_us5_us8.sql).

Kiểm chứng: [API test](../../be/tests/integration/api.test.ts) (tạm bỏ từng điều kiện lọc thì test đỏ), E2E "Q-03 xoá bản nháp" trong [project-flow.spec.ts](../../fe/e2e/project-flow.spec.ts), [bằng chứng US-2](../evidence/us2-verification.md).

Xem lại khi cần admin gỡ dự án vi phạm đã công khai, hoặc có yêu cầu xoá dữ liệu cá nhân theo luật: cần thiết kế ẩn công khai nhưng giữ sổ ghi vết, và quy trình khôi phục.
