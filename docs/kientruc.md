# Cấu trúc lại GOM NẮNG theo module chức năng

## 1. Mục tiêu và hướng tổ chức

Chuyển repo sang **`be/` và `fe/`**, giữ Next.js, Express, TypeScript, Drizzle/PGlite và package nghiệp vụ dùng chung.

Thực hiện hai chặng đã thống nhất:

1. **Cấu trúc lại:** tách trách nhiệm, cập nhật đường dẫn, kiểm tra toàn bộ hành vi hiện có.
2. **Tích hợp:** nối frontend với backend và database thật.

Cấu trúc gốc:

```text
GomNang/
├── be/
├── fe/
├── packages/
│   └── domain/           # Kiểu, quy tắc thuần, validation dùng chung
├── docs/
├── scripts/              # Công cụ cấp repo, LLM smoke test
├── package.json          # npm workspaces và lệnh chạy chung
├── package-lock.json
├── .env.example          # Cấu hình smoke test
└── README.md
```

Đợt này tập trung tổ chức mã nguồn và tích hợp local; các thay đổi nghiệp vụ như bổ sung trạng thái `proposed`, điều chỉnh BR-003 được ghi thành công việc riêng.

## 2. Backend: mỗi chức năng là một module

```text
be/
├── src/
│   ├── app.ts                   # Ghép dependency, middleware và router
│   ├── server.ts                # Khởi động, mở cổng, đóng dịch vụ
│   ├── config/
│   │   └── env.ts
│   ├── infrastructure/
│   │   ├── database/
│   │   │   ├── client.ts
│   │   │   ├── schema.ts
│   │   │   └── seed.ts
│   │   ├── audit/
│   │   │   └── audit.repository.ts
│   │   └── logging/
│   │       └── logger.ts
│   ├── common/
│   │   ├── errors/
│   │   ├── middleware/          # Request log, xử lý lỗi, 404, validation
│   │   └── types/               # Dependency và HTTP context dùng chung
│   ├── modules/
│   │   ├── auth/
│   │   ├── users/
│   │   ├── projects/
│   │   │   ├── projects.route.ts
│   │   │   ├── projects.controller.ts
│   │   │   ├── projects.middleware.ts
│   │   │   ├── projects.service.ts
│   │   │   ├── projects.repository.ts
│   │   │   ├── projects.schema.ts
│   │   │   ├── projects.types.ts
│   │   │   └── projects.mapper.ts
│   │   ├── verification/
│   │   └── contributions/
│   └── health/
│       ├── health.route.ts
│       └── health.controller.ts
├── drizzle/                     # Giữ migration và lịch sử hiện có
├── scripts/
├── examples/
├── tests/
│   ├── integration/
│   └── unit/
├── .env.example
├── drizzle.config.ts
├── tsconfig.json
└── package.json
```

Các module nghiệp vụ dùng mẫu đặt tên như `projects`. File repository/mapper chỉ tạo khi module thực sự sở hữu truy vấn hoặc chuyển đổi dữ liệu; `health` giữ cấu trúc nhỏ.

**Trách nhiệm từng lớp:**

| Thành phần   | Công việc                                                                                 |
| ------------ | ----------------------------------------------------------------------------------------- |
| `route`      | Khai báo URL, HTTP method và thứ tự middleware/controller.                                |
| `middleware` | Kiểm tra đầu vào HTTP và điều kiện truy cập ban đầu; tái sử dụng xác thực từ module auth. |
| `controller` | Nhận dữ liệu đã kiểm tra, gọi service, trả status/header/JSON.                            |
| `service`    | Điều phối nghiệp vụ, kiểm quyền trên tài nguyên, gọi domain và quản lý transaction.       |
| `repository` | Truy vấn database, nhận kết nối hoặc transaction từ service.                              |
| `schema`     | Zod schema cho params, query, body; khác với schema bảng database.                        |
| `types`      | Kiểu nội bộ của module; tái sử dụng kiểu chung thay vì khai báo lại.                      |
| `mapper`     | Chuyển dòng database sang dữ liệu domain/response.                                        |

Luồng xử lý:

```text
Request
  → Route
  → Middleware
  → Controller
  → Service
  → Domain rules + Repository
  → Database
  → Controller trả JSON
```

**Phân chia chức năng:**

