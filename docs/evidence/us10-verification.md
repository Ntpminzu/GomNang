# US-10 — SSE bảng đóng góp

Ngày cập nhật: 26/10/2026 (Asia/Saigon).

Trạng thái: có implementation và checks local; chưa nghiệm thu con người hoặc container/deploy.

## Phạm vi

- Tạo, bàn giao, xác nhận, hủy đóng góp và hủy cam kết dây chuyền cập nhật bảng của người xem cùng dự án qua SSE.
- Chỉ bảng đóng góp nhận dữ liệu mới: dòng/trạng thái/ghi chú/quyền thao tác. Không cập nhật tiến độ/tổng/nhãn tab bằng SSE; thao tác cục bộ giữ reload hiện có.
- Mở tab/nối lại lấy snapshot mới, một request tại một thời điểm và tải thêm nếu có sự kiện trong lúc request chạy. Không lưu lịch sử/replay.
- Bearer header, guest theo quyền hiện có; auth/access loss bỏ bảng cũ, lỗi tạm thời giữ bảng và báo chưa đồng bộ.
- Một BE instance, bus trong RAM; không migration/seed/chuyển dữ liệu live.

## Kiểm tra tự động

Các test dùng database cô lập/PGlite tạm, không chứng minh tích hợp Supabase hoặc deploy. Kiểm trên working tree chưa commit.

| Kiểm tra | Kết quả quan sát |
| --- | --- |
| `npm.cmd test` | PASS: domain 42, backend 111, frontend 26; tổng 179 test |
| `npm.cmd run typecheck` | PASS backend và frontend |
| `npm.cmd run build` | PASS Next production build |
| `node --test be/tests/integration/contributions-events.test.ts` | 3/3 PASS: bus/app/project isolation; HTTP quyền/transaction/transitions/thu hồi phiên/cascade; heartbeat/permission/DB failure/rotation/backpressure/cleanup |
| FE unit | SSE UTF-8/CRLF chia theo byte, control/error, dự án sai, caller abort và dọn delay; nằm trong 26 test frontend |
| E2E hai phiên qua Next rewrite | Tạo/bàn giao/xác nhận/hủy, ghi chú, không navigation, nhãn tab không đổi và không lẫn dự án: PASS |
| E2E lỗi/mất kết nối | Mất mạng/mở lại tab, reconnect và restart backend giữ DB tạm: PASS |
| E2E snapshot chậm/lỗi | Giữ bảng cũ khi lỗi GET, retry, nhận sự kiện trong lúc request cũ chờ và tải lại không mất dòng: PASS |
| E2E bảng rỗng/cascade | Private guest 404, public empty nhận dòng đầu tiên, hủy dự án cập nhật dòng cancelled nhưng nhãn tab giữ cũ: PASS |
| E2E kết nối dài | Mở 130 giây, quan sát ít nhất hai request SSE mới qua các lần rotation, sau đó tạo đóng góp vẫn cập nhật: PASS |
| Hồi quy browser | 3 ca auth-flow và 2 ca project-flow: PASS trong lượt chạy cùng US10 |
| `graphify update .` | PASS: 1893 nodes, 6593 edges; graph code đã cập nhật. SQL không được extract do thiếu tree_sitter_sql; đợt này không sửa SQL |

Lệnh browser: `npm.cmd run test:e2e -w gomnang-web -- contributions-realtime.spec.ts project-flow.spec.ts auth-flow.spec.ts`; các ca bổ sung/chạy lại chọn bằng `--grep`/`--grep-invert`. Lượt cuối `npm.cmd run test:e2e -w gomnang-web -- contributions-realtime.spec.ts --grep-invert "Next proxy remains"` đạt 4/4 trong 47,2 giây; ca 130 giây và 5 ca hồi quy đã đạt ở lượt trước. Kết quả browser ở trên là các ca đã quan sát đạt qua nhiều lượt, không phải một lượt duy nhất chạy tất cả ca. FE 3100, BE 4100, dữ liệu tạm độc lập; không dùng seed hoặc reset database ứng dụng/live.

Các lỗi trong quá trình kiểm tra đã xử lý: lần `npm.cmd test` đầu có một tiến trình backend test chết native khi chạy song song trong sandbox; chạy toàn BE tuần tự đạt, sau đó chạy lại lệnh root ngoài sandbox đạt đủ 179. Windows sandbox chặn taskkill trong E2E nên lượt browser hoàn chỉnh chạy ngoài sandbox; fixture restart được đổi sang IPC shutdown để đóng PGlite/nhả khóa, và không bootstrap trùng admin khi khởi động lại. Ca bảng rỗng dùng người đóng góp khác người điều phối theo đúng luật hiện có. Một lượt typecheck đọc file validator E2E đang được generate bị lỗi; đã dọn riêng thư mục types sinh tự động sau khi dừng E2E và chạy lại typecheck/build đạt.

## Nghiệm thu người dùng và bản demo — chưa hoàn tất

| Ca | Mong đợi | Quan sát thực tế | Trạng thái | Ghi chú |
| --- | --- | --- | --- | --- |
| H1: hai tài khoản cùng dự án, A tạo đóng góp | B thấy dòng committed không reload | Chưa ghi nhận | PENDING_USER | |
| H2: bàn giao/xác nhận/hủy | B thấy đúng trạng thái, ghi chú, nút hợp lệ | Chưa ghi nhận | PENDING_USER | |
| H3: mất mạng/nối lại và restart backend | Tự đồng bộ đủ dữ liệu, không trùng dòng | Chưa ghi nhận | PENDING_USER | |
| H4: quyền xem/đổi tài khoản | Không lộ dữ liệu dự án riêng hoặc giữ dữ liệu phiên cũ | Chưa ghi nhận | PENDING_USER | |
| H5: phạm vi chỉ bảng | Tổng/tiến độ/nhãn tab không đổi bởi SSE | Chưa ghi nhận | PENDING_USER | |
| H6: container/deploy một instance, mở hơn 125 giây rồi tạo đóng góp | SSE xuyên proxy, nối lại và cập nhật được | Chưa ghi nhận | PENDING_DEPLOY | |

Giới hạn: dữ liệu ngoài bảng có thể cũ đến khi tải lại; khi tab Đóng góp không mở thì không giữ stream, khi quay lại luôn lấy snapshot mới. `docs/ai-design.md` và `docs/us7-phase1.md` còn tham chiếu hướng streaming US10 cũ, chưa chỉnh trong phạm vi tài liệu đã chọn.
