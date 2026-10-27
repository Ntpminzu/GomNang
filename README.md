# GOM NẮNG

Ứng dụng web tổ chức thiện nguyện: dự án có nhu cầu định lượng, xác minh độc lập trước khi công khai, đóng góp theo từng phần và sổ thu chi có ghi vết. Đồ án môn **New Technologies in Software Engineering, 2026–2027**.

| Thành viên | Phụ trách |
| :-- | :-- |
| Phạm Văn Bảo An — 23110001 | Backend, domain rules, database, auth, RAG chatbot (US-7), mức dùng AI (US-9), real-time (US-10) |
| Võ Tuấn Khanh — 23110031 | Frontend, session, các màn hình; người gác cổng AI US-8 cả BE và FE; xoá dự án (US-2), tìm kiếm (US-3), chứng từ (US-5) |

**Bản deploy:** web https://gom-nang-frontend.vercel.app · API https://gomnang-api.onrender.com/health · DB Supabase. Bản deploy không có Ollama nên hai tính năng AI báo "tạm không khả dụng"; các chức năng khác chạy bình thường. Demo AI chạy bằng Docker Compose hoặc từ source trên máy có Ollama.

## 1. Tính năng

| Story | Nội dung | Trạng thái 27/10/2026 |
| :-- | :-- | :-- |
| US-1 | Đăng nhập Google hoặc email/mật khẩu, JWT, vai user/admin/verifier | Có code và test; human review một phần |
| US-2 | Tạo, xem, sửa, xoá mềm bản nháp dự án | Có code và test; human review đạt các ca thao tác, còn ca đọc source |
| US-3 | Tìm, lọc, sắp xếp, phân trang phía máy chủ | Có code và test; human review đạt các ca thao tác, còn ca đọc source |
| US-4 | Gửi xác minh, duyệt hoặc trả lại có lý do | Có code và test; human review đạt các ca thao tác, còn ca đọc source |
| US-5 | Tải chứng từ chi (ảnh/PDF ≤ 3 MB), xem theo quyền | Có code và test; human review đạt các ca thao tác, còn ca đọc source |
| US-6 | Việc của tôi và hồ sơ công khai | Có code và test; human review đạt các ca thao tác, còn ca đọc source |
| US-7 | **AI 1 — RAG chatbot** trả lời có nguồn từ hướng dẫn và dự án công khai | Nghiệm thu thủ công 20/20 ngày 26/10 |
| US-8 | **AI 2 — Người gác cổng (Structured output)**: AI soát hồ sơ chờ xác minh, trả JSON theo schema | Eval 20/20 (prompt v4), human review H1–H9 |
| US-9 | Trang admin mức dùng AI: token, latency, chi phí của hai vai AI | Có code và test; chờ nghiệm thu |
| US-10 | Bảng đóng góp cập nhật real-time bằng SSE | Có code và test; chờ nghiệm thu |

Chi tiết tiêu chí: [requirements](docs/requirements.md). Truy vết story → API → source → test: [traceability](docs/traceability.md).

## 2. Chạy bằng Docker Compose

Cần Docker Desktop và Ollama trên máy host đã có hai model:

```powershell
ollama pull qwen3:4b
ollama pull qwen3-embedding:0.6b
```

1. Chép `.env.example` thành `.env` ở thư mục gốc, điền `JWT_SECRET` (≥ 32 ký tự). Muốn có admin và người xác minh thử thì điền `DEMO_ADMIN_*`, `DEMO_VERIFIER_*` với mật khẩu tự đặt. Ollama khác cổng 11434 thì sửa `DOCKER_OLLAMA_URL`; máy chạy CPU nên đặt `OLLAMA_CHAT_THINK=false`.
2. `docker compose up --build --wait`. Compose chạy 4 service: `db` (Postgres 17 + pgvector), `init` (migration, dữ liệu mẫu, tài khoản thử), `backend` (:4000), `frontend` (:3000). Đổi cổng bằng `COMPOSE_API_PORT`, `COMPOSE_WEB_PORT`.
3. Lập chỉ mục RAG cho chatbot: `docker compose exec backend node scripts/index-chat.ts`.
4. Mở http://localhost:3000. Tắt: `docker compose down` (giữ dữ liệu) hoặc `docker compose down -v` (xoá dữ liệu).

Service `init` từ chối chạy nếu `DATABASE_URL` trỏ tới Supabase, nên Compose không đụng dữ liệu thật.

## 3. Chạy từ source trên Windows

Cần Node.js ≥ 22.18 và Ollama như trên. Trong PowerShell tại thư mục gốc:

```powershell
npm.cmd install
Copy-Item be/.env.example be/.env    # chỉ khi chưa có be/.env
npm.cmd run dev:be                   # terminal 1, http://localhost:4000/health
npm.cmd run dev:fe                   # terminal 2, http://localhost:3000
npm.cmd run rag:index                # lập chỉ mục RAG lần đầu và sau khi nguồn đổi
```

Có `DATABASE_URL` thì backend dùng PostgreSQL/Supabase, khi đó migration phải triển khai riêng. Không có thì dùng PGlite lưu trong `DATA_DIR` và tự migrate. Trình duyệt gọi `/api/*` cùng origin, Next.js chuyển tiếp tới backend.

