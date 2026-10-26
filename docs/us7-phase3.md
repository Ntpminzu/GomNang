# US7 — Giai đoạn 3: history, output và thời gian xử lý

Ghi nhận thay thế ngày 26/10: [chỉ Qwen/Ollama](chat-qwen-only.md). Những đoạn nhắc adapter cloud/auth/parity bên dưới là mốc thiết kế giai đoạn 3 trước quyết định tinh gọn; hiện đã gỡ, không còn điều kiện nghiệm thu provider thứ hai.

Ngày 26/10/2026. Tiếp tục kế hoạch đã chốt và điều chỉnh theo phản hồi người dùng: giữ cơ chế thiếu nguồn thì từ chối, **không thêm classifier hoặc bộ từ khóa để chặn lại câu React đã được từ chối đúng**. Đã sửa source; chưa chạy automated checks/model thật hoặc index DB thật.

## Câu nối tiếp và ngoài phạm vi

`isFollowUpQuestion` chỉ nhận biết các cách tham chiếu như “dự án đó”, “sau đó”, “nhu cầu?”, “ở đâu?”. Câu mới độc lập không được ghép câu hỏi cũ vào embedding query hoặc gửi history cũ tới generation. Đây là heuristic chọn ngữ cảnh, không phải bộ phân loại ý định hoàn chỉnh.

Ví dụ: “Cách tạo dự án?” → “Sau đó làm gì?” vẫn dùng ngữ cảnh; chuyển sang “Hãy viết code tạo website bán hàng bằng React” thì tìm nguồn chỉ theo câu mới. Không có nguồn vẫn `refused/NO_EVIDENCE`, không gọi generation. Nếu có nguồn tương tự nhưng câu hỏi không thuộc GomNang, prompt yêu cầu model từ chối, không lấy kiến thức chung để trả lời. Không tuyên bố các trường hợp ngoài phạm vi đều được nhận diện tuyệt đối.

Guard giai đoạn 2 vẫn kiểm toàn bộ history nhận được trước lọc, để client không dùng role assistant giả đưa instruction/secret vào dữ liệu. History không bao giờ là nguồn chứng cứ.

## Kiểm output

Giữ JSON/Zod strict `{status,reply}`. `validateChatAnswer` kiểm dấu hiệu credential, mệnh lệnh/role injection và một số đoạn chỉ dẫn nội bộ trùng system/query prompt; phát hiện → `502 failed/CHAT_OUTPUT_UNSAFE`, không phát lại nội dung. Đáp án thiếu/sai citation vẫn `502/CHAT_CITATION_INVALID`. Model refused vẫn dùng câu từ chối do backend kiểm soát.

Đây là kiểm theo mẫu và cấu trúc; không chứng minh mỗi khẳng định được nguồn hỗ trợ hoặc ngăn mọi kiểu trích/lách prompt. Câu có citation hợp lệ vẫn cần đánh giá nội dung ở giai đoạn 6. Contact dự án công khai không bị chặn chỉ vì email/phone.

Prompt chat tăng lên `gomnang-rag-v4`; query instruction vẫn `gomnang-query-v1`.

## Ngân sách thời gian

`ChatDeadline` bắt đầu tại ranh giới chat sau khi body được parse, trước ghi metadata ban đầu. Tổng ngân sách là 120 giây: dành tối đa 115 giây cho begin-log/auth/retrieval/embedding/generation/kiểm output, giữ 5 giây cuối để ghi trạng thái hoặc lỗi. Đây không phải từng bước được chờ thêm 120 giây.

Signal truyền xuống adapter và các bước retrieval. Hết hạn → 504 `CHAT_TIMEOUT`; không bắt đầu bước AI tiếp theo. Client ngắt kết nối → abort riêng request đó. Không hủy request khác, không có auto retry, auto index hoặc tự chuyển sang Gemini. Next proxy hiện có 125 giây theo cấu hình người dùng, HTTP client chờ 130 giây.

