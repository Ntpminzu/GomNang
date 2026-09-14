# Week 3 — Homework 3A và 3B evidence

**Bài:** 3A — UI skeleton · 3B — Complete frontend prototype
**Hạn:** 3A trước buổi Thứ Sáu tuần 3 · 3B trước buổi Thứ Ba tuần 4

> **Đọc phần 3A với lưu ý:** phần 3A bên dưới giữ nguyên như lúc nộp. Từ 3B, code đã chuyển chỗ —
> `validateProjectForm` thành `validateProject` trong [`shared/src/validate-project.ts`](../shared/src/validate-project.ts),
> `lib/mock-data.ts` thành [`shared/src/demo-data.ts`](../shared/src/demo-data.ts), và `npm install` chạy từ thư mục gốc repo.
> Phần 3B ở [cuối file](#homework-3b--complete-frontend-prototype).

---

## Homework 3A — UI skeleton
**Nhóm:** Võ Tuấn Khanh (23110031) · Phạm Văn Bảo An (23110001)

---

## Checklist yêu cầu của đề bài

| # | Yêu cầu | Đã làm ở đâu | Trạng thái |
| :-- | :-- | :-- | :-- |
| 1 | Main navigation + 2–3 màn hình thiết yếu | Header cố định; 3 màn: danh sách dự án, chi tiết dự án, tạo dự án | ✅ |
| 2 | Một form có validation chạy được | `/projects/new` + `lib/validate-project.ts` *(nay ở `shared`)* | ✅ |
| 3 | Dùng mock data | `lib/mock-data.ts` *(nay ở `shared`)* qua [`lib/api.ts`](../frontend/lib/api.ts) | ✅ |
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

**Blocker chính:** phần "human review" của mục 8 Course Guide **chưa hoàn thành**. Toàn bộ code màn hình do AI sinh trong một lượt; Khanh là chủ sở hữu phần frontend nên phải đọc lại và sửa ít nhất những chỗ mình không tự giải thích được, trước buổi Thứ Sáu. Riêng An tuy phụ trách backend vẫn phải nắm được luồng màn hình, vì điểm "Student understanding" chiếm 2/10 và người bị hỏi là người được chọn ngẫu nhiên — không phải người viết code.
*Ba chỗ chắc chắn bị hỏi:* vì sao thanh tiến độ có hai lớp; vì sao `today` được truyền vào hàm validate thay vì gọi `new Date()` bên trong; vì sao validate ở trình duyệt vẫn chưa đủ.

**Rủi ro còn lại:** repo vẫn **chưa push lên GitHub** (`git remote -v` trống), nên chưa có Repository URL để nộp. Và món nợ từ tuần 1 vẫn còn: chưa phỏng vấn người dùng thật cho Homework 1B.

---

## Homework 3B — Complete frontend prototype

**Chủ sở hữu:** Võ Tuấn Khanh (frontend) · rà soát chéo: Phạm Văn Bảo An

### Checklist yêu cầu của đề bài

| # | Yêu cầu | Đã làm ở đâu | Trạng thái |
| :-- | :-- | :-- | :-- |
| 1 | Toàn bộ workflow chạy trên mock data hoặc mock API | 6 màn hình, chọn tài khoản mẫu để đóng 3 vai — xem "Luồng đã chạy qua giao diện" | ✅ |
| 2 | Định nghĩa endpoint kèm request/response mẫu | [`docs/api-contract.md`](api-contract.md) — ví dụ ghi lại từ backend thật, không viết tay | ✅ |
| 3 | ≥ 3 test tự động hoặc acceptance test có tài liệu | [`frontend/lib/api.test.ts`](../frontend/lib/api.test.ts): 8 test, cộng 27 test quy tắc dùng chung | ✅ |
| 4 | Hướng dẫn chạy frontend và nơi lưu cấu hình | README: mục "Chạy frontend" và "Cấu hình nằm ở đâu" | ✅ |
| 5 | Exact commit hash | _(điền `git rev-parse HEAD` lúc nộp)_ | ⬜ |

### Các màn hình

| Đường dẫn | Màn hình | Ai thấy gì |
| :-- | :-- | :-- |
| `/` | Danh sách dự án | Mọi người — chỉ dự án đã công khai |
| `/projects/new` | Tạo dự án | Người đã chọn tài khoản — tự động trở thành người điều phối |
| `/projects/[id]` | Chi tiết dự án | Khối thao tác đổi theo vai: gửi xác minh (điều phối, bản nháp), kết quả người gác cổng (người trong dự án), duyệt / trả lại (người xác minh), cam kết (người đã đăng nhập), đã bàn giao / xác nhận (theo quy tắc chuyển trạng thái) |
| `/projects/[id]/edit` | Sửa dự án | Người điều phối, khi còn bản nháp |
| `/verify` | Hàng chờ xác minh | Người xác minh |
| Góc trên bên phải | Chọn tài khoản mẫu, đặt lại dữ liệu | Mọi người |

> **Từ Homework 4B, mock mô tả dưới đây đã được thay bằng client `fetch` gọi backend thật**, và thanh "Chế độ demo" đã bị bỏ. Mock vẫn xem được trong commit `f2630a8`. Chi tiết: [week-04.md, phần 4B](week-04.md#homework-4b--integrated-and-deployable-non-ai-application).

### Mock tuân theo API contract như thế nào

[`frontend/lib/api.ts`](../frontend/lib/api.ts) có đúng một hàm cho mỗi endpoint trong contract, trả về cùng kiểu dữ liệu, và ném `ApiError` với **cùng mã HTTP và mã lỗi** mà backend trả về.

Điểm quan trọng: mock **không tự viết lại quy tắc**. Nó gọi thẳng các hàm trong `shared` — đúng những hàm backend gọi. Nên mock không thể "dễ tính" hơn server: nếu backend trả 422 `EXCEEDS_REMAINING` thì mock cũng vậy, với cùng câu thông báo.

Homework 4B chỉ cần thay thân từng hàm trong `lib/api.ts` bằng `fetch()`. Tên hàm, tham số và kiểu trả về giữ nguyên, nên không màn hình nào phải sửa.

### Thay đổi so với 3A

| Thay đổi | Lý do |
| :-- | :-- |
| Bỏ ô chọn "Người điều phối" trên form | Người điều phối phải là người đang đăng nhập. Để client tự chọn là cho phép mạo danh — backend cũng bỏ qua trường này |
| Tạo xong thì chuyển thẳng sang trang bản nháp, thay vì màn hình "thành công" | Bước tiếp theo của luồng là gửi xác minh, nút đó nằm ở trang dự án |
| Thanh tiến độ ghi thêm số **đã xác nhận** | *Đã bàn giao* là người đóng góp tự báo; chỉ *đã xác nhận* mới có người khác kiểm |
| Lỗi thao tác hiện kèm `HTTP 422 · EXCEEDS_REMAINING` | Để khi bảo vệ, chỉ vào màn hình là giải thích được mã lỗi |

### Luồng đã chạy qua giao diện

Chạy thật trên trình duyệt ngày 2026-09-14, bấm qua giao diện rồi đọc lại nội dung trang sau mỗi bước.

| # | Vai | Thao tác | Kết quả quan sát được |
| :-- | :-- | :-- | :-- |
| 1 | Khanh | Điền form tạo dự án "Góc đọc sách thiếu nhi khu phố 2", bấm tạo | Chuyển sang `/projects/c1d87fbf-…`, hiện khối "Bản nháp — chưa công khai"; form ghi người điều phối là Võ Tuấn Khanh |
| 2 | Khanh | Bấm **Gửi xác minh** | Nhãn đổi sang "Chờ xác minh", hiện khối "Người gác cổng — Đạt", khối bản nháp biến mất |
| 3 | Tâm | Bấm **Trả lại** khi chưa ghi lý do | Hiện lỗi "Trả lại dự án thì bắt buộc ghi lý do…" kèm `HTTP 422 · REASON_REQUIRED` |
| 4 | Tâm | Bấm **Duyệt và công khai** | Nhãn đổi sang "Đang kêu gọi", khối cam kết đóng góp xuất hiện |
| 5 | An | Cam kết **999** cuốn | Lỗi "Hạng mục này chỉ còn thiếu 200, không thể cam kết 999." kèm `HTTP 422 · EXCEEDS_REMAINING` |
| 6 | An | Cam kết **30** cuốn, bấm **Đã bàn giao** | Tiến độ `30/200 cuốn`; dòng của An chuyển "Đã bàn giao" và **không còn nút nào** — An không được tự xác nhận |
| 7 | Khanh | Thấy nút **Xác nhận** ở dòng của An, bấm | Dòng chuyển "Đã xác nhận"; chú thích "còn thiếu 170 cuốn · đã cam kết 30 · đã xác nhận 30" |
| 8 | Khanh | Đọc sổ ghi vết | Đúng 6 dòng: Khanh tạo → Khanh gửi xác minh → Tâm duyệt → An cam kết → An bàn giao → Khanh xác nhận |
| 9 | An | Mở `/verify` | "Không có quyền xem trang này — Chỉ người xác minh mới xem được hàng chờ xác minh." |

### Test tự động

```bash
npm test -w gomnang-frontend
```

| Test | Kiểm điều gì |
| :-- | :-- |
| danh sách công khai không lộ dự án đang chờ xác minh | Quyền xem |
| khách chưa đăng nhập tạo dự án → 401 | Xác thực |
| dữ liệu sai quy tắc → 422 kèm lỗi theo từng trường, giống backend | Contract lỗi |
| luồng đầy đủ: tạo → gửi xác minh → duyệt → cam kết → bàn giao → xác nhận | Toàn bộ workflow, kèm 3 lần bị từ chối đúng mã |
| người không phải người xác minh mở hàng chờ → 403 | Phân quyền |
| bản nháp bị ẩn với người ngoài dự án → 404 | Không lộ dữ liệu chưa xác minh |
| chế độ "máy chủ lỗi" → 503 và không ghi gì vào dữ liệu | Trạng thái lỗi không làm bẩn dữ liệu |
| dữ liệu giữ lại giữa các lần gọi, đặt lại thì về dữ liệu mẫu | Kho dữ liệu giả |

Kết quả lần chạy cuối: **8/8 pass**.

### Giới hạn đã biết

- **Giao diện chưa phải thiết kế cuối.** Khanh sẽ làm lại phần hình thức; logic nằm tách riêng trong `lib/` và `shared` nên đổi giao diện không đụng tới quy tắc.
- Chưa có đăng nhập thật: người dùng chọn tài khoản mẫu. Homework 4B đổi sang token từ `POST /api/auth/dev-login`.
- Dữ liệu giả nằm trong localStorage — mở trình duyệt khác sẽ thấy lại dữ liệu mẫu.
- Mock bỏ qua phần kiểm định dạng request (tầng 400 của backend), vì form luôn gửi đúng định dạng.
- Thanh "Chế độ demo" phải gỡ khỏi bản deploy.

### Blocker 3B

Toàn bộ code 3B do AI sinh. **Khanh phải rà soát trước buổi Thứ Ba** — và vì lớp hỏi ngẫu nhiên, An cũng phải trả lời được: *vì sao ẩn nút "Xác nhận" với người đóng góp là chưa đủ, và chỗ nào mới thật sự chặn?* (đáp án: `canTransitionContribution` trong domain, chạy ở cả mock lẫn backend).