## 4. Biến môi trường

Mẫu: [gốc / Compose](.env.example), [backend](be/.env.example), [frontend](fe/.env.example). Không commit `.env`, database, bản sao lưu hay khoá.

| Nơi | Biến |
| :-- | :-- |
| Backend | `JWT_SECRET`, `PORT`, `NODE_ENV`, `DATABASE_URL` hoặc `DATA_DIR`, `SEED_ON_EMPTY`, `ENABLE_DEV_LOGIN`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `FRONTEND_ORIGIN` |
| AI (backend) | `OLLAMA_BASE_URL`, `OLLAMA_MODEL`, `OLLAMA_EMBEDDING_MODEL`, `OLLAMA_CHAT_THINK` |
| Frontend | `API_ORIGIN`, `NEXT_PUBLIC_API_MODE` |
| Compose | `JWT_SECRET`, `DOCKER_OLLAMA_URL`, `OLLAMA_CHAT_THINK`, `DEMO_ADMIN_EMAIL`, `DEMO_ADMIN_PASSWORD`, `DEMO_VERIFIER_EMAIL`, `DEMO_VERIFIER_PASSWORD` |

## 5. Tài khoản test

| Cách đăng nhập | Tài khoản | Ghi chú |
| :-- | :-- | :-- |
| Nút "Dùng tài khoản mẫu" trên `/login` | Võ Tuấn Khanh, Phạm Văn Bảo An, Nguyễn Thị Mai, Trần Văn Hùng (`*@gomnang.test`, dữ liệu mẫu ở [demo-data.ts](packages/domain/src/demo-data.ts)) | Chỉ khi `ENABLE_DEV_LOGIN` bật và `NODE_ENV` không phải production |
| Email + mật khẩu | Admin và người xác minh do service `init` tạo từ `DEMO_ADMIN_*`, `DEMO_VERIFIER_*`, hoặc `npm run auth:bootstrap-admin -w gomnang-api` | Mật khẩu do người chạy tự đặt, không ghi trong repo |
| Google | Tài khoản Google bất kỳ, vào với vai user | Cần cấu hình `GOOGLE_CLIENT_*` |

Bản deploy tắt dev-login; muốn thử trên production phải đăng nhập Google hoặc dùng tài khoản do admin cấp.

## 6. Kiểm thử

```powershell
npm.cmd test              # domain + backend + frontend
npm.cmd run typecheck
npm.cmd run build
npm.cmd run test:e2e      # Playwright, tự chạy server riêng ở cổng 3100/4100 với PGlite tạm và model giả
npm.cmd run eval:assessment -w gomnang-api -- --prompt assessment.v4   # eval 20 ca người gác cổng, cần Ollama
```

Lần chạy gần nhất (27/10/2026): `npm test` 206/206 (54 domain, 122 backend, 30 frontend), typecheck sạch, E2E 25/25 (`PW_CHANNEL=chrome` khi máy chưa tải trình duyệt của Playwright); eval người gác cổng `qwen3:4b` + prompt v4 đạt 20/20 hai lần liên tiếp. Tổng hợp bằng chứng: [evidence](docs/evidence/README.md).

## 7. Bản đồ code và tài liệu

`be/src/modules/<module>`: route → middleware → controller → service → repository. `fe/src/app` chỉ chứa route mỏng, giao diện ở `fe/src/presentation`, HTTP/session ở `fe/src/libs`. Types và luật nghiệp vụ thuần ở `packages/domain`, dùng chung cho FE và BE.

| Tài liệu | Nội dung |
| :-- | :-- |
| [Requirements](docs/requirements.md) | 10 user story, tiêu chí nghiệm thu, yêu cầu AI và phi chức năng của đề |
| [Traceability](docs/traceability.md) | Story → API/component → source → test, hiện trạng kiểm chứng |
| [Architecture](docs/architecture.md) | Sơ đồ hệ thống, luồng nghiệp vụ và luồng AI |
| [ADR](docs/adr/README.md) | 6 quyết định: backend theo module, chọn LLM, RAG pipeline (An); người gác cổng AI, xoá mềm, lưu chứng từ (Khanh) |
| [AI design](docs/ai-design.md) | Model, prompt, RAG settings, schema, guardrails, eval, telemetry |
| [Evaluation](be/evals/README.md) | Bộ eval và kết quả của hai capability AI: bảng 20 ca, token, latency; dữ liệu ở `be/evals/assessment/` và `be/evals/chat/` |
| [API contract](docs/api-contract.md) | Endpoint, schema, quyền |
| [Deployment](docs/deployment.md) | Chạy local, container, hosting, sao lưu |
| [Backlog](docs/backlog.md) | Việc còn mở và điều kiện đóng |
| [Evidence](docs/evidence/README.md) | Bằng chứng kiểm thử và human review từng story |
| [AI_USAGE](AI_USAGE.md) | Nhật ký dùng AI: công cụ, prompt chính, phần AI sinh, kiểm tra, chỗ AI làm sai |
| [Kịch bản thuyết trình](docs/slides/kich-ban-thuyet-trinh.md) | Lời nói từng slide, demo 8 phút, live change, Q&A |
