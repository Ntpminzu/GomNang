# Chat log: request_id tự tăng

Quyết định người dùng: chỉ giữ `request_id` làm khóa chính số tăng dần do DB cấp; bỏ UUID `id`, `lifecycle`, `embedded_documents`. Giữ `model_calls` và `embedding_calls`. Ghi log nền sau response; không cần hiện ID trên UI.

- PostgreSQL/PGlite dùng integer `GENERATED ALWAYS AS IDENTITY`; ứng dụng không tạo UUID log hoặc dùng MAX+1. Số có thể khuyết và phản ánh thứ tự ghi log, không bảo đảm thứ tự bắt đầu hỏi khi chạy đồng thời.
- Chat response/error payload bỏ requestId, UI bỏ mã tra cứu cả khi answered/refused/failed. HTTP logger và header x-request-id chung vẫn dùng cho các module khác; UUID HTTP đó không phải request_id của bảng chat.
- Metadata chỉ chứa kết quả tổng kết. status/reasonCode/httpStatus/finishedAt/latencyMs bắt buộc có giá trị; không cần cột lifecycle lặp lại completed. Không ghi document embeddings trong lượt chat nên bỏ embedded_documents.

## Migration và dữ liệu cũ

`0013_chat_log_sequence.sql` chỉ thay bảng chat_requests. Các log hoàn chỉnh cũ nhận số 1..N theo started_at rồi UUID cũ để ổn định khi cùng thời điểm. Sequence tiếp tục từ N+1. Không xóa row hoặc suy diễn trạng thái của row pending: nếu có row thiếu kết quả, migration dừng để xem xét riêng.

Runner riêng, chạy từ root:

```powershell
npm.cmd run db:deploy:chat-log -w gomnang-api
npm.cmd run db:deploy:chat-log -w gomnang-api -- --apply
```

Lệnh đầu chỉ preview. Apply khóa dữ liệu ngắn hạn, tạo archive `public`+`drizzle` trong `be/.data/chat-log-sequence-<timestamp>/`, kiểm mục lục bằng pg_restore, lưu manifest cùng bảng đối chiếu UUID/request_id cũ → số mới. So checksum của mọi metadata còn giữ và 11 bảng nghiệp vụ trước/sau; sai thì rollback. Journal và RLS/quyền bảng/sequence được kiểm; không reset/seed. Backup không phải bản sao toàn nền tảng Supabase; kiểm archive chưa phải diễn tập restore.

PostgreSQL startup chỉ kiểm migration, không tự apply. Sau triển khai restart backend/frontend để tất cả process dùng schema/contract mới. Không dùng runner lịch sử `db:deploy:us7` (chỉ dành mốc 0012) để triển khai 0013.

## Cách ghi evaluation

Xem [phiếu thủ công, mục 8](evidence/us7-manual-evaluation.md#8-tra-metadata-bằng-số-request_id-trong-db): hỏi từng câu, ghi thời gian, tra các row mới và điền request_id số vào phiếu. Nếu có nhiều người hỏi cùng lúc, không tự giả định row cuối thuộc lượt của mình. Mã UUID đã ghi trong bằng chứng cũ vẫn giữ; dùng mapping backup khi cần đối chiếu.

Test migration có ca giữ metadata/đánh số/thêm đồng thời và ca từ chối row pending; API kiểm ID số tăng dần, bỏ ba cột và không gửi ID trên response. Kết quả kiểm chứng của đợt này ghi ở evidence riêng, không sửa các raw logs lịch sử.