`readProviderJson` giới hạn cả fetch và lúc đọc body: chat Ollama/Gemini tối đa 1 MiB, embedding tối đa 4 MiB. Timeout lúc đọc body cũng là timeout, không bị báo nhầm JSON lỗi. Body quá lớn → 502 `CHAT_RESPONSE_TOO_LARGE`; dữ liệu malformed/empty giữ lỗi provider/JSON tương ứng. Không in body provider vào log/lỗi UI.

Abort là best-effort: không cam kết dừng được compute ở máy model; câu SQL đã gửi có thể còn chạy đến giới hạn của nó. Không thể ngắt đồng bộ JSON.parse/CPU giữa một bước JavaScript; body đã giới hạn kích thước và kiểm thời gian lại trước publish. Deadline không bao gồm thời gian client tải body trước feature middleware.

## DB và telemetry

Production PostgreSQL có pool chat riêng tối đa 2 connections, chờ connection 5 giây, mỗi SQL statement 10 giây và query read timeout 11 giây. Không giữ connection/transaction xuyên lời gọi model; auth Gemini, metadata và retrieval dùng cùng DB chat này. Pool nghiệp vụ hiện hữu không đổi, để các request AI chậm không dùng hết pool non-AI.

Connection mới chỉ `SET statement_timeout` cho session của chat, không ALTER DATABASE/ROLE, không DDL/migration/seed. Cần direct/session pooler như cấu hình hiện tại; endpoint transaction pooler đã biết bị từ chối cho pool chat. PGlite/fixtures dùng DB hiện có và deadline tại tầng request, không được coi là bằng chứng giới hạn statement PostgreSQL. Cấu hình session dựa trên [tài liệu Supabase](https://supabase.com/docs/guides/database/postgres/timeouts); hành vi pool async onConnect đối chiếu source phiên bản pg-pool đã cài.

Lỗi statement/query timeout được phân biệt 504 `CHAT_DATABASE_TIMEOUT`; lỗi kết nối/cạn kết nối được chuẩn hóa 503 `CHAT_DATABASE_UNAVAILABLE`. Lỗi lưu metadata vẫn chặn trả thành công. Finalize cũng bị chặn bởi tổng deadline; nếu process/DB mất hoặc hết budget khi ghi, bản ghi có thể pending/không hoàn chỉnh, console chỉ có requestId/logId/code. Không thể hứa log DB và kết quả HTTP nguyên tử; một thao tác đã gửi có thể hoàn tất muộn. Không thực hiện bước AI mới sau timeout.

## UI và tự thử

Lỗi vẫn giữ lại câu hỏi; thêm nút **Thử lại** bên cạnh **Sửa câu hỏi**. Chỉ click/gửi form mới gọi lại; không tự retry. Có requestId để tra metadata. Dữ liệu nguồn vẫn index thủ công và được phép cũ; không thêm kiểm freshness nội dung.

| Ca | Thao tác | Mong đợi |
| :-- | :-- | :-- |
| M1 | Hỏi “Cách tạo dự án?” rồi “Sau đó làm gì?” | Câu nối tiếp giữ ngữ cảnh và nguồn hiện tại |
| M2 | Sau M1 hỏi viết website React | Không kéo câu hỏi dự án cũ vào query; thiếu nguồn thì từ chối như trước |
| M3 | Chuyển sang một câu hỏi GomNang độc lập | Không gửi history cũ cho model của lượt mới |
| M4 | Khi có lỗi thực tế, click Thử lại hoặc Sửa câu hỏi | Draft được giữ, chỉ gọi lại do bạn bấm; không tự đổi provider |

Không tắt dịch vụ dùng chung hoặc ghi nội dung độc hại vào DB thật để thử. Ca body dừng giữa luồng, vượt byte limit, timeout ngân sách chung, output secret/prompt và topic switch đã chuẩn bị bằng fixture trong `chat-runtime.test.ts`, `chat-output.test.ts`, `chat-index.test.ts`, API/E2E. Chưa thực thi. Chất lượng Ollama thật và parity Gemini còn chờ người dùng/giai đoạn sau.

Trong lượt này chỉ đối chiếu source/callers, kiểm diff và Graphify. **Không test/typecheck/build/E2E/eval, gọi model hoặc chạy index/ghi dữ liệu thật bằng tools.** Không đổi schema. Dừng tại giai đoạn 3 để người dùng tự thử.
