# US-6 — bằng chứng kiểm tra hồi quy và mẫu human review

Cập nhật: 25/10/2026 (Asia/Saigon). Nhánh `Khanh_Newtech`, sau commit US-5 **9808eae**. Môi trường: Windows 11, Node.js 22.21.0, Next.js 16.3.5, PGlite demo cục bộ; E2E dùng DB test cô lập.

**Trạng thái:** "Việc của tôi" (`/me`) và hồ sơ công khai (`/u/:id`) đã có từ trước. Đợt này kiểm hồi quy sau US-2 (bản nháp đã xoá không còn trong "Việc của tôi") và bổ sung test đổi tài khoản, trước đây chỉ kiểm một người. Chờ người kiểm điền human review.

## 1. Kết quả kỹ thuật đã có

| Phép kiểm | Kết quả thực tế | Giới hạn |
| :-- | :-- | :-- |
| `npm.cmd test` | **156/156 đạt**: 54 domain, 75 backend, 27 frontend | Backend dùng PGlite test |
| `npm.cmd run typecheck` | **Đạt** | Backend và frontend |
| `next build` | **Đạt** | Build ra thư mục tạm; chưa chứng minh deploy |
| `npm.cmd run test:e2e` | **11/11 đạt** ở hai lần chạy liền nhau. Lần chạy đầu 10/11: một ca hết thời gian chờ khi máy đang tải nặng (cả lượt mất 4 phút thay vì khoảng 3 phút); file lỗi bị lần chạy sau ghi đè nên không xác định được ca nào | E2E dùng DB test cô lập |

### Truy vết tiêu chí US-6

| Tiêu chí | Bằng chứng tự động | Cần xác nhận thủ công |
| :-- | :-- | :-- |
| A1 — đăng nhập mới xem, đúng việc của người đó; hồ sơ chỉ dữ kiện được phép | [Domain tests](../../packages/domain/src/dashboard.test.ts): mỗi vai thấy đúng việc được làm; hồ sơ chỉ đếm đóng góp đã xác nhận ở dự án công khai. [API test](../../be/tests/integration/api.test.ts): chưa đăng nhập 401; hồ sơ không có trường email. **Mới:** "US-6 đổi tài khoản" — Khanh là người điều phối Hoa Mai, Mai là người phụ trách tài chính, An không có vai; danh sách đóng góp của An khớp đúng số dòng trong DB; hồ sơ của Mai không chứa email hay số điện thoại thật của Mai. Test US-2: bản nháp đã xoá không còn trong "Việc của tôi" | H1, H2, H4 |
| A2 — link tới việc, nhóm dự án/đóng góp, trạng thái tải/rỗng/lỗi; không nhầm với AI analytics | [MyDashboardPage](../../fe/src/presentation/modules/dashboard/pages/MyDashboardPage.tsx) có link `?tab=` tới đúng tab; trạng thái rỗng cho từng mục. **Mới:** [E2E](../../fe/e2e/project-flow.spec.ts) "US-6": ba tài khoản thấy vai khác nhau với cùng dự án; trang hồ sơ không hiện email | H3 |

**Chạy thật trên app:** đăng nhập tài khoản mẫu Mai → `/me` hiện việc "1 đóng góp đã bàn giao, chờ bạn xác nhận đã nhận" ở Hoa Mai và các dự án theo vai "Bạn điều phối", "Bạn phụ trách tài chính". Hồ sơ `/u/` của Mai hiện tên, nhãn "Đã xác minh danh tính" và số liệu; không có ký tự `@` hay số điện thoại.

## 2. Human review

**Người kiểm BE:** [Tên]  
**Người kiểm FE:** [Tên]  
**Ngày/giờ:** [dd/mm/yyyy, múi giờ]  
**Môi trường:** [frontend `http://localhost:3000`, backend `http://localhost:4000`, PGlite demo / DB khác]  
**Commit hoặc working tree:** [mã commit]  
**Dữ liệu thử:** [tài khoản mẫu đã dùng]

| Ca | Thao tác và kết quả mong đợi | Kết quả thực tế | Trạng thái | Ghi chú |
| :-- | :-- | :-- | :-- | :-- |
| H1 — Cần đăng nhập | Đăng xuất → mở `/me` → thấy "Đăng nhập để xem việc của bạn", không có dữ liệu của ai | [Điền] | Chưa kiểm | [Điền] |
| H2 — Đổi tài khoản | Lần lượt đăng nhập Khanh, Mai, An bằng "Dùng tài khoản mẫu" → mở `/me` → mỗi người thấy việc và vai khác nhau; Hoa Mai hiện "Bạn điều phối" với Khanh, "Bạn phụ trách tài chính" với Mai, không có trong "Dự án của tôi" của An | [Điền] | Chưa kiểm | [Điền] |
| H3 — Link tới đúng việc | Bấm nút ở một việc (ví dụ "Xác nhận", "Duyệt chi") → mở đúng dự án, đúng tab | [Điền] | Chưa kiểm | [Điền] |
| H4 — Hồ sơ công khai | Bấm tên một người trên trang dự án → `/u/…` → thấy tên, số liệu, dự án công khai; không có email, số điện thoại, dự án nháp | [Điền] | Chưa kiểm | [Điền] |
| H5 — Đọc source | Giải thích: `sourceFor` lấy dự án theo vai (bỏ dự án đã xoá) → `buildDashboard` tính việc theo đúng luật trong domain → `toProfile` chỉ đếm dữ kiện công khai | [Điền] | Chưa kiểm | BE và FE mỗi người tự giải thích |

**Lỗi phát hiện / cách xử lý:** [Điền; nếu không có, ghi "Không phát hiện trong các ca đã kiểm"]  
**Ca chưa kiểm và lý do:** [Điền]  
**Kết luận US-6:** [Đạt / Chưa đạt / Chờ kiểm bổ sung]  
**Xác nhận BE:** [Tên, ngày, phần đã tự đọc/giải thích]  
**Xác nhận FE:** [Tên, ngày, phần đã tự đọc/giải thích]

Sau khi điền, ghi tóm tắt bằng một entry mới trong [AI_USAGE.md](../../AI_USAGE.md), không sửa entry cũ.

## 3. Giới hạn hiện tại

- **"Việc của tôi" là trang của từng thành viên**, không phải bảng thống kê AI cho admin; bảng đó thuộc US-9.
- **Chưa có thông báo đẩy** khi có việc mới; người dùng phải mở trang.
- **Chưa có human review**, tên và ngày xác nhận.
