# US7 — Kiểm chứng sau tinh gọn, 26/10/2026

**Cập nhật nghiệm thu mới nhất 26/10: US7 đã đóng công việc theo quyết định người dùng.** Người dùng xác nhận 20/20 bộ [manual-live-v1](us7-manual-evaluation.md) đạt, tắt Ollama vẫn dùng nghiệp vụ bình thường và mở lại chat thành công. Đây là xác nhận thủ công, không phải kết quả model do trợ lý chạy. Hồ sơ chưa có số liệu baseline riêng/cách thử injection gián tiếp và output/ID log từng ca; không tự điền các phần đó. Các dòng NOT_RUN bên dưới mô tả bộ snapshot/các mốc kiểm tra cũ, không phải phủ nhận lượt người dùng vừa xác nhận.

Prompt cập nhật v5 cho M12: làm rõ thiếu dữ kiện thì refused dù đã tìm đúng dự án; query prompt vẫn v1, không đổi retrieval/dataset/expected. 17/17 targeted tests RAG/output/retrieval/security đạt ([log](prompt-v5-tests.txt)); chưa chạy Qwen thật sau v5, chưa kết luận đã hết dao động trạng thái hoặc có pass rate after mới.

Cập nhật sau đổi schema log: [request_id tự tăng, 162 tests và triển khai Supabase](chat-log-sequence-verification.md). Bản mới không còn UUID id/lifecycle/embedded_documents hoặc mã tra cứu UI. Các kết quả 160 tests và mô tả mã tra cứu ở mốc cũ bên dưới vẫn giữ làm lịch sử, không thay thế báo cáo mới.

Phiếu dành cho người dùng tự thử trên DB thật: [20 câu và bảng điền trước/sau](us7-manual-evaluation.md). Bộ thủ công dùng hai dự án công khai và nguồn index đã kiểm READ ONLY ngày 26/10; chưa có kết quả người dùng. Đây là bộ riêng, không ghi đè kết quả/dataset snapshot hoặc coi như đã nghiệm thu injection gián tiếp.

Phạm vi: workspace tests, typecheck/build, E2E chat và chốt dataset evaluation. Không sửa thuật toán RAG hoặc prompt trong đợt kiểm tra này. Code nền: HEAD `05a539bf91486b1910d0e4134fd3996554edd9bf` cộng working-tree diff của các đợt tinh gọn; không phải chỉ commit đó đã được kiểm. Chưa tạo commit mới.

## Kết quả quan sát

Các kết quả dưới đây thuộc từng lượt kiểm tra đã ghi ngày/phạm vi. Xem các cập nhật nghiệm thu và schema ở đầu tài liệu cho trạng thái mới hơn.

| Lệnh/kiểm tra | Kết quả | Bằng chứng |
| :-- | :-- | :-- |
| `npm.cmd test` | Exit 0; domain 42/42, backend 95/95, frontend 23/23; tổng 160 PASS, 0 FAIL, 0 skipped/cancelled | [Raw tests](us7-2026-10-26/tests.txt) |
| `npm.cmd run typecheck` | Exit 0; BE tsc, FE next typegen + tsc | [Raw typecheck](us7-2026-10-26/typecheck.txt) |
| `npm.cmd run build` | Exit 0; production build Next hoàn tất | [Raw build](us7-2026-10-26/build.txt) |
| `npm.cmd run test:e2e -- chat-flow.spec.ts`, lượt đầu | Exit 1; 3 pass/1 failed do afterAll không dừng được cây process trên Windows: Access denied | [Raw lượt đầu](us7-2026-10-26/e2e-initial.txt) |
| E2E lượt hai, ngoài sandbox | Exit 1; 3 pass/1 failed, ca đổi chủ đề timeout khi tìm textbox sau thao tác mở chat | [Raw lượt hai](us7-2026-10-26/e2e-rerun.txt) |
| E2E lượt cuối, chạy lại đủ file ngoài sandbox | Exit 0; 4/4 pass, 25,8 giây; setup/teardown hoàn tất | [Raw lượt cuối](us7-2026-10-26/e2e-final.txt) |
| Kiểm cấu trúc dataset `gomnang-us7-eval-v1` | JSON đọc được; 20 ID duy nhất, nhóm 8/4/6/2, 6 critical; expected status/facts đầy đủ và message trong giới hạn | [Dataset](../evaluation/us7-v1.json) |

Không che hai lượt E2E lỗi bằng kết quả cuối. Lỗi mở chat ở lượt hai không lặp lại trong lượt cuối; nguyên nhân chưa xác định, chưa sửa code UI hoặc tăng timeout để làm xanh test. Còn rủi ro E2E gián đoạn, không khẳng định luồng luôn ổn định chỉ từ một lượt đạt. Cảnh báo NO_COLOR/FORCE_COLOR xuất hiện cả lượt đạt; đó không phải assertion lỗi.

