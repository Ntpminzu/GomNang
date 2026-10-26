# US-5 — bằng chứng kiểm tra và mẫu human review

Cập nhật: 25/10/2026 (Asia/Saigon). Nhánh `Khanh_Newtech`, sau commit US-3 **dd5649c**. Môi trường: Windows 11, Node.js 22.21.0, Next.js 16.3.5, PGlite demo cục bộ; E2E dùng DB test cô lập.

**Trạng thái:** Người phụ trách tài chính tải ảnh hoặc PDF chứng từ thật, gắn vào khoản chi, và người có quyền xem lại ngay trong trang. Q-04 chốt ngày 25/10/2026 ở [ADR-006](../adr/006-receipt-storage.md). Chờ người kiểm điền human review; chưa đổi US-5 sang trạng thái nghiệm thu.

## 1. Kết quả kỹ thuật đã có

| Phép kiểm | Kết quả thực tế | Giới hạn |
| :-- | :-- | :-- |
| `npm.cmd test` | **154/154 đạt**: 54 domain, 73 backend, 27 frontend | Backend dùng PGlite test |
| `npm.cmd run typecheck` | **Đạt** | Backend và frontend |
| `next build` | **Đạt** | Build ra thư mục tạm; chưa chứng minh deploy |
| `npm.cmd run test:e2e` | **9/9 đạt**, gồm luồng US-5: thủ quỹ chọn ảnh PNG thật → "Đã tải" → ghi chi; khách mở chứng từ khi chờ duyệt thấy "Không tìm thấy file…"; người điều phối xem ảnh rồi duyệt; khách xem được ảnh sau khi duyệt | DB test cô lập |
| Test có bắt được lỗi không | Tạm cho `canViewReceipt` luôn trả đúng → test domain và test API đỏ ở câu "chưa gắn khoản chi: khách không xem được". Đã khôi phục code | Kiểm bằng tay một lần |
| Chạy thật trên app | Tài khoản mẫu Mai chọn ảnh PNG nhiễu 16,5 MB → trình duyệt thu về JPEG 1600×1200, **1005 KB**, tải xong sau khoảng 2 giây → ghi khoản chi 25 nghìn → "Xem chứng từ" hiện đúng ảnh 1600×1200. File khai là PNG nhưng nội dung là HTML → lỗi "Chỉ nhận ảnh JPG, PNG, WebP hoặc file PDF." hiện dưới ô chọn file, ô có `aria-invalid` | PGlite demo trên máy dev |
| Giao diện 375 px | Phát hiện và sửa: tên file dài làm hộp thoại rộng hơn màn hình. Sau khi sửa, đo DOM: hộp thoại 16–359 px trong khung 375 px, không phần tử nào tràn | Ảnh chụp của khung xem bị lệch tỉ lệ nên không lưu làm bằng chứng; dùng số đo DOM |
| Log máy chủ | `receipt uploaded` chỉ ghi dự án, file id, người tải, loại, kích thước; không ghi nội dung file | — |

### Truy vết tiêu chí US-5

| Tiêu chí | Bằng chứng tự động | Cần xác nhận thủ công |
| :-- | :-- | :-- |
| A1 — upload thật, metadata, liên kết nghiệp vụ | [API test](../../be/tests/integration/api.test.ts) "US-5 chứng từ": tải PNG trả `{ id, name, mime, size }`, đọc lại đúng từng byte, gắn vào khoản chi qua `receiptFileId`, chi tiết dự án trả `receipt` | H1, H2 |
| A2 — kiểm quyền/loại/kích thước, file riêng, lỗi không tạo liên kết | API test: khách 401, người điều phối tải 403, nội dung HTML khai là ảnh 415, file rỗng 400, 3 MB + 1 byte 413 `FILE_TOO_LARGE`, một file gắn hai khoản chi 422 `INVALID_RECEIPT_FILE`; quyền xem theo 3 trạng thái. [files tests](../../packages/domain/src/files.test.ts) nhận loại theo byte đầu và làm sạch tên file. Database có ràng buộc loại, kích thước và một file một khoản chi | H3, H4, H5 |
| A3 — FE chọn/tải/lỗi/mở, AI khi phù hợp | [E2E](../../fe/e2e/project-flow.spec.ts) US-5; [mock test](../../fe/tests/mock-api.test.ts): bản chạy thử kiểm quyền rồi báo 503 `UPLOAD_UNAVAILABLE`. AI chưa đọc file, xem §4 | H1, H6 |

## 2. Thiết kế đã chốt