- **Auth:** đăng nhập demo, phát/kiểm JWT, `requireAuth`, `optionalAuth`.
- **Users:** tìm người dùng, danh sách thành viên; cung cấp truy vấn cho auth.
- **Projects:** tạo/sửa/đọc dự án, hạng mục nhu cầu và dữ liệu chi tiết.
- **Verification:** hàng chờ, gửi xác minh, đánh giá bằng quy tắc tĩnh, duyệt/trả về.
- **Contributions:** cam kết, bàn giao, xác nhận và tổng số lượng.
- **Audit:** khả năng ghi lịch sử nội bộ dùng chung; chưa mở API sửa/xóa.

**Quy tắc phụ thuộc:**

- Controller không truy vấn DB; service không nhận `Request`/`Response` của Express.
- Service sở hữu transaction; ghi trạng thái và audit cùng transaction.
- Kiểm quyền liên quan trạng thái và khóa dữ liệu vẫn thực hiện trong service, không chuyển hết ra middleware.
- Các module phối hợp bằng dependency truyền từ `app.ts`; không import vòng giữa service.
- Truy vấn chi tiết dự án có thể tổng hợp nhiều bảng để giữ nguyên response hiện tại.
- Dùng hàm và dependency injection đơn giản, phù hợp cách viết hiện có; không thêm framework DI.

## 3. Frontend: `libs` và `presentation/modules`

