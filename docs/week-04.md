# Week 4 — Homework 4A evidence

**Bài:** Backend vertical slice
**Hạn:** trước buổi Thứ Sáu tuần 4
**Chủ sở hữu:** Phạm Văn Bảo An (backend) · rà soát chéo: Võ Tuấn Khanh

> **Cập nhật 15/09/2026:** backend đã chuyển vào cấu trúc module `be/src/modules`; frontend đã gọi được backend qua Next.js rewrite. Kết quả kiểm tra mới nhất và luồng request: [week-03-04-review.md](week-03-04-review.md).

---

## Checklist yêu cầu của đề bài

| # | Yêu cầu | Đã làm ở đâu | Trạng thái |
| :-- | :-- | :-- | :-- |
| 1 | Endpoint cho một luồng hoàn chỉnh | 12 endpoint phủ US-1, US-2, US-3 — bảng ở [api-contract.md §3](api-contract.md#3-danh-sách-endpoint) | ✅ |
| 2 | Validate input, trả mã thành công và lỗi phù hợp | zod ở tầng HTTP → 400; `packages/domain` → 403 / 409 / 422. Chính sách: [api-contract.md §2](api-contract.md#2-chính-sách-mã-trạng-thái) | ✅ |
| 3 | Lưu và đọc dữ liệu bền vững | PostgreSQL (PGlite) trong `be/.data/pglite`, lược đồ quản lý bằng migration Drizzle | ✅ |
| 4 | Health check và log hữu ích | `GET /health` chạy `select 1` thật vào database; log JSON cho mỗi request và mỗi sự kiện nghiệp vụ | ✅ |
| 5 | Secret nằm ngoài repo, có `.env.example` | `JWT_SECRET` bắt buộc — thiếu thì server từ chối khởi động; `.env` đã gitignore | ✅ |
| 6 | Test API tự động: ≥ 1 request hợp lệ, ≥ 1 không hợp lệ | [`be/tests/integration/api.test.ts`](../be/tests/integration/api.test.ts): 16 test qua HTTP thật | ✅ |
| 7 | Request examples | 25 request ghi từ server thật: [api-contract.md §6](api-contract.md#6-ví-dụ-ghi-lại-từ-server-thật); body mẫu: [`be/examples/`](../be/examples/) | ✅ |
| 8 | Log evidence | Mục "Log" bên dưới — trích nguyên văn | ✅ |
| 9 | Data proof | Mục "Bằng chứng dữ liệu bền vững" bên dưới | ✅ |
| 10 | An rà soát và giải thích được code | — | ⬜ **chưa làm** |

## Cách chạy

```bash
npm install
```

```bash
cp be/.env.example be/.env
```

Điền `JWT_SECRET` trong `be/.env`, rồi:

```bash
npm run dev:api
```

```bash
npm test -w gomnang-api
```

## Kịch bản kiểm tra trên lớp

Đúng 5 bước "Classroom verification" của Course Guide tuần 4. Chạy trong Git Bash, từ thư mục `be`.

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
| `be/.env` và `be/.data/` bị gitignore | `.gitignore`; đã kiểm bằng `git check-ignore` |
| `dev-login` tắt cứng khi `NODE_ENV=production`, bất kể biến `ENABLE_DEV_LOGIN` | `src/config.ts` |
| Chỉ chấp nhận JWT thuật toán HS256 — chặn kiểu tấn công đổi thuật toán trong header | `src/auth.ts` |
| Người điều phối lấy từ token, không bao giờ từ body | `src/routes.ts`; test #9 |
| Dự án chưa công khai trả 404 với người ngoài, không lộ là có tồn tại | `canViewProject`; test #10 |
| Lỗi 500 không trả stack trace cho client | `src/http.ts` |
| `/api/users` không trả email | `toMember` trong `packages/domain` |
| Body tối đa 100 KB; mọi chuỗi có giới hạn độ dài | `src/app.ts`, zod trong `src/routes.ts` |
| Mã UUID sai định dạng được coi là không tồn tại, không để lọt xuống PostgreSQL | `idParam` trong `src/routes.ts` |

## Giới hạn đã biết

| Giới hạn | Khi nào xử lý |
| :-- | :-- |
| Trình duyệt gọi API qua Next.js rewrite thay vì CORS trực tiếp | Đã xử lý trong phần tích hợp local |
| PGlite chỉ cho một tiến trình mở database; deploy cần đổi sang `node-postgres` + Supabase | Homework 4B |
| Chưa có `Dockerfile` | Homework 4B — và Docker Desktop trên máy nhóm hiện **không bật được engine** |
| Chưa upload ảnh bằng chứng | Sau 4B |
| `published → in_progress → completed` chưa có endpoint | Khi làm phần báo cáo kết quả |
| Người điều phối góp **tiền** vào chính dự án mình thì không ai xác nhận được: tự xác nhận bị cấm, còn tiền thì chỉ người điều phối được xác nhận | Cần nhóm quyết định quy tắc — hiện ghi nhận là giới hạn |
| Log tắt êm (`shutting down`, `database closed`) | Đã quan sát khi dừng backend của bài E2E; vẫn nên quay lại làm bằng chứng nộp |
| Chưa giới hạn tần suất request | Trước khi deploy công khai |

## Ba câu chắc chắn bị hỏi

**1. Vì sao có cả 400 lẫn 422, không gộp làm một?**
Hai lỗi nằm ở hai tầng khác nhau. `"targetQty": "một trăm"` không đọc được thành số → zod chặn ở `routes.ts` → 400. `"targetQty": 0` đọc được nhưng vi phạm quy tắc "nhu cầu phải lớn hơn 0" → `packages/domain` chặn → 422. Tách ra thì client biết lỗi là do *mình gửi sai hình dạng* hay do *người dùng nhập sai giá trị*.

**2. Hai người cùng cam kết phần cuối cùng của một hạng mục thì sao?**
`lockNeedWithTotals` trong `src/modules/contributions/contributions.repository.ts` chạy `SELECT … FOR UPDATE` trên dòng hạng mục nhu cầu, *trong* transaction, *trước khi* tính tổng đã cam kết. Người thứ hai phải đợi người thứ nhất ghi xong mới đọc được tổng — nên đọc ra tổng mới, và bị từ chối 422 nếu đã hết chỗ.

**3. Vì sao bản nháp của người khác trả 404 mà không phải 403?**
403 ngầm nói "dự án này có thật, chỉ là bạn không được xem". Với dự án chưa qua xác minh, việc nó tồn tại đã là thông tin không nên lộ.

## Blocker

**Blocker chính:** toàn bộ code backend do AI sinh. **An chưa rà soát.** Điểm "Student understanding" là 2/10, và bước 5 của kiểm tra trên lớp bắt một thành viên ngẫu nhiên giải thích mã trạng thái và quy tắc nghiệp vụ.
*Hành động:* trước Thứ Sáu, An đọc theo đúng đường đi của một request — `src/app.ts` → `modules/auth/auth.middleware.ts` → `modules/projects/projects.route.ts` → controller → service → repository → `packages/domain` — và tự trả lời được ba câu ở trên mà không nhìn tài liệu.

**Rủi ro cho 4B:** Docker Desktop đã cài nhưng engine không chạy (`docker info` báo không kết nối được). Homework 4B yêu cầu đóng gói bằng Docker hoặc một cách tái lập tương đương — cần bật được Docker, hoặc chuẩn bị lý do để dùng cách tương đương.

**Nợ cũ vẫn treo:** cần xác nhận commit cuối đã push lên GitHub; chưa chạy LLM smoke test (2B); chưa phỏng vấn người dùng thật (1B).
