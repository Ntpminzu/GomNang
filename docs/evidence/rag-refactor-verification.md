# Kiểm chứng refactor RAG — 25/10/2026

Ghi chú 26/10: đây là bằng chứng lịch sử trước US7 giai đoạn 1. Nhánh lời chào/danh mục và contract model/API đã được thay đổi; các kết quả bên dưới không chứng minh bản mới. Xem [giai đoạn 1](us7-verification.md), chưa chạy lại kiểm tra tự động theo yêu cầu người dùng.

Phạm vi: thay cấu trúc/hàm/luồng gọi theo repo tham chiếu, giữ pgvector và tự đồng bộ. Xem [cấu trúc RAG](../adr/003-rag-pipeline.md). Kết quả cho working tree của lượt refactor này; chưa tạo commit.

## Môi trường và ranh giới

- Windows, Node.js 22.21.0; build Next.js 16.3.5. Các lệnh chạy từ root bằng `npm.cmd`.
- Unit/API/index dùng vector/model fixture; DB test PGlite trong RAM hoặc thư mục tạm riêng. Không gọi model/cloud thật, không mở/sửa DB người dùng, không chạy migration/reset/seed môi trường thật.
- E2E dùng helper hiện có: Next dev `127.0.0.1:3100`, backend `127.0.0.1:4100`, `DATABASE_URL` rỗng, không dotenv, PGlite tạm, Ollama adapter được thay bằng client fixture kiểm soát được. Browser đi qua Next proxy thật.

## Kết quả

| Lệnh | Kết quả quan sát | Chứng minh |
| :-- | :-- | :-- |
| `npm.cmd test` trước sửa | Exit 0 | Baseline tự động của workspace; không phải baseline eval AI |
| `npm.cmd test` sau refactor | Domain 42/42, backend 76/76, frontend 23/23; tổng 141 pass, 0 fail | Hồi quy nghiệp vụ/API và test RAG mới với fixture |
| `npm.cmd run typecheck` | Exit 0 | Types BE/FE hợp lệ |
| `npm.cmd run build` | Exit 0, production build hoàn tất | Next compile/typecheck/prerender |
| `npm.cmd run test:e2e -- chat-flow.spec.ts` | Lần chạy cuối 2/2 pass, exit 0 | Chat/history/source link và provider error → sửa → gửi lại qua browser/proxy/BE |
| `graphify update .` | Exit 0; graph 1632 nodes, 5738 edges | Cập nhật graph cục bộ sau code/checks; 12 SQL file bị bỏ qua vì thiếu tree_sitter_sql, một số test không trích được symbol |

Lần E2E đầu bị Windows `Access denied` khi helper dừng cây tiến trình sau test. Không tính lượt đó là pass toàn bộ; đã chạy lại ngoài sandbox, cả hai test và teardown hoàn tất. Cảnh báo NO_COLOR/FORCE_COLOR vẫn có nhưng không làm lần cuối thất bại.

## Các hành vi đã kiểm

- Index: hai sync đồng thời không embed trùng trên cùng DB; chunk không đổi không embed lại; chunk sửa được cập nhật; stale bị xóa; đổi embedding model tạo lại vectors.
- Lỗi batch embedding thứ hai không ghi một phần hoặc xóa chỉ mục cũ; sync tiếp theo hoạt động.
- Các vector dự án có cosine cao hơn nguồn hướng dẫn nhưng dự án chuyển `draft` bị loại trước topK; guide vẫn được tìm. Nguồn stale được xóa khi sync tiếp theo.
- History: bỏ orphan, giữ cặp hoàn chỉnh theo thứ tự, bỏ citation cũ, cắt budget; chỉ câu user được ghép vào embedding query, câu hiện tại giữ riêng trong messages.
- Citation: thiếu/sai bị chặn, reply chỉ dẫn `[2]` giữ đúng nguồn `[2]`, không đánh lại số.
- HTTP: giữ role validation và Gemini JWT, lời chào/danh mục/no-evidence, DTO hiện tại; history lẻ vẫn được nhận và chuẩn hóa nội bộ.
- E2E: loading, câu nối tiếp, mở `/help#create-project`, lỗi provider giữ lại câu hỏi và cho sửa/gửi lại.

## Chưa được chứng minh

Chưa có bộ evaluation ≥20 ca bằng model thật, expected/actual và pass rate trước/sau cải tiến. Chưa đo model latency/cost, chưa demo provider thật ngừng, chưa xác minh chất lượng semantic, chống injection/ngoài phạm vi đầy đủ, lộ system prompt hoặc PII trong văn bản. Chưa kiểm race nhiều tiến trình/nội dung đổi giữa request, deploy/container hoặc human acceptance. Chưa chạy lại toàn bộ E2E auth/project trong lượt này.

Việc ghép ngữ cảnh cũ có thể ảnh hưởng câu hỏi đổi chủ đề/ngoài phạm vi; helper tests chỉ kiểm input đúng thiết kế, không chứng minh từ chối đúng. Citation validity không chứng minh claim entailment. Không dùng 141 tests hoặc E2E fixture thay cho nghiệm thu A8 US-7; chưa đóng US-7.

## Cleanup tiếp sau refactor

Rà caller không thấy `answerChat`, `retrieveChatChunks`, `splitWithOverlap`, `ensureIndex` hoặc `queryInput` còn trong source/tests. Các adapter và file retrieval hiện vẫn có nơi gọi. Đã bỏ bản sao `excerpt` trong chunk chuẩn bị index (chỉ dùng `content`), cùng export type `PublicProject` không có caller ngoài module; không đổi `ChatReply.sources[].excerpt`, hash, schema hoặc dữ liệu DB.

Sau cleanup: `npm.cmd test` đạt 42 domain + 76 backend + 23 frontend = 141 tests; `npm.cmd run typecheck -w gomnang-api` exit 0. Không chạy lại build/browser/model thật cho thay đổi dữ liệu nội bộ này; kết quả build/E2E ở bảng trên thuộc lượt refactor trước.