Sau E2E, chạy lại typecheck để kiểm route types do Next sinh: exit 0; xem [log typecheck cuối](us7-2026-10-26/typecheck-final.txt). Next tự cập nhật `fe/next-env.d.ts` sang `.next/types`; không sửa logic ứng dụng để làm test đạt.

## Những hành vi được test

- Unit/integration: input/history/source guards; public contact; output JSON/secret/prompt/citation; retrieval/index thủ công; nguồn cũ và quyền công khai; một thời hạn chung, hủy đọc body; một metadata tổng kết, lỗi log không đổi kết quả chat. Workspace còn chạy hồi quy nghiệp vụ/auth/domain/FE.
- E2E qua browser/Next proxy/backend: trả lời có nguồn và mở link, câu nối tiếp, lỗi provider → giữ câu hỏi/thử lại/sửa, đổi sang React → từ chối, injection trộn → từ chối và không đưa cặp refused vào history lần hỏi hợp lệ tiếp theo.
- Backend tests dùng PGlite RAM/thư mục tạm và fixture model/vector. E2E helper dùng cổng FE 3100/BE 4100, DB PGlite tạm, `DATABASE_URL` rỗng và model fixture. Không nạp .env/ghi index/migrate/seed DB thật của người dùng.

## Evaluation và giới hạn nghiệm thu

Đã chốt [20 câu, snapshot và rubric](../evaluation/us7-v1.md): 8 thường, 4 biên, 6 an toàn critical, 2 ngoài phạm vi; có hai injection trực tiếp, một injection qua cache nguồn, hai OOS. Đạt khi ít nhất 18/20 và 6/6 critical. Đó là điều kiện đã chốt, chưa phải kết quả đo.

SHA256 dataset JSON tại lúc chốt: `4100DD9C852E0E03143C2769D3D70BFAD49D3909F28936084822E21532A29242`.

**Qwen thật: baseline NOT_RUN, after NOT_RUN, pass rate N/A.** Không cộng 160 regression tests hoặc 4 E2E vào pass rate AI. Dataset có expected facts/source/status; chưa có runner model thật, raw outputs hoặc người chấm xác nhận.

Chưa chứng minh integration Supabase/pgvector và Ollama thật của bản này, chất lượng trả lời đúng nguồn, demo tắt Ollama nhưng non-AI vẫn hoạt động trên môi trường thật hoặc toàn US7 đã hoàn thành. Nghiệm thu US7 còn cần chạy bộ 20 ca với nguồn/model thật trong môi trường evaluation cô lập, cải tiến một yếu tố, chạy lại và báo số liệu trước/sau.

<a id="migration-0012-history"></a>
## Lịch sử triển khai migration 0012

Ghi nhận triển khai ngày 26/10/2026: `0012_us7_chat_requests` thêm bảng log riêng, không reset/seed hoặc sửa dữ liệu nghiệp vụ. Runner tại mốc đó báo committed, journal **13 migrations**; đã kiểm RLS/quyền/index/cột, bảng log mới rỗng và count/checksum của **11 bảng cũ không đổi**. Trước triển khai có **28 projects, 10 users, 26 chat_chunks**; đây là snapshot tại mốc triển khai, không phải số lượng hiện tại.

Backup `be/.data/supabase-us7-2026-10-25T17-57-43-956Z/` gồm `application.dump`, `manifest.json`, `result.json`. Archive custom bao gồm public+drizzle, mục lục/bảng dữ liệu đã được kiểm bằng `pg_restore --list`; **chưa diễn tập restore**, không phải backup toàn bộ nền tảng Supabase. Tên thư mục theo UTC, ngày ghi nhận theo Việt Nam. Backup giữ ngoài Git.

Lệnh lịch sử đã dùng là `npm.cmd run db:deploy:us7 -w gomnang-api -- --apply`. Runner và lệnh npm này đã được retire trong đợt dọn repo; không hướng dẫn chạy lại trên checkout hiện tại. SQL 0012, snapshots/journal và test migration vẫn giữ. PostgreSQL startup chỉ kiểm journal/hash, không tự apply DDL; PGlite tự migrate riêng khi mở.

Schema ở mốc 0012 dùng UUID/correlation ID và pending/completed. Migration 0013 sau đó đã thay bằng request_id số và bỏ các cột thừa; xem [báo cáo 0013](chat-log-sequence-verification.md). Không dùng mô tả hoặc kết quả 0012 để suy schema hiện tại, khả dụng model hoặc nghiệm thu toàn US7.
