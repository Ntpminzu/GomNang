# Week 3 — Homework 3A evidence

**Bài:** UI skeleton
**Hạn:** trước buổi Thứ Sáu tuần 3
**Nhóm:** Võ Tuấn Khanh (23110031) · Phạm Văn Bảo An (23110001)

---

## Checklist yêu cầu của đề bài

| # | Yêu cầu | Đã làm ở đâu | Trạng thái |
| :-- | :-- | :-- | :-- |
| 1 | Main navigation + 2–3 màn hình thiết yếu | Header cố định; 3 màn: danh sách dự án, chi tiết dự án, tạo dự án | ✅ |
| 2 | Một form có validation chạy được | `/projects/new` + [`lib/validate-project.ts`](../apps/web/lib/validate-project.ts) | ✅ |
| 3 | Dùng mock data | [`lib/mock-data.ts`](../apps/web/lib/mock-data.ts) qua [`lib/api.ts`](../apps/web/lib/api.ts) | ✅ |
| 4 | Hiện đủ 4 trạng thái loading / empty / success / error | Bộ chuyển "Chế độ demo" trên mỗi màn | ✅ |
| 5 | Bố cục web responsive | Kiểm ở 375px và 1200px, không tràn ngang | ✅ |
| 6 | Ghi nhận code do AI sinh và phần người rà soát | [`ai-usage-log.md`](ai-usage-log.md) | ⬜ phần rà soát của người **chưa làm** |
| 7 | Screen recording 60 giây | kịch bản ở mục "Quay video" bên dưới | ⬜ **nhóm phải tự quay** |

## Cách chạy

```bash
cd "D:\Claude Code Space\GomNang\apps\web"; npm install; npm run dev
```

Mở http://localhost:3000. Không cần API key, không cần database — tuần 3 chạy hoàn toàn bằng dữ liệu giả.

```bash
cd "D:\Claude Code Space\GomNang\apps\web"; npm test
```

## Ba màn hình

| Đường dẫn | Màn hình | Nội dung chính |
| :-- | :-- | :-- |
| `/` | Danh sách dự án | Thẻ dự án kèm nhãn trạng thái, thanh tiến độ hai lớp cho từng hạng mục nhu cầu, ô tìm kiếm lọc theo tên / địa điểm / nhóm thụ hưởng |
| `/projects/[id]` | Chi tiết dự án | Thông tin dự án, toàn bộ hạng mục nhu cầu, bảng đóng góp kèm trạng thái, **sổ ghi vết** |
| `/projects/new` | Tạo dự án (US-1) | Form đầy đủ, hạng mục nhu cầu thêm/xoá được, validation theo quy tắc nghiệp vụ |

**Thanh tiến độ có hai lớp** vì chuỗi trạng thái đóng góp trong đặc tả có hai mốc khác nhau: *đã cam kết* (xanh cam mờ) chưa phải là *đã bàn giao* (xanh lá). Đây là chỗ dễ bị hỏi khi bảo vệ — cam kết mà chưa giao thì dự án vẫn chưa có gì trong tay.

## Form và validation

Toàn bộ quy tắc nằm trong một hàm thuần `validateProjectForm(input, today)` — không đụng DOM, không đụng React, và **nhận `today` từ bên ngoài** để test cho kết quả giống nhau ở mọi thời điểm chạy.

| Quy tắc | Thông báo khi vi phạm |
| :-- | :-- |
| Tên ≥ 8 ký tự | "Tên dự án cần ít nhất 8 ký tự…" |
| Mục tiêu ≥ 20 ký tự | "…Tránh viết chung chung như *giúp bà con khó khăn*." |
| Nhóm thụ hưởng, địa điểm bắt buộc | "Cần nêu địa điểm cụ thể — chỉ ghi tên quận là chưa đủ…" |
| Ngày bắt đầu không ở quá khứ | "Ngày bắt đầu không được ở quá khứ." |
| Ngày kết thúc ≥ ngày bắt đầu | "Ngày kết thúc phải bằng hoặc sau ngày bắt đầu." |
| ≥ 1 hạng mục nhu cầu | "Cần ít nhất một hạng mục nhu cầu…" |
| Mỗi hạng mục có tên, đơn vị, số lượng > 0 | "Số lượng phải là một số lớn hơn 0." |
| **BR-002** — có hạng mục tiền thì bắt buộc có người phụ trách tài chính | "BR-002: dự án có hạng mục bằng tiền bắt buộc phải có người phụ trách tài chính đã được xác minh." |
| **BR-003** — người phụ trách tài chính ≠ người điều phối | "BR-003: … Người giữ tiền không được tự xác nhận toàn bộ quy trình thu chi." |

Hai quy tắc cuối là điểm đáng nói nhất: chúng **không phải kiểm tra trường trống** mà là quy tắc nghiệp vụ lấy thẳng từ đặc tả §9.1. Chúng cũng là lý do màn hình phải kiểm tra lại mỗi khi người dùng đổi *hình thức* của một hạng mục sang "Tiền" — nhãn và phần gợi ý của ô "Người phụ trách tài chính" đổi theo.

