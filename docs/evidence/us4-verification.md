# US-4 — bằng chứng kiểm tra hồi quy và mẫu human review

Cập nhật: 25/10/2026 (Asia/Saigon). Nhánh `Khanh_Newtech`, sau commit US-5 **9808eae**. Môi trường: Windows 11, Node.js 22.21.0, Next.js 16.3.5; E2E dùng DB test cô lập.

**Trạng thái:** Chức năng chính đã có từ trước (gửi xác minh, hàng chờ, người gác cổng theo quy tắc, duyệt hoặc trả lại). Đợt này kiểm hồi quy sau các thay đổi US-8 (khung Người gác cổng có thêm đánh giá AI), US-2 (xoá bản nháp) và US-3 (danh sách công khai mới). Bổ sung test cho luồng trả lại rồi gửi lại, trước đây chưa có test. Chờ người kiểm điền human review.

## 1. Kết quả kỹ thuật đã có

| Phép kiểm                  | Kết quả thực tế                                                                                                                                                                                                       | Giới hạn                                     |
| :------------------------- | :-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :------------------------------------------- |
| `npm.cmd test`             | **156/156 đạt**: 54 domain, 75 backend, 27 frontend                                                                                                                                                                   | Backend dùng PGlite test                     |
| `npm.cmd run typecheck`    | **Đạt**                                                                                                                                                                                                               | Backend và frontend                          |
| `next build`               | **Đạt**                                                                                                                                                                                                               | Build ra thư mục tạm; chưa chứng minh deploy |
| `npm.cmd run test:e2e`     | **11/11 đạt** ở hai lần chạy liền nhau. Lần chạy đầu 10/11: một ca hết thời gian chờ khi máy đang tải nặng (cả lượt mất 4 phút thay vì khoảng 3 phút); file lỗi bị lần chạy sau ghi đè nên không xác định được ca nào | E2E dùng DB test cô lập                      |
| Test có bắt được lỗi không | Tạm bỏ kiểm xung đột lợi ích trong `canReviewProject` → test API "người xác minh không được duyệt dự án mà chính mình điều phối" đỏ. Đã khôi phục code; phần kiểm trùng trong test mới đã bỏ                          | Kiểm bằng tay một lần                        |

### Truy vết tiêu chí US-4

| Tiêu chí                                         | Bằng chứng tự động                                                                                                                                                                                                                                                                                                                                                                                                               | Cần xác nhận thủ công |
| :----------------------------------------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :-------------------- |
| A1 — gửi xác minh lưu nhất quán                  | [API test](../../be/tests/integration/api.test.ts) "luồng đầy đủ": gửi → `pending_verification`, có assessment và gợi ý dự án tương tự; gửi lần hai 409; dự án chờ không hiện công khai                                                                                                                                                                                                                                          | H1                    |
| A2 — đúng người duyệt, trả lại có lý do          | API test: không phải verifier 403 `NOT_VERIFIER`; verifier tự điều phối 403 `CONFLICT_OF_INTEREST`; trả lại không lý do 422 `REASON_REQUIRED`. **Mới:** "US-4 trả lại có lý do" — về `draft` kèm lý do, sổ ghi vết `draft → pending_verification → draft (lý do)`, rời hàng chờ, sửa rồi gửi lại được                                                                                                                            | H2, H3, H5            |
| A3 — checklist, nguồn đánh giá, người quyết định | [AssessmentPanel](../../fe/src/presentation/modules/verification/components/AssessmentPanel.tsx) ghi "Kiểm tra theo quy tắc, chưa dùng AI" hoặc "Quy tắc kết hợp đánh giá bằng mô hình AI"; E2E US-8 kiểm hai dòng này. **Mới:** [E2E](../../fe/e2e/project-flow.spec.ts) "US-4": bấm trả lại không lý do thấy lỗi, nhập lý do, dự án rời hàng chờ, người điều phối thấy "Người xác minh đã trả lại dự án" kèm lý do rồi gửi lại | H2, H4                |

## 2. Human review

**Người kiểm BE:** [Tên]  
**Người kiểm FE:** Khanh
**Ngày/giờ:** 26/10/2026, giờ Việt Nam (GMT+7)
**Môi trường:** frontend `http://localhost:3000`, backend `http://localhost:4000`, DB Supabase của An (migration 0015), Ollama `qwen3:4b`
**Commit hoặc working tree:** `a704457` (Khanh_Newtech sau khi gộp An_Newtech); review có hướng dẫn `fe/scripts/human-review.mjs`
**Dữ liệu thử:** tài khoản mẫu Võ Tuấn Khanh, Nguyễn Thị Mai, Trần Văn Hùng, Phạm Văn Bảo An; một tài khoản người xác minh của DB An do người kiểm tự đăng nhập; dự án thử tên "HR …"

Chuẩn bị: Khanh đăng nhập bằng "Dùng tài khoản mẫu"; verifier đăng nhập bằng mật khẩu ở file local `be/.data/test-accounts.local.md` (không commit).

