# ADR-005 — Xoá dự án: chỉ bản nháp, xoá mềm

- Ngày: 25/10/2026. Owner: Khanh (US-2).
- Trạng thái: **Implemented**. Accepted khi người kiểm ghi xác nhận trong human review của [US-2](../evidence/us2-verification.md).
- Liên quan: US-2 A4, Q-03, nguyên tắc minh bạch và sổ ghi vết.

## Bối cảnh

US-2 cần xoá dữ liệu chính. Bảng `audit_log` chỉ cho ghi thêm: trigger trong PostgreSQL chặn UPDATE, DELETE, TRUNCATE. Mỗi dòng sổ ghi vết tham chiếu `projects.id` và không cascade. Vì vậy không thể xoá cứng một dự án đã có sổ ghi vết mà không phá cam kết "lịch sử không sửa được". Dự án đã công khai có thể đã nhận đóng góp, nên người góp cần thấy lại.

## Quyết định

- Chỉ **người điều phối** được xoá, và chỉ khi dự án đang là **Bản nháp**. Bản nháp chưa từng công khai; dự án bị trả lại cũng quay về Bản nháp.
- Dự án đã gửi xác minh hoặc đã công khai không xoá được (409 `PROJECT_NOT_DRAFT`). Dự án đã công khai dùng **Huỷ dự án** để giữ lịch sử.
- Xoá là **xoá mềm**: đặt `projects.deleted_at` và ghi một dòng sổ ghi vết `draft → deleted` trong cùng transaction.
- Mọi đường đọc/sửa đi qua `findProject` nên dự án đã xoá trả 404; trang Việc của tôi cũng lọc ra. Ứng dụng không có nút khôi phục.
- Giao diện bắt xác nhận trong hộp thoại; nút được focus mặc định là "Quay lại".

## Phương án thay thế và trade-off

| Phương án | Lợi ích | Đánh đổi |
| :-- | :-- | :-- |
| Xoá mềm bản nháp (chọn) | Giữ sổ ghi vết nguyên vẹn; thay đổi nhỏ: một cột, hai điều kiện lọc | Dữ liệu vẫn nằm trong DB; truy vấn mới phải nhớ lọc |
| Xoá cứng bản nháp | Dữ liệu biến mất thật | Phải xoá cả sổ ghi vết, trái trigger chỉ ghi thêm |
| Cho xoá cả dự án đã công khai | Linh hoạt cho người điều phối | Người góp mất dấu khoản đã góp; trùng vai với Huỷ dự án |
| Thêm trạng thái `deleted` vào enum | Dùng lại kiểm tra theo trạng thái | Phải sửa mọi bảng nhãn và luồng trạng thái ở FE và domain |

Tham khảo: GoFundMe chỉ cho người tổ chức xoá, giữ bản đã xoá ở tab riêng và khuyến nghị tắt nhận tiền thay vì xoá ([Delete your fundraiser](https://support.gofundme.com/hc/en-us/articles/203604074-How-Do-I-Delete-My-Fundraiser-)).

## Hệ quả

- Migration `0012_project_soft_delete` thêm cột `deleted_at` nullable; không đổi dữ liệu cũ.
- Script một lần `deploy-us1-schema.ts` của US-1 khẳng định repo chỉ có migration tới 0011, nên sẽ từ chối chạy lại. Đây là hành vi bảo vệ có chủ đích.
- Truy vấn mới lấy dự án theo người dùng mà không qua `findProject` phải tự lọc `deleted_at IS NULL`.

Sources: [rules.ts](../../packages/domain/src/rules.ts) `canDeleteProject`, [projects.service.ts](../../be/src/modules/projects/projects.service.ts) `deleteProject`, [projects.repository.ts](../../be/src/modules/projects/projects.repository.ts), [dashboard.repository.ts](../../be/src/modules/dashboard/dashboard.repository.ts), [DraftPanel](../../fe/src/presentation/modules/projects/components/DraftPanel.tsx), [migration](../../be/drizzle/0012_project_soft_delete.sql).

## Khi xem lại

Khi cần admin gỡ dự án vi phạm đã công khai, hoặc có yêu cầu xoá dữ liệu cá nhân theo luật. Khi đó cần thiết kế riêng: ẩn công khai nhưng giữ sổ ghi vết, và quy trình khôi phục.