- **Lưu ở đâu:** bảng `files` trong chính PostgreSQL. Render xoá ổ đĩa khi deploy lại, và nhóm chưa có khoá dịch vụ lưu file riêng.
- **Loại và kích thước:** JPEG, PNG, WebP, PDF, tối đa 3 MB. Backend nhận loại theo vài byte đầu file. Ảnh lớn hơn 3 MB được trình duyệt thu nhỏ trước khi gửi.
- **Ai tải:** người phụ trách tài chính, khi dự án đang kêu gọi hoặc đang thực hiện.
- **Ai xem:**

| Trạng thái chứng từ | Ai xem được |
| :-- | :-- |
| Chưa gắn khoản chi | Chỉ người tải lên |
| Khoản chi chờ duyệt hoặc bị từ chối | Người điều phối và người phụ trách tài chính |
| Khoản chi đã duyệt, dự án công khai | Mọi người, như sao kê công khai |

- **An toàn khi mở file:** máy chủ trả `nosniff`, `Content-Security-Policy: sandbox`, `Cache-Control: private, no-store`; không có quyền thì 404.

## 3. Human review

**Người kiểm BE:** [Tên]
**Người kiểm FE:** Khanh
**Ngày/giờ:** 26/10/2026, giờ Việt Nam (GMT+7)
**Môi trường:** frontend `http://localhost:3000`, backend `http://localhost:4000`, DB Supabase của An (migration 0015), Ollama `qwen3:4b`
**Commit hoặc working tree:** `a704457` (Khanh_Newtech sau khi gộp An_Newtech); review có hướng dẫn `fe/scripts/human-review.mjs`
**Dữ liệu thử:** tài khoản mẫu Võ Tuấn Khanh, Nguyễn Thị Mai, Trần Văn Hùng, Phạm Văn Bảo An; một tài khoản người xác minh của DB An do người kiểm tự đăng nhập; dự án thử tên "HR …"

Chuẩn bị: chạy lại backend sau khi lấy code mới để chạy migration 0015 (áp lên Supabase bằng `npm run db:deploy:khanh -- --apply`). Ở `/login`, mục "Dùng tài khoản mẫu": Mai (phụ trách tài chính dự án Hoa Mai), Khanh (điều phối Hoa Mai), Hùng (người ngoài). Mở dự án "100 phần cơm cho mái ấm Hoa Mai", tab "Thu chi".

Điền **kết quả thực tế** và **Pass / Fail / Chưa kiểm** sau khi tự thao tác.

