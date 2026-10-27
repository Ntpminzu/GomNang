# ADR-001 — Transition from Layer-Based to Feature-Based Backend Architecture

**Chuyển từ tổ chức backend theo tầng sang tổ chức theo module chức năng**

- Ngày lập bản ghi: 27/10/2026.
- Trạng thái: **Implemented** — cấu trúc hiện tại được đối chiếu với source; chưa thay thế xác nhận của nhóm.
- Phạm vi: backend Express/TypeScript của GomNang.

## 1. Bối cảnh

GomNang gồm nhiều chức năng: đăng nhập, quản lý dự án, xác minh, đóng góp, thu chi, dashboard và chatbot RAG. Nếu đặt tất cả route trong `routes/`, controller trong `controllers/` và service trong `services/`, một thay đổi nghiệp vụ thường phải đi qua nhiều thư mục cấp cao. Khi số chức năng tăng, việc tìm các file liên quan, kiểm tra phạm vi thay đổi và phân công module trở nên khó hơn.

Backend cần giữ trách nhiệm từng tầng rõ ràng, đồng thời tập hợp code phục vụ cùng một chức năng vào một vị trí. Bản ghi này giải thích lựa chọn tổ chức thể hiện trong source hiện tại; không xác định ngày hay commit chuyển đổi khi chưa truy vết đầy đủ lịch sử refactor.

## 2. Các phương án

| Phương án | Ưu điểm | Hạn chế |
| :-- | :-- | :-- |
| Tổ chức theo tầng ở cấp toàn ứng dụng | Dễ bắt đầu, dễ nhận biết loại file | Code của một chức năng phân tán; thư mục lớn dần khi thêm nghiệp vụ |
| **Tổ chức theo chức năng, giữ phân tầng bên trong module** | Các file liên quan nằm gần nhau; dễ đọc một luồng và khoanh vùng thay đổi | Cần quy ước ranh giới module và phần dùng chung |
| Tách mỗi chức năng thành microservice | Có thể triển khai và mở rộng riêng | Thêm giao tiếp mạng, đồng bộ dữ liệu và vận hành, chưa phù hợp phạm vi nhóm hai người |

## 3. Quyết định

Tổ chức backend theo **feature-based modules** trong một ứng dụng Express. Mỗi module chứa các file route, controller, service, repository và những thành phần hỗ trợ cần thiết.

```text
be/src/
├── app.ts                         # Ghép ứng dụng và truyền dependencies
├── server.ts                      # Khởi động DB, model và HTTP server
├── modules/
│   ├── auth/
│   ├── users/
│   ├── projects/
│   │   ├── projects.route.ts
│   │   ├── projects.middleware.ts
│   │   ├── projects.controller.ts
│   │   ├── projects.service.ts
│   │   ├── projects.repository.ts
│   │   └── ...
│   ├── verification/
│   ├── contributions/
│   ├── transparency/
│   ├── dashboard/
│   ├── chat/
│   └── admin/
├── common/                        # Middleware, lỗi và types dùng chung
├── infrastructure/                # Database, audit và logging
├── config/
└── health/
```

Trách nhiệm trong module:

- **Route/middleware:** khai báo endpoint, xác thực và kiểm tra đầu vào theo contract.
- **Controller:** lấy dữ liệu request, gọi nghiệp vụ và gửi HTTP response.
- **Service:** điều phối nghiệp vụ, kiểm quyền/trạng thái và quản lý transaction khi cần.
- **Repository:** thực hiện truy vấn, cập nhật database.
- **Schema/types/mapper:** mô tả dữ liệu, validation và chuyển đổi kết quả phù hợp từng module.

`app.ts` là nơi lắp ghép route và truyền dependencies tường minh. Service nhận các dependency cần dùng thay vì trực tiếp gọi service của module khác. Các luật thuần và types dùng chung với frontend được đặt trong `packages/domain`; backend vẫn kiểm tra quyền và dữ liệu cuối cùng.

## 4. Lý do lựa chọn

Thiết kế này giữ code cùng nghiệp vụ gần nhau nhưng vẫn tận dụng phân tầng quen thuộc của Express. Ví dụ, khi kiểm tra việc tạo dự án, người đọc có thể bắt đầu tại `modules/projects/` và đi từ route tới repository. Nó hỗ trợ truy vết user story tới code và kiểm thử từng phần bằng dependencies giả, trong khi hệ thống vẫn triển khai như một backend duy nhất.

## 5. Hệ quả và đánh đổi

- Thêm chức năng chủ yếu tác động module tương ứng; sửa hợp đồng dùng chung vẫn có thể ảnh hưởng nhiều module và frontend.
- Cấu trúc thư mục không tự bảo đảm tính độc lập. Nhóm cần tránh import chéo service và tránh dồn nghiệp vụ riêng vào `common/`.
- Một module phức tạp như chat có thể có thêm file retrieval, guard, output và telemetry; không ép mọi module có số file giống nhau.
- Backend vẫn dùng chung tiến trình và database; đây là tổ chức module trong monolith, chưa phải microservices.
- Chưa có phép đo trước–sau về thời gian phát triển hoặc số lỗi để kết luận refactor cải thiện một tỷ lệ cụ thể.

## 6. Bằng chứng và điều kiện xem lại

Source: [app.ts](../../be/src/app.ts), [projects.route.ts](../../be/src/modules/projects/projects.route.ts), [projects.controller.ts](../../be/src/modules/projects/projects.controller.ts), [projects.service.ts](../../be/src/modules/projects/projects.service.ts), [projects.repository.ts](../../be/src/modules/projects/projects.repository.ts), [shared domain](../../packages/domain/src/rules.ts).

Kiểm thử liên quan: [API integration tests](../../be/tests/integration/api.test.ts), [domain rules tests](../../packages/domain/src/rules.test.ts). Các test kiểm hành vi; không phải số đo trực tiếp chất lượng kiến trúc.

Xem lại khi dependencies giữa module trở nên khó quản lý hoặc có nhu cầu triển khai độc lập đã được chứng minh bằng yêu cầu và số liệu vận hành.
