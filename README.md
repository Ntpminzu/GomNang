# GOM NẮNG

Ứng dụng web tổ chức thiện nguyện có nhu cầu định lượng, xác minh độc lập, đóng góp theo từng phần và sổ thu chi có ghi vết. Đồ án môn **New Technologies in Software Engineering, 2026–2027**.

Nhóm: **Võ Tuấn Khanh — frontend**, **Phạm Văn Bảo An — backend**. Hạn cuối được cung cấp: **27/10/2026**, giờ nộp/lịch bảo vệ riêng chưa xác nhận. Tài liệu đối chiếu source ngày 25/10/2026; có code không tự chứng minh test hoặc deploy đạt.

## 1. Hiện trạng so với đề cuối kỳ

| Phần | Hiện trạng |
| :-- | :-- |
| Nghiệp vụ | Có dự án/nhu cầu, xác minh, đóng góp, vòng đời, bảng tin, sổ thu chi và dashboard cá nhân |
| AI | Có RAG trên hướng dẫn/dự án công khai: chunking, embeddings, pgvector, nguồn hiển thị. Nhóm 2 người cần ít nhất 2 capability; **năng lực thứ hai chưa chọn** |
| Thiếu/một phần | Google thật/human review US-1, xóa CRUD, pagination, real-time, upload, prompt files/version, eval ≥20 ca trước/sau cải tiến, log/cost/dashboard AI |

US-1 local: [chuẩn bị DB test, tạo admin và cấu hình Google](docs/us1-local.md).
| Kiểm chứng | Ngày 25/10: domain 41/41, frontend 15/15, adapter/lock 6/6 và auth smoke cô lập đạt. Backend API/RAG cần cập nhật test; chưa xác nhận full suite/deploy. [Chi tiết](docs/evidence/verification.md) |

Hiện trạng chi tiết: [traceability](docs/traceability.md); tiêu chí phải đạt: [requirements](docs/requirements.md). Không đổi scope sản phẩm chỉ bằng việc sửa/xóa tài liệu.

## 2. Chạy từ source trên Windows

Cần Node.js ≥22.18. Trong PowerShell tại root:

```powershell
npm.cmd install
Copy-Item be/.env.example be/.env
```

Chỉ copy khi chưa có env, giữ cấu hình hiện hữu. Điền JWT_SECRET riêng ≥32 ký tự, chọn DB/thư mục thử nghiệm phù hợp; startup có migration và tùy cấu hình seed. Không dùng dữ liệu thật để kiểm hướng dẫn.

```powershell
# Terminal backend
npm.cmd run dev:be
```

```powershell
# Terminal frontend
npm.cmd run dev:fe
```

Web mặc định http://localhost:3000, backend http://localhost:4000/health. Browser gọi `/api/*` cùng origin, Next rewrite tới BE. Có DATABASE_URL dùng PostgreSQL; không có dùng PGlite persistent trong DATA_DIR. Mock mode là prototype trong trình duyệt, không chứng minh tích hợp và không gọi được chat.

## 3. AI, container và cấu hình

Ollama phải được cài/khởi động, endpoint truy cập được từ backend. Model mặc định trong source:

```powershell
ollama pull qwen3:4b
ollama pull qwen3-embedding:0.6b
```

Chat local dùng Ollama; Gemini tùy chọn cần key backend và người dùng đăng nhập, **vẫn dùng Ollama embeddings**. Model cloud mặc định trong config chưa phải xác nhận khả dụng/quyền trên tài khoản thật. Chat hiện trả toàn bộ JSON, chưa streaming. Xem dữ liệu gửi provider, guardrails và giới hạn ở [AI design](docs/ai-design.md).

| Nơi | Biến môi trường cần cấu hình (không ghi secret ở đây) |
| :-- | :-- |
| Backend | JWT_SECRET, PORT, NODE_ENV, DATABASE_URL hoặc DATA_DIR, SEED_ON_EMPTY, ENABLE_DEV_LOGIN |
| AI backend | OLLAMA_BASE_URL, OLLAMA_MODEL, OLLAMA_EMBEDDING_MODEL; tùy chọn GEMINI_API_KEY, GEMINI_MODEL |
| Frontend | API_ORIGIN, NEXT_PUBLIC_API_MODE |