| Ca | Thao tác và kết quả mong đợi | Kết quả thực tế | Trạng thái | Ghi chú |
| :-- | :-- | :-- | :-- | :-- |
| H1 — Tải ảnh và ghi chi | Mai → "Ghi khoản chi" → chọn một ảnh JPG → hiện "Đang tải chứng từ lên…" rồi "Đã tải: tên file · dung lượng" → nhập số tiền, nội dung → "Ghi khoản chi" → dòng mới có "Xem chứng từ", trạng thái "Chờ duyệt" | Mai chọn `hoa-don-gas.png` → "Đã tải: hoa-don-gas.png · …"; ghi chi 5 nghìn đồng → dòng "Chờ duyệt" có "Xem chứng từ" | Pass | Ảnh PNG 1×1 (70 byte), chưa thử ảnh JPG chụp thật. Ảnh [H1a](human-review/2026-10-26/US5-H1a.png), [H1b](human-review/2026-10-26/US5-H1b.png) |
| H2 — Ảnh lớn và PDF | Chọn ảnh chụp điện thoại trên 3 MB → vẫn tải được, tên đổi đuôi `.jpg`, dung lượng nhỏ hơn 3 MB. Chọn một file PDF nhỏ → tải được, xem trước hiện PDF | [Điền] | Chưa kiểm | Script chưa có ảnh trên 3 MB và file PDF; cần tự thử |
| H3 — Sai loại, quá lớn | Chọn file `.docx` hoặc `.txt` → báo "Chỉ nhận ảnh JPG, PNG, WebP hoặc file PDF.". Chọn PDF trên 3 MB → báo vượt quá 3 MB; không có dòng chi nào được tạo | File khai PNG nhưng nội dung là chữ → "Chỉ nhận ảnh JPG, PNG, WebP hoặc file PDF." ngay dưới ô chọn file | Pass | Mới thử một kiểu file sai; chưa thử `.docx`/`.txt` và PDF trên 3 MB. Ảnh [US5-H3.png](human-review/2026-10-26/US5-H3.png) |
| H4 — Quyền khi chờ duyệt | Hùng (hoặc chưa đăng nhập) mở tab Thu chi → bấm "Xem chứng từ" ở khoản vừa ghi → thấy "Không tìm thấy file, hoặc bạn không có quyền xem." | Khách chưa đăng nhập bấm "Xem chứng từ" khi khoản chi chờ duyệt → "Không tìm thấy file, hoặc bạn không có quyền xem." (HTTP 404 `FILE_NOT_FOUND`) | Pass | Thử bằng khách, chưa thử Hùng. Ảnh [US5-H4.png](human-review/2026-10-26/US5-H4.png) |
| H5 — Duyệt xong thì công khai | Khanh bấm "Xem chứng từ" → thấy ảnh → "Duyệt". Hùng tải lại trang → "Xem chứng từ" → thấy ảnh, có "Tải về máy" | Khanh xem ảnh, có "Tải về máy", bấm "Duyệt"; khách mở lại xem được ảnh; quỹ gas còn 295 nghìn đồng | Pass | DB: khoản chi `approved`, file `image/png` 70 byte. Ảnh [H5a](human-review/2026-10-26/US5-H5a.png), [H5b](human-review/2026-10-26/US5-H5b.png) |
| H6 — Người không giữ tiền | Khanh mở tab Thu chi → không có nút "Ghi khoản chi" (chỉ người phụ trách tài chính thấy). Gọi thẳng API tải file bằng phiên của Khanh → 403 `NOT_TREASURER` | Khanh không có nút "Ghi khoản chi"; gọi API tải file bằng phiên Khanh → 403 `NOT_TREASURER` | Pass | Ảnh [US5-H6.png](human-review/2026-10-26/US5-H6.png) chụp lúc trang còn tải; kiểm tự động bổ sung chụp lại [US5-H6-recheck.png](human-review/2026-10-26/US5-H6-recheck.png) (0 nút) và gọi API |
| H7 — Đọc source | Giải thích: ô chọn file → thu nhỏ nếu cần → `POST /api/projects/:id/receipts` (nội dung thô) → kiểm quyền, kích thước, byte đầu → lưu `files` → ghi chi với `receiptFileId` → `GET /api/files/:id` theo `canViewReceipt` | [Điền] | Chưa kiểm | BE và FE mỗi người tự giải thích |

**Lỗi phát hiện / cách xử lý:** Không phát hiện lỗi của app trong các ca đã kiểm. Script chụp H6 khi trang chưa tải xong, đã thêm bước chờ
**Ca chưa kiểm và lý do:** H2 (ảnh lớn, PDF) chưa thử; H3 mới thử một kiểu file sai; H7 đọc source chưa ghi
**Kết luận US-5:** Chờ kiểm bổ sung (H2, phần còn lại của H3, H7)
**Xác nhận BE:** [Tên, ngày, phần đã tự đọc/giải thích]  
**Xác nhận FE:** [Khanh, ngày, phần đã tự đọc/giải thích]

Sau khi điền, ghi tóm tắt bằng một entry mới trong [AI_USAGE.md](../../AI_USAGE.md), không sửa entry cũ. Chỉ đổi trạng thái US-5 trong [traceability.md](../traceability.md) và [backlog.md](../backlog.md) khi các ca bắt buộc đều đạt.

## 4. Giới hạn hiện tại

- **AI chưa đọc file.** Đề muốn file làm input AI "khi có thể"; capability AI thứ hai đã chọn làm việc trên văn bản, đọc ảnh/PDF cần năng lực đa phương thức.
- **File không gắn khoản chi** (tải lên rồi huỷ hộp thoại) vẫn nằm trong database, chỉ người tải xem được; chưa có việc dọn định kỳ.
- **Database phình theo số file.** Giới hạn 3 MB mỗi file; cần chuyển sang dịch vụ lưu file khi dung lượng lớn.
- **Bản chạy thử** trong trình duyệt không lưu file, báo 503 sau khi kiểm quyền.
- **Ảnh có thể chứa thông tin cá nhân** (số tài khoản, số điện thoại trên hoá đơn). Khi khoản chi được duyệt, ảnh công khai. Ô chọn file nhắc người phụ trách tài chính che thông tin trước khi tải; ứng dụng chưa tự che.
- **Migration 0013 chưa chạy trên Supabase.** Sẽ tự chạy khi backend production khởi động bản mới, sau khi nhóm cho phép merge vào main.
- **Chưa có human review**, tên và ngày xác nhận.
