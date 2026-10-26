# US-3 — bằng chứng kiểm tra và mẫu human review

Cập nhật: 25/10/2026 (Asia/Saigon). Nhánh `Khanh_Newtech`, sau commit US-2 **26a3a68**. Môi trường: Windows 11, Node.js 22.21.0, Next.js 16.3.5, PGlite demo cục bộ đã nạp thêm dự án mẫu; E2E dùng DB test cô lập.

**Trạng thái:** Tìm, lọc, sắp xếp và phân trang nay chạy ở máy chủ với contract có tổng số và số trang. Trang chủ giữ toàn bộ điều kiện trên URL. Chờ người kiểm điền human review; chưa đổi US-3 sang trạng thái nghiệm thu.

## 1. Kết quả kỹ thuật đã có

| Phép kiểm                              | Kết quả thực tế                                                                                                                                                                                                                                                                                          | Giới hạn                                                       |
| :------------------------------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :------------------------------------------------------------- |
| `npm.cmd test`                         | **149/149 đạt**: 51 domain, 72 backend, 26 frontend                                                                                                                                                                                                                                                      | Backend dùng PGlite test                                       |
| `npm.cmd run typecheck`                | **Đạt**                                                                                                                                                                                                                                                                                                  | Backend và frontend                                            |
| `next build`                           | **Đạt**                                                                                                                                                                                                                                                                                                  | Build ra thư mục tạm; chưa chứng minh deploy                   |
| `npm.cmd run test:e2e`                 | **8/8 đạt**, gồm luồng US-3: link có `?q=hoa mai` mở đúng 1 dự án, tải lại vẫn giữ, lọc "Đã huỷ" ra trạng thái rỗng, "Xoá bộ lọc" về danh sách                                                                                                                                                           | DB test chỉ có 2 dự án công khai nên E2E không bấm qua trang   |
| Test có bắt được lỗi không             | Bỏ khoá phụ `id` khi sắp xếp → test phân trang đỏ. Bỏ phần bỏ dấu khi tìm → test tìm kiếm đỏ. Bỏ điều kiện "đã đọc URL" → E2E đỏ vì mất bộ lọc của link. Đã khôi phục code                                                                                                                               | Kiểm bằng tay một lần mỗi chỗ                                  |
| Chạy thật trên app, 19 dự án công khai | 3 trang 9 + 9 + 1 dự án, 19 dự án khác nhau, không trùng. Nút "Trang trước" tắt ở trang 1, "Trang sau" tắt ở trang cuối. Bấm lọc "Tiền" về trang 1 với 11 dự án. Link `?page=99` tự về trang 3. Từ trang 2 mở một dự án rồi quay lại vẫn ở trang 2, giữ cách sắp xếp. Tải lại trang không có request lỗi | PGlite demo đã nạp 25 dự án bằng `be/scripts/seed-projects.ts` |
| Giao diện                              | [Ảnh nút trang ở 375 px](us3/pager-mobile-375.jpg), không tràn ngang                                                                                                                                                                                                                                     | Đo ở chế độ sáng                                               |

**Lỗi tìm thấy và đã sửa trong lúc kiểm:**

- **Link chia sẻ mất bộ lọc khi chạy dev.** React chạy effect hai lần; effect ghi URL xoá query trước khi đọc lại. Trang cũ cũng mắc lỗi này. Đã sửa bằng cách chỉ tải và ghi URL sau khi đọc xong bộ lọc; E2E giữ lỗi không quay lại.
- **Bấm "Trang sau" không chuyển trang.** Effect đồng bộ số trang chạy cả khi người dùng vừa đổi trang và kéo về trang cũ. Đã sửa để effect chỉ chạy khi có dữ liệu mới; kiểm lại trên trình duyệt.

### Truy vết tiêu chí US-3

| Tiêu chí                                                            | Bằng chứng tự động                                                                                                                                                                                                                                       | Cần xác nhận thủ công |
| :------------------------------------------------------------------ | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :-------------------- |
| A1 — tìm, lọc, sắp xếp, phân trang                                  | [catalog tests](../../packages/domain/src/catalog.test.ts): tìm theo tên/địa điểm/nhóm thụ hưởng không dấu; lọc trạng thái và loại nhu cầu; 3 cách sắp xếp. [API test](../../be/tests/integration/api.test.ts) "US-3 danh sách công khai"                | H1–H4                 |
| A2 — tổng/trang nhất quán, đổi điều kiện về trang hợp lý, input sai | catalog test: các trang ghép lại đủ và không trùng, trang vượt quá về trang cuối, trang 0 thành trang 1. API test: 2 trang `pageSize=1` khác nhau; `page=0`, `page=abc`, `pageSize=500`, `sort=hot`, `kind=car`, `q` dài 101 ký tự đều 400 `BAD_REQUEST` | H4, H5                |
| A3 — chỉ dự án công khai, loading/error/empty, URL                  | catalog và API test: không trả bản nháp hay dự án chờ xác minh, kể cả khi lọc thẳng trạng thái đó. [E2E](../../fe/e2e/project-flow.spec.ts) URL và trạng thái rỗng. [Mock test](../../fe/tests/mock-api.test.ts) cùng contract                           | H5, H6                |

## 2. Contract đã chốt

```text
GET /api/projects?q=&status=&kind=&sort=soon|needed|newest&page=&pageSize=
→ 200 { items: ProjectSummary[], total, page, pageSize, totalPages, stats }
```

