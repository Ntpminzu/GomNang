# US-9 — Bằng chứng kiểm chứng, 26/10/2026

Trạng thái: đã hiện thực và cập nhật Supabase; chờ nghiệm thu của người dùng. Không xử lý Render. Tests fixture/PGlite không chứng minh toàn bộ integration thật; bằng chứng pg/Ollama được ghi riêng bên dưới.

## Kết quả tự động

| Kiểm tra | Kết quả quan sát |
| --- | --- |
| `npm.cmd test` | 173/173: domain 42, BE 108, FE 23 |
| `npm.cmd run typecheck` | BE và FE qua |
| `npm.cmd run build` | Qua, có route /admin/ai-usage |
| Migration PGlite | 3/3, gồm bảo toàn metadata 0014, NULL, RLS và identity |
| E2E US9 | 4/4: admin/filter/render/error/retry/mobile, stale response, guest, user/verifier |
| E2E auth | 3/3 hồi quy |
| E2E chat | 4/4 sau khi chờ khởi tạo phiên; toàn bộ lượt xác nhận admin/auth/chat đạt 11/11 |

Nhật ký: [tests cuối](us9-2026-10-26/us9-tests-final.txt), [typecheck](us9-2026-10-26/us9-typecheck-final.txt), [build](us9-2026-10-26/us9-build.txt), [migration tests](us9-2026-10-26/us9-migration-tests.txt), [E2E xác nhận 11/11](us9-2026-10-26/us9-e2e-verified.txt), [Graphify cuối](us9-2026-10-26/us9-graphify-final.txt), [ảnh mobile](us9-2026-10-26/ai-usage-mobile.png). Các lượt E2E lỗi trước đó vẫn được giữ trong thư mục bằng chứng để đối chiếu.

Lượt E2E đầu có selector trùng route-announcer của Next.js và sandbox chặn cleanup server Windows; selector mới đã sửa và chạy lại ngoài sandbox. Lượt mở rộng 11 ca đạt 10/11, ca mở nguồn /help gặp 404 dù file trang tồn tại. Giữ thư mục build E2E cũ dưới tên `.next-e2e-us9-before-rerun` và chạy lại chat với build mới; không sửa logic chat hay trang help để né test.

Sau khi bỏ cache cũ, ca /help qua. Các lượt tiếp có timeout rải rác khi mở widget: source cho thấy widget có key theo revision của phiên và có thể remount khi bootstrap phiên hoàn tất. Tests chat được bổ sung chờ link Đăng nhập (chỉ hiện khi ready) trước khi mở widget; không thêm sleep hoặc đổi logic sản phẩm. Lệnh có `--grep` qua script npm lồng đã không lọc đúng và thực tế chạy cả bốn ca; giữ nguyên log này, không ghi nhận nhầm là focused pass. [Lượt xác nhận sau sửa prerequisite](us9-2026-10-26/us9-e2e-verified.txt).

## Supabase và Ollama thật

- Preview xác nhận baseline 14 migrations (0013), 58 dòng chat_requests. Không reset/seed/transfer dữ liệu.
- Apply 0014 commit thành công, journal đạt 15 migrations. Runner đối chiếu checksum 11 bảng nghiệp vụ và toàn bộ 58 metadata rows, trừ cột mới; dữ liệu không đổi. Cột embedding_tokens integer nullable, dữ liệu cũ NULL; PK/identity, RLS và quyền anon/authenticated được xác nhận.
- Backup public+drizzle: `be/.data/us9-embedding-tokens-2026-10-26T12-14-58-662Z/application.dump`. Đã kiểm danh mục bằng pg_restore; chưa diễn tập restore. [Kết quả runner](us9-2026-10-26/supabase-deployment.json).
- Runner chạy lại trả `already_current`, migrations 15.
- `node --env-file=be/.env be/scripts/verify-us9.ts` đọc thật qua pg: 58 request, 25 answered, 26 refused, 7 failed; origin/calls và tổng byReason khớp; trường số là number/null, recent 50.
- Backend local được khởi động lại, nối PostgreSQL trên cổng 4000.
- Một câu hỏi hướng dẫn thật qua `/api/chat` trả 200, answered/RAG_ANSWERED, generatedByModel=true. Sau đó pg smoke đọc 59 request, 26 answered/26 refused/7 failed; embedding tổng 41, mẫu số 1, trung bình 41 token/request đo được. 58 log lịch sử vẫn không bị gán token embedding giả.
- Generation sau smoke: tổng 125911 token, mẫu số 39. Đây là số liệu tại thời điểm kiểm tra, có thể thay đổi khi có chat mới.

## Nghiệm thu người dùng — chưa hoàn tất

| Ca | Mong đợi | Quan sát thực tế của người review | Trạng thái | Ghi chú |
| --- | --- | --- | --- | --- |
| H1: đăng nhập admin, mở Mức sử dụng AI | Xem số liệu thật, khoảng và đơn vị rõ | Chưa ghi nhận | PENDING_USER | |
| H2: đổi preset/ngày Việt Nam | Số liệu và khoảng áp dụng tương ứng | Chưa ghi nhận | PENDING_USER | |
| H3: kiểm 1 lượt chat với metadata/tokens | Số đo thật hoặc — khi thiếu, không bịa 0 | Chưa ghi nhận | PENDING_USER | |
| H4: user/verifier/guest | Không xem được dashboard hoặc API admin | Chưa ghi nhận | PENDING_USER | |
| H5: empty/error/retry và mobile | Trạng thái dễ hiểu, thao tác được | Chưa ghi nhận | PENDING_USER | |

Chi phí API và TB/request không áp dụng (local), chưa đo chi phí điện/phần cứng. Tools N/A cho pipeline hiện tại; cần rà lại với US8. Ghi log best-effort, không bao gồm mọi request bị parser chặn trước middleware. Không coi checks này là nghiệm thu con người hoặc deploy Render/Vercel.

Graphify đã cập nhật graph/HTML/report thành công; SQL thiếu parser tree_sitter_sql nên được kiểm trực tiếp bằng SQL, tests migration và runner Supabase. Không cài thêm dependency cho graph.
