# Week 4 — Homework 4A và 4B evidence

**Bài:** 4A — Backend vertical slice · 4B — Integrated and deployable non-AI application
**Hạn:** 4A trước buổi Thứ Sáu tuần 4 · 4B trước buổi Thứ Ba tuần 5
**Chủ sở hữu:** Phạm Văn Bảo An (backend, triển khai) · Võ Tuấn Khanh (nối frontend) · rà soát chéo lẫn nhau

> Phần 4A bên dưới giữ nguyên nội dung như lúc nộp; riêng đường dẫn file trong cả hai phần đã cập nhật theo cấu trúc repo mới ngày 2026-09-15. Một số điều trong đó đã đổi ở 4B — CORS đã bật, đã có Dockerfile, và Docker trên máy **chạy được** (lúc 4A ghi "engine không chạy" là sai: Docker Desktop chỉ chưa được mở). Phần 4B ở [cuối file](#homework-4b--integrated-and-deployable-non-ai-application).

---

## Homework 4A — Backend vertical slice

---

## Checklist yêu cầu của đề bài

| # | Yêu cầu | Đã làm ở đâu | Trạng thái |
| :-- | :-- | :-- | :-- |
| 1 | Endpoint cho một luồng hoàn chỉnh | 12 endpoint phủ US-1, US-2, US-3 — bảng ở [api-contract.md §3](api-contract.md#3-danh-sách-endpoint) | ✅ |
| 2 | Validate input, trả mã thành công và lỗi phù hợp | zod ở tầng HTTP → 400; `shared` → 403 / 409 / 422. Chính sách: [api-contract.md §2](api-contract.md#2-chính-sách-mã-trạng-thái) | ✅ |
| 3 | Lưu và đọc dữ liệu bền vững | PostgreSQL (PGlite) trong `backend/.data/`, lược đồ quản lý bằng migration Drizzle | ✅ |
| 4 | Health check và log hữu ích | `GET /health` chạy `select 1` thật vào database; log JSON cho mỗi request và mỗi sự kiện nghiệp vụ | ✅ |
| 5 | Secret nằm ngoài repo, có `.env.example` | `JWT_SECRET` bắt buộc — thiếu thì server từ chối khởi động; `.env` đã gitignore | ✅ |
| 6 | Test API tự động: ≥ 1 request hợp lệ, ≥ 1 không hợp lệ | [`backend/test/api.test.ts`](../backend/test/api.test.ts): 16 test qua HTTP thật | ✅ |
| 7 | Request examples | 25 request ghi từ server thật: [api-contract.md §6](api-contract.md#6-ví-dụ-ghi-lại-từ-server-thật); body mẫu: [`backend/examples/`](../backend/examples/) | ✅ |
| 8 | Log evidence | Mục "Log" bên dưới — trích nguyên văn | ✅ |
| 9 | Data proof | Mục "Bằng chứng dữ liệu bền vững" bên dưới | ✅ |
| 10 | An rà soát và giải thích được code | — | ⬜ **chưa làm** |

## Cách chạy

```bash
npm install
```

```bash
cp backend/.env.example backend/.env
```

Điền `JWT_SECRET` trong `backend/.env`, rồi:

```bash
npm run dev:backend
```

```bash
npm test -w gomnang-backend
```

## Kịch bản kiểm tra trên lớp

Đúng 5 bước "Classroom verification" của Course Guide tuần 4. Chạy trong Git Bash, từ thư mục `backend`.

**1. Bật backend, gọi health check**

```bash
npm run dev
```

```bash
curl -i http://localhost:4000/health
```

Mong đợi `HTTP/1.1 200` và `{"status":"ok","db":"ok",...}`.

**2. Một request hợp lệ, một request không hợp lệ**

```bash
TOKEN=$(curl -s -X POST http://localhost:4000/api/auth/dev-login -H "content-type: application/json" --data '{"email":"khanh@gomnang.test"}' | node -e "process.stdin.on('data',d=>console.log(JSON.parse(d).token))")
```

```bash
curl -i -X POST http://localhost:4000/api/projects -H "content-type: application/json" -H "authorization: Bearer $TOKEN" --data-binary @examples/project-valid.json
```

→ `201`. Rồi request vi phạm BR-003:

```bash
curl -i -X POST http://localhost:4000/api/projects -H "content-type: application/json" -H "authorization: Bearer $TOKEN" --data-binary @examples/project-br003.json
```

→ `422` kèm `details.treasurerId`. Muốn thấy 400 thì dùng `examples/project-bad-type.json`.

**3. Chỉ ra trạng thái database và log**

Log hiện ngay trong terminal đang chạy server — mỗi request một dòng. Để xem database, tắt server (Ctrl+C) rồi:

```bash
npm run sql -- "select name, status, coordinator_id from projects order by created_at desc limit 3"
```

```bash
npm run sql -- "select entity_type, from_state, to_state, at from audit_log order by at desc limit 5"
```

Thử sửa sổ ghi vết để chứng minh database tự chặn:

```bash
npm run sql -- "update audit_log set to_state = 'published'"
```

→ `PostgreSQL từ chối: audit_log is append-only: UPDATE is not allowed`.

**4. Tắt server, bật lại, lặp lại request chính**

```bash
npm run dev
```

Nhìn log khởi động: có dòng `api started` nhưng **không có** dòng `database was empty, demo data loaded` — nghĩa là database cũ vẫn còn, không bị nạp lại từ đầu. Gọi lại dự án vừa tạo ở bước 2 → vẫn `200`, dữ liệu y nguyên.

**5. Giải thích mã trạng thái và quy tắc nghiệp vụ** — xem mục "Ba câu chắc chắn bị hỏi" ở cuối file.

## Test tự động

Kết quả lần chạy cuối — **16/16 pass**:

| # | Test | Loại |
| :-- | :-- | :-- |
| 1 | `GET /health` → 200 và database sống | Hợp lệ |
| 2 | tạo dự án khi chưa đăng nhập → 401 | Không hợp lệ |
| 3 | token giả → 401 | Không hợp lệ |
| 4 | tạo dự án → 201, là bản nháp, có một dòng sổ ghi vết | **Hợp lệ** |
| 5 | sai kiểu dữ liệu → 400 và chỉ đúng trường sai | **Không hợp lệ** |
| 6 | body không phải JSON → 400 | Không hợp lệ |
| 7 | BR-003 người phụ trách tài chính trùng người điều phối → 422 | Không hợp lệ |
| 8 | BR-002 người phụ trách tài chính chưa xác minh → 422 | Không hợp lệ |
| 9 | không mạo danh được người điều phối bằng cách tự gửi `coordinatorId` | Bảo mật |
| 10 | bản nháp bị ẩn với khách và người ngoài → 404, người điều phối vẫn xem được | Phân quyền |
| 11 | luồng đầy đủ: tạo → gửi xác minh → duyệt → cam kết → bàn giao → xác nhận | Hợp lệ, kèm 409 · 403 · 422 · 422 · 403 ở giữa |
| 12 | người xác minh không được duyệt dự án mà chính mình điều phối → 403 | Phân quyền |
| 13 | sổ ghi vết không sửa, không xoá được — kể cả bằng SQL chạy thẳng vào database | Toàn vẹn dữ liệu |
| 14 | database tự chặn BR-003 kể cả khi code quên kiểm | Toàn vẹn dữ liệu |
| 15 | endpoint không tồn tại → 404 | Không hợp lệ |
| 16 | tắt server rồi bật lại trên cùng thư mục dữ liệu → dự án vừa tạo vẫn còn | Dữ liệu bền vững |

Test mở server ở cổng ngẫu nhiên và gọi bằng `fetch` thật, database là PGlite trong RAM nạp dữ liệu mẫu — mỗi lần chạy bắt đầu từ cùng một trạng thái. Toàn bộ repo: `npm test` → 27 + 16 + 8 = **51/51 pass**; `npm run typecheck` sạch.

## Log

Trích nguyên văn từ server chạy ngày 2026-09-14, trong lúc chạy chuỗi request ở [api-contract.md §6](api-contract.md#6-ví-dụ-ghi-lại-từ-server-thật):

```json
{"time":"2026-09-14T13:21:06.300Z","level":"info","msg":"database was empty, demo data loaded"}
{"time":"2026-09-14T13:21:06.307Z","level":"info","msg":"api started","port":4000,"env":"development","dataDir":".data/pglite","devLogin":true}
{"time":"2026-09-14T13:26:01.056Z","level":"info","msg":"request","requestId":"b99c4187-a4be-4c4b-8151-b99dc8b1e738","method":"GET","path":"/health","status":200,"durationMs":2,"userId":null}
{"time":"2026-09-14T13:26:01.874Z","level":"info","msg":"project created","projectId":"02be8f8d-3ac7-40d9-9189-0ac58fd62ec0","userId":"00000000-0000-4000-8000-000000000001"}
{"time":"2026-09-14T13:26:01.880Z","level":"info","msg":"request","requestId":"da374977-a262-4f10-b18e-ed12178038ad","method":"POST","path":"/api/projects","status":201,"durationMs":108,"userId":"00000000-0000-4000-8000-000000000001"}
{"time":"2026-09-14T13:26:02.202Z","level":"warn","msg":"request","requestId":"ce0835cb-3626-40e4-8a50-fbed10050b90","method":"POST","path":"/api/projects","status":400,"durationMs":3,"userId":"00000000-0000-4000-8000-000000000001"}
{"time":"2026-09-14T13:26:02.384Z","level":"warn","msg":"request","requestId":"e39d94c4-6322-4fd7-90a8-258cf14c5a4e","method":"POST","path":"/api/projects","status":422,"durationMs":4,"userId":"00000000-0000-4000-8000-000000000001"}
{"time":"2026-09-14T13:26:02.820Z","level":"info","msg":"project submitted","projectId":"02be8f8d-3ac7-40d9-9189-0ac58fd62ec0","userId":"00000000-0000-4000-8000-000000000001","verdict":"FLAG"}
{"time":"2026-09-14T13:26:05.105Z","level":"warn","msg":"request","requestId":"5fd25b51-98bb-4a00-8d28-3dd0a9cf5ff1","method":"POST","path":"/api/contributions/1eca071b-9f2e-46ca-bf21-122697bffff1/transition","status":403,"durationMs":4,"userId":"00000000-0000-4000-8000-000000000002"}
{"time":"2026-09-14T13:26:05.828Z","level":"warn","msg":"token rejected","reason":"JWS Protected Header is invalid"}
{"time":"2026-09-14T13:26:05.828Z","level":"warn","msg":"request","requestId":"c077bd17-096f-42ff-9aed-7926db31561b","method":"GET","path":"/api/users","status":401,"durationMs":1,"userId":null}
```

Cách đọc:

- **Hai loại dòng.** `msg: "request"` ghi mọi request sau khi đã trả lời: ai gọi, gọi gì, mã trạng thái, mất bao lâu. Các `msg` khác là **sự kiện nghiệp vụ**: tạo dự án, gửi xác minh kèm kết luận của người gác cổng, cam kết đóng góp...
- **Mức log theo mã trạng thái.** 2xx là `info`, 4xx là `warn`, 5xx là `error`. Lọc riêng lỗi của client hay lỗi của server chỉ cần lọc theo `level`.
- **`requestId` nối log với client.** Server trả cùng giá trị trong header `x-request-id`. Người dùng báo lỗi 500 thì message chỉ chứa mã tra cứu, còn chi tiết và stack trace nằm ở dòng log có đúng mã đó.
- **Không ghi dữ liệu nhạy cảm.** Log không chứa token, body request, email, hay nội dung mô tả dự án. Dòng `token rejected` chỉ ghi *lý do* token bị từ chối.

## Bằng chứng dữ liệu bền vững

**Kiểm tay trên server thật, 2026-09-14:**

| Thời điểm (UTC) | Việc | Bằng chứng |
| :-- | :-- | :-- |
| 13:26:01 → 13:26:05 | Chạy trọn luồng: tạo dự án `02be8f8d-…`, gửi xác minh, duyệt, An cam kết 30 phần cơm, bàn giao, Khanh xác nhận | Log ở trên |
| — | **Dừng tiến trình server** | — |
| 13:30:29 | Bật lại server trên cùng thư mục dữ liệu | Log chỉ có `api started`, **không có** `database was empty, demo data loaded` |
| 13:32:07 | `GET /api/projects/02be8f8d-…` | `200` · `status: "published"` · Cơm `committedQty 30`, `confirmedQty 30` · sổ ghi vết **6 dòng** |

**Kiểm tự động:** test #16 làm đúng việc trên trong thư mục tạm, chạy lại được bất cứ lúc nào.

**Database tự bảo vệ dữ liệu, không trông vào code backend:**

| Cơ chế trong PostgreSQL | Chặn cái gì | Bằng chứng |
| :-- | :-- | :-- |
| Trigger `audit_log_no_update_delete`, `audit_log_no_truncate` | Sửa, xoá, truncate sổ ghi vết | Test #13; lệnh `npm run sql` ở bước 3 kịch bản |
| CHECK `projects_treasurer_not_coordinator` | Người giữ tiền trùng người điều phối (BR-003) | Test #14 |
| CHECK `need_items_target_positive`, `contributions_quantity_positive` | Số lượng âm hoặc bằng 0 | Migration `0000_init.sql` |
| CHECK `projects_end_after_start` | Ngày kết thúc trước ngày bắt đầu | Migration `0000_init.sql` |
| Khoá ngoại **không** `ON DELETE CASCADE` từ `audit_log` sang `projects` | Xoá một dự án đã có lịch sử | Lược đồ `src/db/schema.ts` |

## BR-003 được giữ ở bốn lớp

| Lớp | Cơ chế | Nếu lớp này hỏng thì sao |
| :-- | :-- | :-- |
| Form trên trình duyệt | `validateProject` báo lỗi ngay ở ô "Người phụ trách tài chính" | Người dùng chỉ thấy lỗi muộn hơn — không mất an toàn |
| API | Gọi lại **đúng** `validateProject` → 422 | CHECK constraint ở database vẫn chặn |
| Database | CHECK `projects_treasurer_not_coordinator` | Lớp cuối cùng |
| Xác nhận đóng góp bằng tiền | `canTransitionContribution` → 403 `MONEY_NEEDS_COORDINATOR` | Tách người nhận tiền khỏi người xác nhận đã nhận tiền |

## Bảo mật

| Biện pháp | Ở đâu |
| :-- | :-- |
| `JWT_SECRET` bắt buộc, ≥ 32 ký tự; thiếu thì không khởi động | `src/config.ts` |
| `backend/.env` và `backend/.data/` bị gitignore | `.gitignore`; đã kiểm bằng `git check-ignore` |
| `dev-login` tắt cứng khi `NODE_ENV=production`, bất kể biến `ENABLE_DEV_LOGIN` | `src/config.ts` |
| Chỉ chấp nhận JWT thuật toán HS256 — chặn kiểu tấn công đổi thuật toán trong header | `src/modules/auth/auth.service.ts` |
| Người điều phối lấy từ token, không bao giờ từ body | `src/modules/projects/projects.service.ts`; test #9 |
| Dự án chưa công khai trả 404 với người ngoài, không lộ là có tồn tại | `canViewProject`; test #10 |
| Lỗi 500 không trả stack trace cho client | `src/common/errors.ts` |
| `/api/users` không trả email | `toMember` trong `shared` |
| Body tối đa 100 KB; mọi chuỗi có giới hạn độ dài | `src/app.ts`, zod trong `src/modules/*/*.routes.ts` |
| Mã UUID sai định dạng được coi là không tồn tại, không để lọt xuống PostgreSQL | `idParam` trong `src/common/validation.ts` |

## Giới hạn đã biết

| Giới hạn | Khi nào xử lý |
| :-- | :-- |
| Chưa bật CORS nên trình duyệt chưa gọi được API từ `localhost:3000` | Homework 4B, lúc nối frontend |
| PGlite chỉ cho một tiến trình mở database; deploy cần đổi sang `node-postgres` + Supabase | Homework 4B |
| Chưa có `Dockerfile` | Homework 4B — và Docker Desktop trên máy nhóm hiện **không bật được engine** |
| Chưa upload ảnh bằng chứng | Sau 4B |
| `published → in_progress → completed` chưa có endpoint | Khi làm phần báo cáo kết quả |
| Người điều phối góp **tiền** vào chính dự án mình thì không ai xác nhận được: tự xác nhận bị cấm, còn tiền thì chỉ người điều phối được xác nhận | Cần nhóm quyết định quy tắc — hiện ghi nhận là giới hạn |
| Log khi tắt êm (`shutting down`, `database closed`) **chưa kiểm được trên Windows** — lần kiểm tay dừng tiến trình trực tiếp | Kiểm lại bằng Ctrl+C trên máy thật |
| Chưa giới hạn tần suất request | Trước khi deploy công khai |

## Ba câu chắc chắn bị hỏi

**1. Vì sao có cả 400 lẫn 422, không gộp làm một?**
Hai lỗi nằm ở hai tầng khác nhau. `"targetQty": "một trăm"` không đọc được thành số → zod chặn ở file `*.routes.ts` của module → 400. `"targetQty": 0` đọc được nhưng vi phạm quy tắc "nhu cầu phải lớn hơn 0" → `shared` chặn → 422. Tách ra thì client biết lỗi là do *mình gửi sai hình dạng* hay do *người dùng nhập sai giá trị*.

**2. Hai người cùng cam kết phần cuối cùng của một hạng mục thì sao?**
`lockNeedWithTotals` trong `src/modules/contributions/contributions.repository.ts` chạy `SELECT … FOR UPDATE` trên dòng hạng mục nhu cầu, *trong* transaction, *trước khi* tính tổng đã cam kết. Người thứ hai phải đợi người thứ nhất ghi xong mới đọc được tổng — nên đọc ra tổng mới, và bị từ chối 422 nếu đã hết chỗ.

**3. Vì sao bản nháp của người khác trả 404 mà không phải 403?**
403 ngầm nói "dự án này có thật, chỉ là bạn không được xem". Với dự án chưa qua xác minh, việc nó tồn tại đã là thông tin không nên lộ.

## Blocker

**Blocker chính:** toàn bộ code backend do AI sinh. **An chưa rà soát.** Điểm "Student understanding" là 2/10, và bước 5 của kiểm tra trên lớp bắt một thành viên ngẫu nhiên giải thích mã trạng thái và quy tắc nghiệp vụ.
*Hành động:* trước Thứ Sáu, An đọc theo đúng đường đi của một request — `src/app.ts` → `src/modules/auth/auth.middleware.ts` → `src/modules/projects/projects.routes.ts` → `projects.service.ts` → `shared/src/rules.ts` → `projects.repository.ts` — và tự trả lời được ba câu ở trên mà không nhìn tài liệu.

**Rủi ro cho 4B:** Docker Desktop đã cài nhưng engine không chạy (`docker info` báo không kết nối được). Homework 4B yêu cầu đóng gói bằng Docker hoặc một cách tái lập tương đương — cần bật được Docker, hoặc chuẩn bị lý do để dùng cách tương đương.

**Nợ cũ vẫn treo:** repo chưa push lên GitHub; chưa chạy LLM smoke test (2B); chưa phỏng vấn người dùng thật (1B).

---

## Homework 4B — Integrated and deployable non-AI application

### Checklist yêu cầu của đề bài

| # | Yêu cầu | Đã làm ở đâu | Trạng thái |
| :-- | :-- | :-- | :-- |
| 1 | Nối frontend vào backend thật và dữ liệu bền vững | [`frontend/src/lib/api-client.ts`](../frontend/src/lib/api-client.ts) gọi `fetch`, token lấy từ `dev-login`; backend bật CORS | ✅ |
| 2 | Đóng gói bằng Docker hoặc cách tái lập tương đương | [`backend/Dockerfile`](../backend/Dockerfile), [`frontend/Dockerfile`](../frontend/Dockerfile), [`docker-compose.yml`](../docker-compose.yml): web + API + PostgreSQL 17 bằng một lệnh | ✅ |
| 3 | Deploy khi khả thi | Database Supabase **đã tạo**. Backend Render và web Vercel làm theo [`deployment.md`](deployment.md) — cần nhóm tự đăng nhập | ⬜ **chờ nhóm làm Bước 2–4** |
| 4 | Tài liệu biến môi trường, cài đặt, khởi động, tắt, lệnh test | README: "Cách 1", "Cách 2", "Chạy test", "Cấu hình nằm ở đâu"; ba file `.env.example` | ✅ |
| 5 | Chứng minh một lỗi mạng, validation hoặc dịch vụ được xử lý | Tắt container API giữa chừng — mục "Lỗi được xử lý" | ✅ |
| 6 | Video luồng chính | — | ⬜ nhóm tự quay |
| 7 | Test | `npm test`: domain 27 · API 22 · web 7 = **56/56 pass** | ✅ |
| 8 | Exact commit hash | _(điền `git rev-parse HEAD` lúc nộp)_ | ⬜ |

### Thay đổi so với 4A

| Phần | Thay đổi |
| :-- | :-- |
| Frontend | `lib/api.ts`: mock trong localStorage → `fetch` tới backend (nay là `src/lib/api-client.ts` cùng `src/features/*/*.api.ts`). `lib/session.ts` lưu token JWT. Ô chọn tài khoản gọi `POST /api/auth/dev-login`. Bỏ thanh "Chế độ demo" — lỗi bây giờ là lỗi thật. Lỗi không có response quy về `status 0` với mã `NETWORK_ERROR` hoặc `TIMEOUT` (15 giây) |
| Backend | CORS theo `CORS_ORIGINS`. Hai driver: PGlite khi không có `DATABASE_URL`, `node-postgres` khi có, kèm TLS. Migration `0002` bật Row Level Security. Biến `ALLOW_DEMO_LOGIN_IN_PRODUCTION`. Log không bao giờ ghi `DATABASE_URL` |
| Đóng gói | Hai Dockerfile, `.dockerignore`, `docker-compose.yml`, `render.yaml` |
| Test | Test web giờ cho client thật gọi backend thật chạy trong cùng tiến trình (7). API thêm 1 test CORS và 5 test cấu hình |

Lý do từng quyết định: [architecture.md D-14 → D-20](architecture.md#6-quyết-định-kỹ-thuật-đã-chốt).

### Kiểm chứng trên Docker Compose — PostgreSQL 17 thật

Chạy ngày 2026-09-14 bằng `docker compose up -d --wait`. Image: `gomnang-api` 209 MB, `gomnang-web` 225 MB.

Log khởi động của container API, nguyên văn:

```json
{"time":"2026-09-14T16:28:19.688Z","level":"info","msg":"database was empty, demo data loaded"}
{"time":"2026-09-14T16:28:19.688Z","level":"warn","msg":"demo login is enabled in production: anyone can sign in as a demo account","flag":"ALLOW_DEMO_LOGIN_IN_PRODUCTION"}
{"time":"2026-09-14T16:28:19.693Z","level":"info","msg":"api started","port":4000,"env":"production","database":"postgres (tls off)","devLogin":true,"corsOrigins":["http://localhost:3000"]}
```

Chạy trọn luồng bằng curl vào container:

| Request | Mã | Kết quả |
| :-- | :-- | :-- |
| `GET /health` | 200 | `{"status":"ok","db":"ok"}` |
| Tạo dự án hợp lệ | 201 | `status: draft`, `startDate: "2026-12-20"` — kiểu ngày đọc về từ Postgres đúng dạng chuỗi |
| Tạo dự án vi phạm BR-003 | 422 | `VALIDATION_FAILED` |
| Tạo dự án sai kiểu dữ liệu | 400 | `BAD_REQUEST` |
| Gửi xác minh | 200 | Người gác cổng: `FLAG`, 1 tín hiệu trùng tên |
| Trả lại không ghi lý do | 422 | `REASON_REQUIRED` |
| Duyệt | 200 | `status: published` |
| Cam kết 30 | 201 | `status: committed` |
| Cam kết 71 khi chỉ còn thiếu 70 | 422 | `EXCEEDS_REMAINING` |
| Người đóng góp báo đã bàn giao | 200 | `status: delivered` |
| Người đóng góp tự xác nhận | 403 | `SELF_CONFIRMATION` |
| Người điều phối xác nhận | 200 | `status: confirmed` |
| Đọc lại dự án | 200 | Cơm `[cam kết 30, bàn giao 30, xác nhận 30]`; sổ ghi vết `draft › pending_verification › published › committed › delivered › confirmed` |

Kiểm tra thêm:

| Kiểm tra | Kết quả |
| :-- | :-- |
| Preflight `OPTIONS /api/projects` từ `http://localhost:3000` | `204`, có `Access-Control-Allow-Origin: http://localhost:3000` và `Access-Control-Allow-Headers: content-type, authorization` |
| Request từ origin lạ `https://la.example` | Không có header `Access-Control-Allow-Origin` nào |
| RLS trong Postgres (`pg_class.relrowsecurity`) | `true` ở cả 6 bảng |
| Migration đã chạy (`drizzle.__drizzle_migrations`) | 3 |
| `UPDATE audit_log SET to_state = 'published'` chạy thẳng bằng `psql` | `ERROR: audit_log is append-only: UPDATE is not allowed` |
| `docker compose restart backend` rồi đọc lại dự án | Log chỉ có thêm `api started` lúc 16:28:43, **không** có `database was empty`; dự án vẫn `published`, sổ ghi vết vẫn 6 dòng |

### Kiểm chứng trên trình duyệt

Web chạy trong container ở `http://localhost:3000`, gọi API trong container.

| # | Thao tác | Quan sát |
| :-- | :-- | :-- |
| 1 | Khách mở trang chủ | 3 dự án lấy từ API — gồm cả dự án vừa tạo bằng curl ở trên. Không còn thanh "Chế độ demo" |
| 2 | Chọn tài khoản Khanh | Tab Network: `OPTIONS /api/auth/dev-login` → 204, rồi `POST` → 200. localStorage có phiên, token đúng dạng JWT ba phần |
| 3 | Mở dự án Hoa Mai | Nút hiện theo vai trò của Khanh (người điều phối): dòng của Mai "Đã cam kết" có nút **Đã bàn giao**, dòng của Hùng "Đã bàn giao" có nút **Xác nhận**, dòng đã xác nhận không có nút. Sổ ghi vết 12 dòng |

### Lỗi được xử lý: tắt backend giữa chừng

Đây là tình huống đề bài yêu cầu chứng minh. Chạy lại trên lớp được:

```bash
docker compose stop backend
```

| # | Thao tác khi API đang tắt | Quan sát |
| :-- | :-- | :-- |
| A | Mở trang chủ | Khung lỗi `role="alert"`: **"Không tải được dữ liệu — Không kết nối được máy chủ. Kiểm tra mạng, hoặc máy chủ có đang chạy không, rồi thử lại."** kèm nút **Thử lại**. Thanh điều hướng vẫn dùng được, trang không trắng |
| B | Vào Tạo dự án, điền đủ form rồi gửi | Ô người phụ trách tài chính báo *"Không tải được danh sách thành viên"*. Gửi → cảnh báo lỗi kèm mã `NETWORK_ERROR` và dòng *"Nội dung bạn nhập vẫn còn nguyên"*; ô tên vẫn giữ "Góc đọc sách khu phố 5"; nút gửi bấm lại được |

```bash
docker compose start backend
```

| # | Thao tác khi API chạy lại | Quan sát |
| :-- | :-- | :-- |
| C | Bấm gửi lại chính form đó — không nhập lại gì | Tab Network: lần gửi lúc API tắt ghi `ERR_CONNECTION_REFUSED`, lần gửi lại `POST /api/projects` → **201**. Trang chuyển sang dự án mới `/projects/615eec8d-…`, trạng thái "Bản nháp" |

**Vì sao chạy đúng:** `fetch` chỉ ném lỗi khi không nhận được response nào. `src/lib/api-client.ts` bắt lỗi đó và đổi thành `ApiError` với `status 0`. `ApiErrorState` chỉ hiện nút "Thử lại" cho lỗi mạng và lỗi 5xx — thiếu quyền (403) hay không tồn tại (404) thì thử lại cũng vô ích. Form không xoá dữ liệu khi lỗi, vì state của form chỉ bị thay khi gửi thành công.

### Deploy

| Phần | Nơi chạy | Trạng thái | Địa chỉ |
| :-- | :-- | :-- | :-- |
| Database | Supabase, project `GomNang`, ref `fgabywgcwlqnzbvngiet`, Singapore, gói miễn phí | ✅ tạo 2026-09-14 | Chỉ backend kết nối |
| Backend | Render, Docker, [`render.yaml`](../render.yaml) | ⬜ nhóm làm theo [deployment.md](deployment.md) Bước 2 | _(điền)_ |
| Web | Vercel, Root Directory `frontend` | ⬜ Bước 3–4 | _(điền)_ |

Sau khi deploy xong cần ghi vào đây: địa chỉ web và API, output `curl <api>/health`, thời gian lần mở đầu tiên sau khi service ngủ (đo thật, không đoán), và kết quả Security Advisor của Supabase.

### Giới hạn đã biết

| Giới hạn | Hệ quả | Hướng xử lý |
| :-- | :-- | :-- |
| TLS tới Supabase chưa kiểm chứng chứng chỉ (D-20) | Mã hoá có, nhưng chưa chống giả mạo máy chủ database | Đặt `DATABASE_CA_CERT` |
| Bản deploy cho đăng nhập bằng tài khoản mẫu (D-19) | Ai có link cũng sửa được dữ liệu | Chấp nhận vì dữ liệu giả; tắt sau buổi demo |
| Token nằm trong localStorage | Script lạ chạy được trên trang (XSS) sẽ đọc được token | Cookie `httpOnly` khi làm đăng nhập thật |
| Không còn "Chế độ demo" | Muốn trình bày mạng chậm phải dùng DevTools → Network → Throttling | — |
| `NEXT_PUBLIC_API_URL` gắn vào code lúc build | Đổi địa chỉ API phải build lại web | Cố ý như vậy |
| Link preview của Vercel không có trong `CORS_ORIGINS` | Chỉ link production gọi được API | Thêm origin nếu cần |
| Chưa giới hạn tần suất request | Link công khai có thể bị spam | Trước khi dùng với người thật |
| Image Docker mới build và chạy trên máy này (linux/amd64) | Chưa kiểm trên Render | Kiểm khi deploy |

### Ba câu chắc chắn bị hỏi

**1. `curl` gọi API được, sao trình duyệt ở `localhost:3000` lại cần CORS?**
CORS là luật của **trình duyệt**, không phải lớp bảo mật của API. Trình duyệt không cho trang ở origin này đọc response từ origin khác, trừ khi server gửi header cho phép. `curl` không phải trình duyệt nên không bị chặn. Thứ bảo vệ API thật là token và phân quyền trong `shared`.

**2. Vì sao đổi `NEXT_PUBLIC_API_URL` trên Vercel phải build lại?**
Code frontend chạy trên máy người dùng, không đọc được biến môi trường của máy chủ. Next.js chép giá trị của các biến `NEXT_PUBLIC_` thẳng vào file JavaScript **lúc build** — cũng vì vậy mà không bao giờ được để secret trong biến `NEXT_PUBLIC_`.

**3. Database đã có mật khẩu, sao còn phải bật RLS trên Supabase?**
Supabase ngoài cổng PostgreSQL còn tự mở một REST API (Data API) cho mọi bảng trong schema `public`, xác thực bằng *anon key* — thứ vốn được thiết kế để công khai. Không bật RLS thì ai có anon key là đọc, ghi được bảng mà không cần mật khẩu database. Bật RLS mà không tạo policy nào thì đường đó bị chặn hết; backend kết nối bằng role sở hữu bảng nên không bị ảnh hưởng.

### Blocker 4B

**Blocker chính:** phần deploy Render và Vercel cần nhóm tự đăng nhập bằng GitHub và cấp quyền đọc repo private — AI không đăng nhập hay tạo tài khoản thay được. Làm theo đúng thứ tự trong [deployment.md](deployment.md), mỗi bước có cách kiểm tra.

**Rà soát:** An đọc `backend/Dockerfile`, `backend/src/db/client.ts`, `docker-compose.yml`, `render.yaml`. Khanh đọc `frontend/src/lib/api-client.ts`, `frontend/src/lib/session.ts`, `frontend/Dockerfile`.