- **Tìm:** không phân biệt hoa thường và dấu tiếng Việt, ví dụ "thu duc" khớp "Thủ Đức".
- **Sắp xếp:** dự án đã hoàn thành hoặc đã huỷ luôn xuống cuối. "Sắp diễn ra" theo khoảng cách tới ngày bắt đầu, "Còn thiếu nhiều nhất" theo tỉ lệ đã có người nhận, "Mới đăng" theo ngày tạo. Khoá phụ là id để thứ tự cố định giữa các lần gọi.
- **Trang:** mặc định 9 dự án, tối đa 48. Trang vượt quá trả trang cuối.
- **Số liệu tổng** ở đầu trang chủ tính trên mọi dự án công khai, không đổi theo bộ lọc.
- **Logic dùng chung** ở `queryProjects` trong `packages/domain`, nên backend và bản chạy thử trong trình duyệt trả cùng kết quả.

## 3. Human review

**Người kiểm BE:** [Tên]  
**Người kiểm FE:** Khanh  
**Ngày/giờ:** [26/10/2026, vietnam]  
**Môi trường:** [frontend `http://localhost:3000`, backend `http://localhost:4000`, PGlite demo / DB khác]  
**Commit hoặc working tree:** [f7ac5b6]  
**Dữ liệu thử:** 9 dự án công khai

Chuẩn bị: cần trên 9 dự án công khai để thấy nút trang. Trên DB cục bộ, tắt backend rồi chạy `node --env-file-if-exists=.env scripts/seed-projects.ts` trong thư mục `be`. **Chỉ chạy khi `DATABASE_URL` trong `be/.env` đang tắt**, nếu không script sẽ ghi vào database thật. Sau đó chạy lại backend và frontend.

Điền **kết quả thực tế** và **Pass / Fail / Chưa kiểm** sau khi tự thao tác.

| Ca                            | Thao tác và kết quả mong đợi                                                                                                                                                                               | Kết quả thực tế | Trạng thái | Ghi chú                          |
| :---------------------------- | :--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :-------------- | :--------- | :------------------------------- |
| H1 — Tìm không dấu            | Gõ "ha giang" hoặc "thu duc" vào ô tìm → sau khoảng nửa giây danh sách chỉ còn dự án khớp; URL có `?q=`                                                                                                    | [Điền]          | Chưa kiểm  | [Pass]                           |
| H2 — Lọc                      | Chọn loại nhu cầu "Tiền" rồi trạng thái "Đang thực hiện" → mọi thẻ đều khớp cả hai điều kiện; số "N dự án" đổi theo                                                                                        | [Điền]          | Chưa kiểm  | [Pass]                           |
| H3 — Sắp xếp                  | Đổi "Sắp diễn ra", "Còn thiếu nhiều nhất", "Mới đăng" → thứ tự đổi đúng ý nghĩa; dự án đã hoàn thành luôn ở cuối                                                                                           | [Điền]          | Chưa kiểm  | [Pass]                           |
| H4 — Phân trang               | Bấm "Trang sau" tới trang cuối rồi "Trang trước" → mỗi trang tối đa 9 thẻ, không thấy thẻ lặp lại giữa các trang; nút tắt đúng lúc ở trang đầu và cuối                                                     | [Pass]          | Chưa kiểm  | Ghi số trang và tổng số 3/3      |
| H5 — Đổi điều kiện và link cũ | Đang ở trang 2, đổi bộ lọc → về trang 1. Sửa URL thành `?page=99` → về trang cuối                                                                                                                          | [Điền]          | Chưa kiểm  | [Pass]                           |
| H6 — Quay lại và chia sẻ      | Ở trang 2 với một bộ lọc, mở một dự án rồi bấm quay lại → vẫn trang 2 và bộ lọc cũ. Copy URL sang tab mới → thấy đúng như vậy. Bộ lọc không khớp gì → "Không có dự án nào khớp bộ lọc" và nút "Xoá bộ lọc" | [Điền]          | Chưa kiểm  | [Pass]                           |
| H7 — API                      | Mở `http://localhost:4000/api/projects?page=0` → 400; `?status=draft` → `total` bằng 0, không lộ bản nháp                                                                                                  | [Điền]          | Chưa kiểm  | [Pass]                           |
| H8 — Đọc source               | Giải thích: URL → state trang → `listProjects(query)` → Zod `listQuery` → `queryProjects` (lọc, sắp xếp, cắt trang) → JSON có `total`, `totalPages`                                                        | [Điền]          | Chưa kiểm  | BE và FE mỗi người tự giải thích |

**Lỗi phát hiện / cách xử lý:** [Không phát hiện trong các ca đã kiểm]  
**Ca chưa kiểm và lý do:** [Không phát hiện trong các ca đã kiểm]  
**Kết luận US-3:** [Đạt]  
**Xác nhận BE:** [Tên, ngày, phần đã tự đọc/giải thích]  
**Xác nhận FE:** [Khanh, 26/10/2026, phần đã tự đọc/giải thích]

Sau khi điền, ghi tóm tắt bằng một entry mới trong [AI_USAGE.md](../../AI_USAGE.md), không sửa entry cũ. Chỉ đổi trạng thái US-3 trong [traceability.md](../traceability.md) và [backlog.md](../backlog.md) khi các ca bắt buộc đều đạt.

## 4. Giới hạn hiện tại

- **Lọc trong bộ nhớ:** mỗi request đọc mọi dự án công khai rồi lọc. Đủ nhanh với vài trăm dự án; khi lên hàng nghìn cần chuyển sang truy vấn SQL có chỉ mục.
- **"Mới đăng" theo ngày tạo,** không phải ngày được duyệt công khai.
- **Ô tìm chỉ khớp chuỗi con.** Chưa có tìm theo từ đồng nghĩa hay sai chính tả.
- **E2E chưa bấm qua trang** vì DB test chỉ có 2 dự án công khai; phần chuyển trang được kiểm bằng test domain, test API và chạy thật trên trình duyệt.
- **Chưa có human review**, tên và ngày xác nhận.