Giữ `src/app` làm điểm định tuyến của Next.js. Next.js hỗ trợ đặt ứng dụng trong `src` và tổ chức code ngoài thư mục route; `presentation` là quy ước của dự án. [Tài liệu Next.js](https://nextjs.org/docs/app/getting-started/project-structure)

```text
fe/
├── src/
│   ├── app/
│   │   ├── layout.tsx
│   │   ├── page.tsx
│   │   ├── projects/
│   │   │   ├── new/page.tsx
│   │   │   └── [id]/
│   │   │       ├── page.tsx
│   │   │       └── edit/page.tsx
│   │   └── verify/page.tsx
│   ├── libs/
│   │   ├── api/
│   │   │   ├── contracts.ts     # Interface mà mock và HTTP cùng đáp ứng
│   │   │   ├── client.ts        # fetch, timeout, headers, parse response
│   │   │   ├── errors.ts
│   │   │   ├── index.ts        # Chọn adapter theo cấu hình
│   │   │   ├── http/
│   │   │   └── mock/
│   │   ├── config/
│   │   ├── session/
│   │   └── utils/
│   └── presentation/
│       ├── components/         # Field, LoadingState, EmptyState, ErrorState
│       ├── layouts/            # Header, footer, khung ứng dụng
│       ├── providers/          # Session và trạng thái dùng chung
│       ├── hooks/              # Hook tải dữ liệu dùng chung
│       ├── styles/
│       └── modules/
│           ├── auth/
│           ├── projects/
│           │   ├── pages/
│           │   ├── components/
│           │   ├── hooks/
│           │   ├── types/
│           │   └── index.ts
│           ├── verification/
│           └── contributions/
├── tests/
├── .env.example
├── next.config.mjs
├── tsconfig.json
└── package.json
```

**Cách phân loại mã nguồn:**

- `app/**/page.tsx` là lớp nối route với màn hình trong module; giữ nguyên URL.
- `presentation/modules/projects` chứa danh sách, chi tiết, tạo/sửa, form dự án, tiến độ nhu cầu và lịch sử dự án.
- Module `verification` chứa hàng chờ, assessment và thao tác duyệt.
- Module `contributions` chứa form cam kết, bảng đóng góp, nút bàn giao/xác nhận.
- Module `auth` chứa giao diện chọn tài khoản demo.
- `libs` chứa mã không phụ thuộc giao diện; React hooks/components nằm trong `presentation`.
- Component dùng chung không phụ thuộc module nghiệp vụ; màn hình chi tiết dự án ghép component từ các module qua `index.ts`.
- Chỉ component cần state, event hoặc browser API mới có `'use client'`; layout gốc vẫn là Server Component.

Tách `ProjectPanels` và `ui` hiện tại theo các trách nhiệm trên. Giữ CSS và giao diện hiện có trong chặng đầu để dễ kiểm chứng việc di chuyển.

## 4. Trình tự thực hiện và giao diện tích hợp

### Chặng 1 — Cấu trúc lại và giữ hành vi hiện tại

1. **Lấy mốc kiểm chứng:** cài đúng lockfile, chạy test/build hiện có, ghi lại lỗi có sẵn nếu gặp.
2. **Di chuyển ứng dụng:** chuyển backend và frontend cũ thành `be`, `fe`; cập nhật npm workspaces, lockfile, import, alias FE `@/* → src/*`.
3. **Bảo toàn cấu hình và dữ liệu:** chuyển `.env` và DB local nếu tồn tại sau khi dừng server; kiểm tra đường dẫn đích, tránh ghi đè. Sửa đường tìm migration; giữ nguyên nội dung và lịch sử migration.
4. **Tách backend:** auth/users → projects → verification → contributions. Chuyển orchestration từ route vào service, SQL vào repository.
5. **Tách frontend:** route mỏng → module màn hình → component dùng chung → hooks/session → mock adapter. Giữ khóa localStorage cũ để bảo toàn demo.
6. **Cập nhật tài liệu:** README PowerShell, sơ đồ kiến trúc, đường dẫn tài liệu tuần học, nhật ký AI và kế hoạch học đã có.

Giữ tên npm package hiện tại. Bổ sung `dev:be`, `dev:fe`; giữ `dev:api`, `dev:web` làm alias tương thích. Lệnh `typecheck` kiểm cả BE và FE; bổ sung lệnh `build` ở gốc cho frontend.

**Contract công khai:** giữ nguyên 12 endpoint, method, JSON, status code và các URL frontend. Giữ export của `packages/domain`; package này không được phụ thuộc Express, React, DB hoặc secret.

### Chặng 2 — Nối FE–BE–DB

- FE dùng `NEXT_PUBLIC_API_MODE=mock|http`; chặng 1 mặc định mock, chặng 2 mặc định HTTP. Cả hai adapter triển khai cùng interface.
- Dùng Next.js rewrite `/api/:path*` sang backend; cấu hình server-side `API_ORIGIN`, mặc định local là `http://localhost:4000`.
- Chọn tài khoản trong chế độ HTTP phải gọi `POST /api/auth/dev-login`, lấy user/token từ backend. Giữ session trong React provider và `sessionStorage` cho demo local.
- Request gửi Bearer token; 401 xóa session và yêu cầu chọn lại tài khoản. Đổi tài khoản phải hủy/bỏ qua kết quả tải cũ.
- Client đặt timeout 15 giây, chuẩn hóa lỗi về `ApiError`; không tự gửi lại request ghi dữ liệu.
- Sau thao tác thành công, tải lại dữ liệu từ API. Lỗi mạng giữ nội dung form và cho thử lại; không tự chuyển sang mock.
- Chế độ giả lập lỗi và reset dữ liệu chỉ xuất hiện khi chạy mock; nhãn footer phản ánh đúng chế độ.
- Giữ PGlite cho local. Đăng nhập production, thay DB driver và triển khai cloud thuộc công việc sau.

## 5. Kiểm thử và điều kiện hoàn thành

**Sau chặng 1:**

- Bộ test domain, API và mock hiện có chạy đạt; typecheck BE/FE và frontend build thành công.
- Route, response, lỗi validation, phân quyền và luồng ba vai hoạt động như trước.
- Transaction vẫn ghi dữ liệu và audit đồng bộ; kiểm thử rollback không để lại bản ghi dở dang.
- Khóa nhu cầu và kiểm tra tổng cam kết vẫn nằm trong cùng transaction.
- Restart backend đọc được dữ liệu cũ; migration không bị chạy lại như database mới.
- Người khác chạy được repo từ hướng dẫn mới; các script đang dùng không còn trỏ tới thư mục cũ.

**Sau chặng 2:**

- Tạo dự án trên UI tạo bản ghi thật trong DB.
- Gửi xác minh → duyệt → cam kết 30/100 → bàn giao → xác nhận hoạt động đầy đủ.
- Cam kết vượt nhu cầu trả 422; sai quyền trả 403; token không hợp lệ trả 401.
- Đổi tài khoản không hiển thị dữ liệu riêng của phiên trước.
- Tắt backend hiện lỗi rõ ràng; bật lại và thử lại hoạt động.
- Refresh trình duyệt và restart backend vẫn đọc được cùng dữ liệu.

Kết quả cuối là repo có `be/`, `fe/`, module rõ trách nhiệm, giữ được bằng chứng frontend mock cho tuần 3 và chạy được luồng FE–BE–DB thật cho bước tích hợp tuần 4.
