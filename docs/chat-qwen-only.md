# Chat chỉ dùng Qwen/Ollama

Quyết định người dùng ngày 26/10/2026 thay thế kế hoạch giữ hai provider trước đó. Đã bỏ adapter cloud, cấu hình/key liên quan, nhánh auth riêng và dropdown chọn model. Không thay Google OAuth đăng nhập nghiệp vụ.

- Generation mặc định `OLLAMA_MODEL=qwen3:4b`.
- Embedding mặc định `OLLAMA_EMBEDDING_MODEL=qwen3-embedding:0.6b`.
- Cả hai gọi `OLLAMA_BASE_URL`, có thể chạy local hoặc từ xa theo cấu hình. Không tự chuyển dịch vụ khi lỗi.
- API `GET /api/chat/model` trả một object `{ name, available }`. Widget dùng trực tiếp thông tin này, không danh sách/dropdown/provider map. Endpoint `/api/chat/models` cũ đã bỏ.
- `POST /api/chat` chỉ nhận message/history, không cần JWT. Schema strict từ chối trường ngoài hợp đồng (kể cả `model`) bằng 400 BAD_REQUEST; backend dùng model cấu hình duy nhất.
- RAG, manual index, guards, history, deadline/output checks, metadata và chức năng đăng nhập/nghiệp vụ khác giữ luồng hiện có.
- Script thử nghiệm riêng `scripts/llm-smoke-test.mjs` cũng chỉ gọi Qwen/Ollama; không tính script này thành capability thứ hai đã tích hợp.

Đã xóa biến key/model cloud trong `be/.env.example` và file env local mà không in giá trị; không thay key Google, DB hoặc JWT. Xóa cấu hình local không phải thu hồi key trên tài khoản nhà cung cấp. Không chạy migration hoặc xóa log DB cũ: requested_provider là cột text, lịch sử cũ vẫn là dữ kiện lịch sử.

Các evidence/AI_USAGE và ghi nhận giai đoạn cũ có thể nhắc provider đã gỡ để giữ đúng lịch sử; không mô tả khả năng hiện tại. Bỏ milestone kiểm parity provider thứ hai ở giai đoạn 5 và điều kiện phải đạt cả hai: nghiệm thu/eval US7 từ nay trên Qwen/Ollama, vẫn giữ bộ >=20 ca, báo trước/sau và ngưỡng nhóm đã chốt (>=90%, critical 100%). Không coi việc xóa provider là đã hoàn thành eval hay US7.

Đã cập nhật test fixtures, test API chỉ một model/guest/unsupported provider và bỏ adapter test không còn dùng. Chưa chạy tests/typecheck/build/E2E/eval, model hoặc index DB thật theo yêu cầu để người dùng tự thử.

Restart backend/frontend nếu đang chạy code cũ; khung chat không còn chọn provider, vẫn có tên Qwen. Chỉ thay adapter generation không yêu cầu re-embedding toàn index; chạy `npm.cmd run rag:index` khi cần cập nhật nguồn hoặc đổi embedding model.

Chi tiết đợt dọn kiểm tra lặp và guardrail: [RAG tinh gọn](rag-simplification.md).
