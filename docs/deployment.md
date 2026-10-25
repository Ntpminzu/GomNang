# Vận hành và triển khai — GOM NẮNG

Cập nhật theo source 25/10/2026, gộp hướng dẫn deploy/Supabase/PGlite. Chưa chạy lại container/hosting hoặc thay đổi database cho bản nộp. [Requirements](requirements.md) là đích cuối kỳ; tài liệu này nêu cách chạy và các điều kiện còn thiếu.

## 1. Chọn môi trường và biến cấu hình

| Nơi | Biến cần biết | Ý nghĩa |
| :-- | :-- | :-- |
| Backend | `JWT_SECRET`, `PORT`, `NODE_ENV` | JWT secret bắt buộc ≥32 ký tự; cổng và môi trường |
| Database | `DATABASE_URL`, `DATA_DIR` | Có URL dùng PostgreSQL; không có dùng PGlite persistent theo DATA_DIR |
| Dữ liệu/dev | `SEED_ON_EMPTY`, `ENABLE_DEV_LOGIN` | Tự seed khi rỗng; dev-login luôn tắt ở production |
| AI backend | `OLLAMA_BASE_URL`, `OLLAMA_MODEL`, `OLLAMA_EMBEDDING_MODEL` | Endpoint chat/embedding, vector 1024 chiều theo source |
| Google backend | `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `FRONTEND_ORIGIN` | Credential chỉ backend, callback cố định `/api/auth/google/callback` qua frontend rewrite |
| AI cloud tùy chọn | `GEMINI_API_KEY`, `GEMINI_MODEL` | Key chỉ ở backend; Gemini vẫn cần Ollama embeddings |
| Next server/build | `API_ORIGIN`, `NEXT_PUBLIC_API_MODE` | Rewrite backend và chọn http/mock; đổi cấu hình phải rebuild khi deploy |

Tên biến/placeholder ở [be/.env.example](../be/.env.example), [fe/.env.example](../fe/.env.example), [.env.example](../.env.example). Không commit giá trị secret, URI có mật khẩu, backup hay file dữ liệu. `host`, `database`, `port` viết thường trong env không phải cấu hình DB của backend.

## 2. Chạy local trên Windows

Node.js ≥22.18 theo cấu hình dự án. Chạy từ root:

```powershell
npm.cmd install
Copy-Item be/.env.example be/.env
```

Chỉ copy khi chưa có file env; giữ cấu hình đã dùng và điền secret riêng. Chọn DATA_DIR thử nghiệm hoặc DB riêng trước khi khởi động: server có thể migrate/seed theo cấu hình. Thao tác migration/seed vào dữ liệu thật cần được xác nhận riêng trước khi vận hành.

```powershell
# Terminal 1; Ollama đã được cài, khởi động và truy cập được
ollama pull qwen3:4b
ollama pull qwen3-embedding:0.6b
npm.cmd run dev:be
```

```powershell
# Terminal 2
npm.cmd run dev:fe
```

Mặc định web http://localhost:3000, API http://localhost:4000; kiểm `/health` trên backend. Các model là giá trị mặc định trong source; phải kiểm model/cấu hình thực tế, nhất là cloud. Chat ở mock không hoạt động. Gemini chỉ bật khi backend có key và người dùng đăng nhập.

## 3. Database, backup và phục hồi

Nguồn: [client.ts](../be/src/infrastructure/database/client.ts), [postgres.ts](../be/src/infrastructure/database/postgres.ts), [pglite.ts](../be/src/infrastructure/database/pglite.ts).

- PostgreSQL/Supabase: lấy URI phù hợp từ dashboard, mật khẩu URL-encode, không dán URI vào tài liệu/log. Driver hiện bật TLS kiểm CA/hostname với host Supabase; CA công khai nằm ở `be/certs`. `public.users` của ứng dụng không phải Supabase Auth.
- PGlite: relative DATA_DIR được giải theo working directory backend. File lock chặn tiến trình thứ hai. Chỉ một backend/SQL CLI mở thư mục persistent cùng lúc; Ctrl+C và đợi đóng trước khi mở bằng tiến trình khác.
- Khởi động backend chạy migrations; với DB hiện có phải kiểm backup/schema và scope trước. Không suy từ migrations trong repo rằng DB live đã áp dụng đủ, đặc biệt RLS và pgvector.
- Backup chứa dữ liệu tài khoản phải được giữ ngoài Git; xác minh file và khả năng khôi phục trước thao tác có rủi ro.
- Nếu DB lỗi: giữ nguyên gốc, tạo/kiểm backup, chẩn đoán và thử phục hồi trên bản sao theo kế hoạch riêng; không reset dữ liệu để làm demo.

Script [migrate-to-supabase.ts](../be/scripts/migrate-to-supabase.ts) có chế độ kiểm kết nối và `--apply` để backup/transfer, từ chối ghi đè dữ liệu khác. Migration chạy trước transaction nhập, nên rollback nhập không bảo đảm hoàn nguyên schema. Danh sách transfer hiện chưa gồm `chat_chunks`; không coi script là đồng bộ/backup toàn hệ thống hoặc tự chạy lại để cập nhật RAG. Muốn chuyển DB cần kế hoạch và kiểm chứng riêng, không thực hiện trong việc đồng bộ doc.

## 4. Container: điều kiện trước khi chạy

Cấu hình hiện có: [Compose](../docker-compose.yml), [BE Dockerfile](../be/Dockerfile), [FE Dockerfile](../fe/Dockerfile). **Chưa đủ xác nhận demo cuối kỳ**:

1. DB Compose chọn `postgres:17-alpine`; [migration](../be/drizzle/0007_enable_vector.sql) yêu cầu extension vector. Cần môi trường thực sự cung cấp pgvector và kiểm startup.
2. Backend container cần endpoint chat/embeddings truy cập được; `127.0.0.1` trong container là chính container đó. Compose chưa có service Ollama/truyền các biến AI.
3. Chuẩn bị model, secret và môi trường dữ liệu thử riêng. Không dùng volume thật như dữ liệu bỏ được.
4. FE build phải trỏ `API_ORIGIN` tới backend trong network Compose và chọn HTTP.

Sau khi xử lý các điều kiện này, lệnh khởi động theo cấu hình đã kiểm là:

```powershell
docker compose up --build --wait
```

Lệnh trên chưa được chạy lại cho bản nộp. `docker compose down` dừng service và giữ named volume; không thêm `-v` khi cần giữ dữ liệu. Cần kiểm cả model/embeddings vì `/health` chỉ kiểm DB.

## 5. Hosting: cấu hình theo repository

Đường triển khai có trong repo: FE Next.js trên Vercel, BE Docker trên Render theo [render.yaml](../render.yaml), DB PostgreSQL/Supabase. Đây là hướng dẫn cấu hình, không xác nhận service/tên miền hiện đang sống hoặc chính sách gói miễn phí hiện tại.

| Thành phần | Thiết lập |
| :-- | :-- |
| Render backend | Docker context root, Dockerfile `be/Dockerfile`, health `/health`, `NODE_ENV=production`, JWT secret riêng, DATABASE_URL đúng, `SEED_ON_EMPTY=false` cho DB có dữ liệu |
| Model/embeddings | Endpoint Ollama reachable từ hosting và được bảo vệ; model/key server-side; kiểm network/quota/latency thật |
| Vercel frontend | Root Directory `fe`, hỗ trợ package workspace ngoài fe; `API_ORIGIN` trỏ BE, `NEXT_PUBLIC_API_MODE=http`; rebuild sau đổi biến |
| Supabase | Kiểm extensions/migrations/constraints/RLS trên môi trường thật; chỉ backend truy cập dữ liệu riêng |

Browser gọi `/api/*` qua Next rewrite; không cần hard-code API origin trong component. HTTP không có CORS không thay thế auth/authorization. Cách Render/Vercel cấp quyền, domain, sleep/quota có thể đổi; kiểm trên tài khoản thật, không dùng số từ trí nhớ.

**Giữ production tắt dev-login.** Admin/verifier không dùng dev-login ngay cả ở development. US-1 có Google/session/role/admin provisioning nhưng chưa thử Google thật hoặc deploy; dùng [hướng dẫn DB test local](us1-local.md), không tự áp migration 0010 lên DB đang dùng.

## 6. Smoke checklist cho bản nộp

| Kiểm tra | Kỳ vọng / bằng chứng |
| :-- | :-- |
| DB/API | `/health` trả 200, DB ok; ghi môi trường/commit, không in URI |
| Rewrite FE | FE `/api/projects` trả JSON từ đúng backend, không phải mock |
| Nghiệp vụ | Tạo → gửi xác minh → duyệt → cam kết → bàn giao → xác nhận, chặn vượt nhu cầu/tự xác nhận |
| Persistence | Restart có kiểm soát, dữ liệu thử còn, không reset DB |
| AI | Câu hỏi có nguồn, mở nguồn hỗ trợ đúng; hỏi bản nháp/ngoài phạm vi/injection; không dùng lời chào làm bằng chứng LLM |
| Fallback | Ngắt riêng model/embedding, chat báo lỗi rõ; nghiệp vụ non-AI còn dùng được |
| Phần mới | US-1 đã có code/local checks nhưng Google thật/deploy còn chờ; stream/upload/capability thứ hai vẫn cần hiện thực và demo |
| Hồ sơ | Ghi output, ngày/commit/config đã che secret, người kiểm và giới hạn tại [evidence](evidence/README.md) |

Chỉ kiểm ở dữ liệu thử nghiệm được phép. Tests/E2E có prerequisites riêng ở [traceability §4](traceability.md#4-ranh-giới-kiểm-chứng). Chuẩn bị video 3–5 phút từ cùng môi trường demo, slide ≤15, PDF 10–20 trang.

## 7. Xử lý lỗi thường gặp

| Triệu chứng | Kiểm tra trước |
| :-- | :-- |
| API sống nhưng dữ liệu biến mất sau deploy | DATABASE_URL/volume persistent và log loại DB, không mặc định container filesystem là bền |
| `extension vector` không khả dụng | Runtime PostgreSQL có pgvector chưa; giữ dữ liệu, không reset để né migration |
| Health ok nhưng chat lỗi | Health không kiểm model; kiểm endpoint, embedding dimensions, tên model/quyền và kết nối từ nơi BE chạy |
| FE không nhận JSON | API_ORIGIN/rewrite, HTTP mode và đã rebuild sau đổi env chưa |
| PGlite đang được sử dụng | Đúng process giữ lock, đóng êm; không xóa dữ liệu/lock khi chưa chẩn đoán |
| Model timeout/429 | Ghi requestId/status, kiểm provider/quotas và thông báo UI; không ghi thành câu trả lời đúng |
| Token cũ không hợp lệ | Session/issuer/expiry hoặc secret đã đổi; đăng nhập lại, không bật dev-login production |

Chưa đo lại hosting/Docker, chưa kiểm lịch sử Git hoặc thực hiện thao tác DB trên môi trường dùng để nộp.


US-1 schema update (25/10/2026): Supabase migrations 0010–0011 applied directly; data preserved; no Docker used. See [live evidence](evidence/us1-verification.md). This supersedes earlier database migration status above.
