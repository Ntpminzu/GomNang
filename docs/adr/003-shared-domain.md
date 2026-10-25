# ADR-003 — Shared domain và backend giữ quyền kiểm tra cuối

- Ngày ghi nhận: 25/10/2026.
- Trạng thái: **Implemented**, đối chiếu source; human review chờ.
- Liên quan: US-1, US-2, US-4, NFR-03/05 trong [requirements](../requirements.md).

## Bối cảnh

Form frontend, mock và API đều cần hiểu validation, vai trò và trạng thái nghiệp vụ. Chỉ kiểm UI cho phép request trực tiếp vượt luật; chép luật nhiều nơi dễ lệch.

## Lựa chọn thể hiện trong code

Các types, validation và pure rules nằm trong `packages/domain`, được FE/BE import. Frontend kiểm sớm để hướng dẫn người dùng; backend vẫn xác thực JWT, Zod body và quyền/business rules trên dữ liệu hiện tại. Service quản lý transaction; constraints, khóa và audit ở tầng DB giữ các bất biến cần thiết.

## Phương án thay thế và trade-off

| Phương án | Lợi ích | Đánh đổi |
| :-- | :-- | :-- |
| Shared domain hiện tại | Một bản logic thuần để test và dùng chung, dễ trace khi bảo vệ | Workspaces phụ thuộc nhau; sửa types/rules phải kiểm cả hai phía |
| Chép luật FE/BE riêng | Mỗi phía tự phát triển | Dễ lệch mã lỗi/quyền và phải sửa nhiều nơi |
| Chỉ luật ở backend, FE chờ lỗi | Backend vẫn là nơi tin cậy | Phản hồi nhập liệu chậm, mock phải mô phỏng hoặc khác hành vi |
| Chỉ luật trong UI | Ít code API | Không bảo vệ request trực tiếp; không đáp ứng yêu cầu security |

Lý do giữ thiết kế: đã hiện thực và hỗ trợ trace/test từng luật. Các trade-off là phân tích hiện tại, không khẳng định nhóm đã thử mọi phương án.

## Hệ quả và kiểm chứng

- Không đưa network/database/provider key vào shared domain; actor cuối cùng do backend xác thực.
- Không xem mock hoặc cùng hàm domain là bằng chứng mọi HTTP path có validation/quyền đúng.
- Test pure rules nhanh; API tests phải kiểm quyền, trạng thái, transaction và persistence; E2E kiểm nối UI–API.
- Chỉ người độc lập được duyệt dự án/khoản chi theo domain rules; AI output trong tương lai không được tự thay quyền.
- Có source và tests nhưng root test/typecheck còn lỗi RAG; không gọi toàn workspace đã đạt.

Sources: [rules.ts](../../packages/domain/src/rules.ts), [validate-project.ts](../../packages/domain/src/validate-project.ts), [rules tests](../../packages/domain/src/rules.test.ts), [project service](../../be/src/modules/projects/projects.service.ts), [verification service](../../be/src/modules/verification/verification.service.ts), [API tests](../../be/tests/integration/api.test.ts).

## Khi xem lại

Nếu thêm client không dùng TypeScript hoặc cần public API contract độc lập, cân nhắc schema/contract phát hành riêng. Không tách thêm tầng chỉ để đổi tên kiến trúc khi chưa có vấn đề cụ thể.