Mẫu: [BE](be/.env.example), [FE](fe/.env.example), [Compose env](.env.example). Không commit env, DB, backup, key hoặc dữ liệu định danh.

Có [Compose](docker-compose.yml) và Dockerfile, nhưng cần xử lý runtime pgvector và endpoint model/embeddings trước khi xác nhận demo container. Hướng dẫn và checklist tại [deployment.md](docs/deployment.md); chưa có URL bản deploy được kiểm lại trong đợt này. Sau khi đủ prerequisites, lệnh khởi động là `docker compose up --build --wait`; không coi cấu hình hiện tại là đã chạy đạt.

## 4. Tài khoản test và kiểm tra

Dev-login theo email chỉ dành môi trường thử, production luôn tắt. Email/ID fixture ở [demo-data.ts](packages/domain/src/demo-data.ts); không khẳng định có password hoặc tồn tại ở DB đang dùng. Nhóm cần xác nhận tài khoản demo theo vai; không dùng tài khoản cá nhân/secrets production và không reset DB để tạo demo.

```powershell
npm.cmd test
npm.cmd run typecheck
npm.cmd run build
npm.cmd run test:e2e
```

Đây là lệnh kiểm tra, không phải kết quả đạt. Trước E2E đọc [config](fe/playwright.config.ts), [helper](fe/e2e/local-servers.ts): helper đọc be/.env, chưa loại DATABASE_URL; DATA_DIR tạm chưa bảo đảm tách PostgreSQL thật. Cần test environment riêng và lưu output mới tại [evidence](docs/evidence/README.md).

## 5. Bản đồ code và bộ tài liệu chính

`be/src/modules`: route → middleware → controller → service → repository; `fe/src/app` route mỏng, UI ở presentation, HTTP/mock/session ở libs; types/rules thuần ở packages/domain. Chat có ngoại lệ tổ chức được ghi trong architecture.

| Tài liệu | Vai trò duy nhất |
| :-- | :-- |
| [Requirements](docs/requirements.md) | Bài toán, 12 US có task BE/FE, AC, tiêu chí đề và quyết định mở |
| [Traceability](docs/traceability.md) | Yêu cầu → API/component → source → test, hiện trạng và giới hạn kiểm chứng |
| [Architecture](docs/architecture.md) | Sơ đồ hiện tại, luồng nghiệp vụ/AI, dữ liệu và ranh giới |
| [AI design](docs/ai-design.md) | Model/prompt/RAG/guardrails/privacy/eval/telemetry và phương án AI thứ hai |
| [3 ADR](docs/adr/README.md) | Quyết định, phương án thay thế và trade-off; ít nhất một ADR về AI |
| [API contract](docs/api-contract.md) | Chỉ API/schema/quyền hiện có, tách khỏi tính năng dự kiến |
| [Deployment](docs/deployment.md) | Chạy local/container/hosting, DB/backup, prerequisites và smoke checklist |
| [Backlog](docs/backlog.md) | Việc còn thiếu, phụ thuộc/owner và điều kiện đóng, mốc 27/10 |
| [AI_USAGE](AI_USAGE.md) | Nhật ký chọn lọc theo module: công cụ, prompt chính, output, kiểm tra và chỉnh sửa |
| [Evidence](docs/evidence/README.md) | Kết quả kiểm chứng và các bằng chứng còn thiếu cho bản nộp |

Bộ tài liệu được tổ chức theo yêu cầu, thiết kế, module, kiểm chứng và việc cần hoàn thành cho bản nộp cuối kỳ. Requirements là nguồn phạm vi chính; AI_USAGE là nhật ký sử dụng AI hỗ trợ phát triển.

Hồ sơ cuối kỳ còn cần **PDF 10–20 trang**, **slide ≤15 trang**, **video 3–5 phút**, demo container/deploy và bảo vệ cá nhân. Bộ Markdown không tự đáp ứng các đầu ra đó.