| Ca                      | Thao tác và kết quả mong đợi                                                                                                                                                   | Kết quả thực tế | Trạng thái | Ghi chú                          |
| :---------------------- | :----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :-------------- | :--------- | :------------------------------- |
| H1 — Gửi xác minh       | Khanh tạo bản nháp → "Gửi xác minh" → nhãn đổi "Chờ xác minh", khung Người gác cổng hiện kết quả theo quy tắc; dự án chưa có trên trang chủ                                    | Khanh gửi xác minh → nhãn "Chờ xác minh"; Khanh không thấy nút "Đánh giá bằng AI" | Pass | Ảnh [US4-H1_US8-H1a.png](human-review/2026-10-26/US4-H1_US8-H1a.png) chụp lúc nút còn "Đang gửi…"; trạng thái chờ xác minh thấy ở bước H2 |
| H2 — Trả lại có lý do   | Verifier mở `/verify` → chọn dự án → bấm "Trả lại cho người điều phối" khi chưa ghi lý do → báo lỗi bắt buộc ghi lý do. Ghi lý do → trả lại → dự án rời hàng chờ               | Bấm trả lại khi chưa ghi lý do → "Trả lại dự án thì bắt buộc ghi lý do…" (HTTP 422 `REASON_REQUIRED`); ghi lý do → dự án rời hàng chờ | Pass | Ảnh [H2a](human-review/2026-10-26/US4-H2a_US8-H1b.png), [H2b](human-review/2026-10-26/US4-H2b.png), [H2c](human-review/2026-10-26/US4-H2c.png) |
| H3 — Sửa và gửi lại     | Khanh mở dự án → thấy "Người xác minh đã trả lại dự án" và lý do → sửa → "Gửi xác minh" → dự án quay lại hàng chờ                                                              | Khanh mở lại thấy "Người xác minh đã trả lại dự án" và lý do; gửi lại → "Chờ xác minh", dự án về hàng chờ | Pass | Không sửa nội dung trước khi gửi lại. Ảnh [H3a](human-review/2026-10-26/US4-H3a.png), [H3b](human-review/2026-10-26/US4-H3b.png) |
| H4 — Duyệt và công khai | Verifier "Duyệt và công khai" → dự án "Đang kêu gọi", tìm thấy trên trang chủ                                                                                                  | Đánh dấu đủ 5 điểm → "Đã kiểm 5/5", nút "Duyệt và công khai" bật; duyệt → "HR xác minh 48859" đang kêu gọi trên trang chủ | Pass | Người kiểm tự bấm duyệt lúc script dừng và xác nhận đã kiểm H4a/H4b. Ảnh [H4a](human-review/2026-10-26/US4-H4a.png); không có ảnh H4b |
| H5 — Không tự duyệt     | Verifier tạo dự án của chính mình, gửi xác minh → mở từ hàng chờ → không có nút duyệt, có câu giải thích xung đột lợi ích                                                      | Người xác minh mở "HR verifier tự làm 83056" do chính mình tạo: khung "Quyết định xác minh" không cho duyệt | Pass | Người kiểm xem trực tiếp, không báo lỗi; ảnh [US4-H5.png](human-review/2026-10-26/US4-H5.png) chỉ chụp phần đầu khung |
| H6 — Đọc source         | Giải thích: `canSubmitProject`/`canReviewProject` trong domain → service khoá dòng dự án, đổi trạng thái và ghi sổ trong một transaction → FE chỉ hiện nút khi domain cho phép | [Điền]          | Chưa kiểm | BE và FE mỗi người tự giải thích |

**Lỗi phát hiện / cách xử lý:** Không phát hiện lỗi của app trong các ca đã kiểm. Script review có 3 lỗi đã sửa trong lúc chạy: chọn loại nhu cầu "Tiền" sai vai trò (radio), bỏ qua nút khi trang chưa vẽ xong, bấm vào chữ không phải link ở "Việc của tôi". Ghi nhận thêm: 7 dự án thử "HR …" được người kiểm đổi `status` thành `cancelled` bằng Supabase Table Editor để dọn cảnh báo trùng tên; thao tác này không qua app nên không có dòng trong sổ ghi vết
**Ca chưa kiểm và lý do:** H6 đọc source: chưa ghi phần giải thích
**Kết luận US-4:** Đạt các ca thao tác H1–H5; chờ H6 đọc source
**Xác nhận BE:** [Tên, ngày, phần đã tự đọc/giải thích]  
**Xác nhận FE:** [Khanh, 26/10/2026, phần đã tự đọc/giải thích]

Sau khi điền, ghi tóm tắt bằng một entry mới trong [AI_USAGE.md](../../AI_USAGE.md), không sửa entry cũ.

## 3. Giới hạn hiện tại

- **Chưa thông báo cho người điều phối** khi dự án bị trả lại; họ phải tự mở dự án hoặc xem "Việc của tôi".
- **Người gác cổng theo quy tắc** chỉ bắt lỗi hình thức và dự án trùng tên; phần đọc nội dung bằng AI là US-8.
- **Chưa có human review**, tên và ngày xác nhận.
