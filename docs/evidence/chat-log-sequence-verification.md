# Kiểm chứng đổi chat request_id tự tăng — 26/10/2026

Theo xác nhận người dùng: chỉ request_id số làm khóa chính, bỏ UUID id/lifecycle/embedded_documents, không hiện mã trên UI và tiếp tục ghi log nền. Sau khi duyệt tự động yêu cầu làm rõ quyền thay DB thật, người dùng xác nhận rõ **cho phép áp dụng trực tiếp lên DB thật sau backup**; migration đã được chạy theo phạm vi đó.

## Tự động

| Kiểm tra | Kết quả | Log |
| :-- | :-- | :-- |
| `npm.cmd test` | 162/162: domain 42, backend 97, frontend 23; 0 fail | Tests |
| `npm.cmd run typecheck` | Exit 0 | Typecheck |
| `npm.cmd run build` | Exit 0 | Build |
| E2E `chat-flow.spec.ts` | 4/4, exit 0; teardown hoàn tất; kiểm UI không có mã tra cứu khi trả lời và lỗi | E2E |

Hai ca migration mới kiểm giữ metadata/đánh số/thêm đồng thời và từ chối pending chưa hoàn chỉnh. API kiểm số request_id tăng, response không có requestId và row không còn ba cột đã bỏ. Những kiểm tra này dùng DB cô lập và fixture; không chứng minh chất lượng Qwen thật.

## Supabase thật

Runner: `npm.cmd run db:deploy:chat-log -w gomnang-api -- --apply`, migration `0013_chat_log_sequence`.

- Preflight ban đầu có 36 log; đến lúc khóa và backup có 38 do phát sinh lượt hỏi. Migration giữ **38/38**, đánh số **1..38** theo started_at rồi UUID cũ.
- Archive `be/.data/chat-log-sequence-2026-10-26T10-10-02-516Z/application.dump`, 200747 bytes; pg_restore đọc mục lục thành công, đủ TABLE DATA của public và drizzle liên quan. Manifest chứa snapshot checksum và mapping old_id/old_request_id → new_request_id; result ghi commit thành công. Thư mục .data không đưa vào Git.
- Hash/count của mọi metadata còn giữ không đổi. Hash/count của cả 11 bảng nghiệp vụ, bao gồm chat_chunks, không đổi trong transaction triển khai. Không reset/seed/đổi nội dung dự án hoặc re-embed.
- Journal có 14 migration; request_id integer identity là khóa chính duy nhất. RLS giữ bật, không browser policy, anon/authenticated không có quyền bảng/sequence.
- Đọc lại sau COMMIT: count=38, distinct request_id=38, min=1, max=38; sequence last_value=38; không còn id/lifecycle/embedded_documents/legacy_request_id. Không insert log giả vào DB thật để thử sequence; hành vi insert/concurrent đã kiểm bằng fixture.
- Backup là public+drizzle của ứng dụng, không phải toàn bộ nền tảng Supabase. Chưa diễn tập restore archive; không hứa rollback không cần đối chiếu các log phát sinh sau migration.

## Sử dụng

Restart backend/frontend để các process đang chạy chuyển sang schema/contract mới; refresh Supabase Table Editor. Từ lượt ghi log tiếp theo DB tự cấp số mới (có thể khuyết số bình thường). UI và chat response không trả ID; HTTP logger/header chung vẫn độc lập, không lưu UUID đó vào bảng chat.

Phiếu tự thử đã chuyển sang ghi request_id từ DB, đối chiếu thời gian; giữ nguyên nội dung bằng chứng người dùng đã điền. Các mã UUID cũ chỉ dùng làm dấu vết lịch sử/mapping backup. Không tự coi row mới nhất là của mình khi có nhiều người chat đồng thời.