> Validation phía trình duyệt chỉ để báo lỗi sớm. Tuần 4 phải kiểm lại **đúng bộ quy tắc này ở backend**, vì không được tin client — xem slide *"Never trust the client to enforce access control"*.

## Bốn trạng thái và cách trình diễn

Mỗi màn có thanh **Chế độ demo** để chuyển trạng thái mà không cần ngắt mạng:

| Chế độ | Đường dẫn | Kết quả |
| :-- | :-- | :-- |
| Bình thường | `/` | Độ trễ giả 600ms → hiện khung xương → dữ liệu |
| Mạng chậm | `/?state=slow` | Độ trễ 3 giây, đủ lâu để nhìn rõ trạng thái đang tải |
| Không có dữ liệu | `/?state=empty` | Trạng thái rỗng kèm lối thoát "Tạo dự án đầu tiên" |
| Máy chủ lỗi | `/?state=error` | Khung lỗi đỏ kèm nút "Thử lại" gọi lại API |

Danh sách dự án có **hai trạng thái rỗng khác nhau**: chưa có dự án nào, và có dự án nhưng bộ lọc không khớp — thông báo và lối thoát của hai trường hợp này khác nhau.

Trên form, "Máy chủ lỗi" tác động lên lúc bấm gửi: nút chuyển sang *Đang gửi…* và bị khoá, sau đó hiện cảnh báo đỏ **và giữ nguyên nội dung đã nhập**.

## Kiểm chứng đã chạy

| Kiểm tra | Lệnh / cách làm | Kết quả |
| :-- | :-- | :-- |
| Test validation | `npm test` (`node --test`, không cần thư viện test) | **11/11 pass** |
| Biên dịch + kiểm kiểu | `npx next build` | Thành công, 4 route, TypeScript không lỗi |
| Form rỗng → báo lỗi | Bấm gửi khi chưa nhập gì | 9 lỗi, hiện bảng tổng hợp, con trỏ nhảy về ô sai đầu tiên |
| BR-003 | Điền hợp lệ, đặt hạng mục *Tiền*, chọn người phụ trách tài chính trùng người điều phối | Đúng 1 lỗi BR-003, con trỏ nhảy về ô `treasurerId` |
| Gửi thành công | Đổi sang người phụ trách khác rồi gửi | Nút hiện *Đang gửi…* và bị khoá → màn hình thành công |
| Trách nhiệm trợ năng | Đếm ô nhập có `<label for>` | 12/12 ô đều có nhãn gắn đúng |
| Responsive | Đo `scrollWidth - innerWidth` ở 375px | Tràn ngang = 0px; hai bảng tự cuộn trong khung riêng |

## Quay video 60 giây

1. Mở `/` — chỉ danh sách, thanh tiến độ, gõ "Linh Trung" vào ô tìm kiếm. *(12s)*
2. Bấm **Máy chủ lỗi** → khung lỗi → bấm **Thử lại**. Bấm **Không có dữ liệu** → trạng thái rỗng. *(12s)*
3. Mở một dự án — kéo tới **sổ ghi vết**, nói một câu: mọi thay đổi đều để lại vết và không sửa được. *(12s)*
4. Vào **Tạo dự án**, bấm gửi khi form rỗng → bảng lỗi. *(10s)*
5. Điền đủ, đổi hạng mục sang **Tiền**, chọn người phụ trách tài chính **trùng** người điều phối → lỗi BR-003. Sửa lại → thành công. *(14s)*

## Thay đổi so với đề xuất tuần 2

Đề xuất tuần 2 ghi *"Next.js + TypeScript + Tailwind"*. **Đã bỏ Tailwind**, dùng một file CSS thường có biến màu. Lý do: 3 màn hình chưa đủ để đánh đổi thêm một dependency và một bước build, và mục 9 của Course Guide kiểm tra ngẫu nhiên thành viên — CSS thường thì cả hai đọc và giải thích được ngay. `docs/proposal.md` §6 đã sửa cho khớp. Nếu số màn hình tăng đáng kể ở tuần 6–7 thì thêm Tailwind sau vẫn được, đây là quyết định đảo ngược dễ.

## Blocker

**Blocker chính:** phần "human review" của mục 8 Course Guide **chưa hoàn thành**. Toàn bộ code màn hình do AI sinh trong một lượt; An là chủ sở hữu phần frontend nên phải đọc lại và sửa ít nhất những chỗ mình không tự giải thích được, trước buổi Thứ Sáu. Điểm "Student understanding" chiếm 2/10 và người bị hỏi là người được chọn ngẫu nhiên.
*Ba chỗ chắc chắn bị hỏi:* vì sao thanh tiến độ có hai lớp; vì sao `today` được truyền vào hàm validate thay vì gọi `new Date()` bên trong; vì sao validate ở trình duyệt vẫn chưa đủ.

**Rủi ro còn lại:** repo vẫn **chưa push lên GitHub** (`git remote -v` trống), nên chưa có Repository URL để nộp. Và món nợ từ tuần 1 vẫn còn: chưa phỏng vấn người dùng thật cho Homework 1B.
