# AI usage log — GOM NẮNG

Theo mục 8 Course Guide: ghi lại việc dùng AI đáng kể, gồm *task, tool/model, file sinh ra hoặc bị sửa, phần con người đã rà soát, và các chỉnh sửa đã thực hiện*.

---

## 2026-09-08 — Soạn hồ sơ Homework 2B

| Mục | Nội dung |
| :-- | :-- |
| **Task** | Đọc bản đặc tả bài toán, slide môn học và course guide; soạn đề xuất dự án, sơ đồ kiến trúc, backlog 8 tuần và script LLM smoke test |
| **Tool / model** | Claude Code (Claude Opus 5) |
| **File sinh ra** | `README.md`, `.env.example`, `.gitignore`, `docs/proposal.md`, `docs/architecture.md`, `docs/backlog.md`, `docs/week-02.md`, `docs/ai-usage-log.md`, `scripts/llm-smoke-test.mjs` |
| **Đầu vào đã cung cấp cho AI** | Đặc tả bài toán trên Google Docs của nhóm, 2 file slide PDF của môn học, course & homework plan. Không có dữ liệu cá nhân của người thật |
| **Đã kiểm chứng bằng máy** | `node --check scripts/llm-smoke-test.mjs` — cú pháp hợp lệ. Chạy thử 2 nhánh lỗi: provider không hợp lệ và thiếu API key, cả hai thoát sạch với mã 1 |
| **CHƯA kiểm chứng** | Nhánh gọi model thật của cả 4 provider — chưa có API key. Số liệu độ trễ **chưa tồn tại**, không được điền tay |
| **Human review** | ⬜ **Chưa hoàn tất.** Khanh và An phải đọc lại toàn bộ trước khi nộp |

### Việc con người bắt buộc phải làm trước khi nộp

1. **Đọc và sửa `docs/proposal.md`** — đặc biệt §3 user stories và §4 vertical slice. Đây là phần giảng viên sẽ hỏi ngẫu nhiên; nếu có câu nào nhóm không giải thích được thì phải viết lại theo cách nhóm hiểu, hoặc bỏ.
2. **Kiểm tra lại các con số và tên riêng** — tên model trong `scripts/llm-smoke-test.mjs` (`gemini-2.5-flash`, `claude-sonnet-5`, `gpt-4o-mini`) do AI đề xuất theo trí nhớ, **phải đối chiếu với tài liệu provider tại thời điểm chạy**; model bị đổi tên hoặc ngừng phục vụ là chuyện thường.
3. **Kiểm tra lập luận về gói miễn phí của Render** trong `docs/architecture.md` §5 — đang ghi là "cần đo lại con số thật khi đăng ký". Đo rồi mới được phát biểu trước lớp.
4. **Chạy smoke test và điền phần "Nhận xét"** trong `docs/evidence/llm-smoke-test.md` bằng chữ của mình.
5. **Chia lại owner trong `docs/backlog.md`** nếu cách chia hiện tại không đúng thực tế — cách chia hiện tại là đề xuất của AI, không phải thoả thuận của nhóm.

### Chỉnh sửa con người đã thực hiện

_(ghi vào đây khi sửa: ai sửa, sửa gì, vì sao)_

| Ngày | Người sửa | File | Sửa gì và vì sao |
| :-- | :-- | :-- | :-- |
| | | | |

---

## 2026-09-11 — Homework 3A: dựng khung giao diện

| Mục | Nội dung |
| :-- | :-- |
| **Task** | Dựng 3 màn hình Next.js chạy bằng dữ liệu giả, một form có validation theo quy tắc nghiệp vụ, đủ 4 trạng thái loading/empty/success/error, bố cục responsive |
| **Tool / model** | Claude Code (Claude Opus 5) |
| **File sinh ra** | `apps/web/` — `package.json`, `next.config.mjs`, `tsconfig.json`, `app/layout.tsx`, `app/globals.css`, `app/page.tsx`, `app/projects/[id]/page.tsx`, `app/projects/new/page.tsx`, `components/ui.tsx`, `lib/types.ts`, `lib/mock-data.ts`, `lib/api.ts`, `lib/validate-project.ts`, `lib/validate-project.test.ts`; `docs/week-03.md` |
| **File bị sửa** | `README.md`, `docs/proposal.md` (§6 bỏ Tailwind), `docs/backlog.md` |
| **Đã kiểm chứng bằng máy** | `npm test` → 11/11 pass. `npx next build` → biên dịch và kiểm kiểu thành công, 4 route. Chạy thật trên trình duyệt: form rỗng cho 9 lỗi + nhảy con trỏ; BR-003 báo đúng khi người phụ trách tài chính trùng người điều phối; nút gửi khoá lại khi đang gửi rồi ra màn hình thành công; trạng thái rỗng và trạng thái lỗi hiện đúng; 12/12 ô nhập có `<label for>`; ở 375px không tràn ngang và hai bảng tự cuộn trong khung riêng |
| **CHƯA kiểm chứng** | Chưa có kiểm thử trình duyệt tự động (Playwright) — mọi thao tác ở trên do người/agent bấm tay. Chưa kiểm với trình đọc màn hình thật. Chưa kiểm trên thiết bị di động thật, chỉ mới giả lập 375px |
| **Human review** | ⬜ **Chưa hoàn tất.** An là chủ sở hữu phần frontend, phải đọc lại toàn bộ trước Thứ Sáu |

### Ba câu An cần trả lời được trước khi lên lớp

1. Vì sao thanh tiến độ có **hai lớp** màu, và vì sao *đã cam kết* chưa được tính như *đã bàn giao*?
2. Vì sao `validateProjectForm` nhận tham số `today` thay vì gọi `new Date()` bên trong hàm?
   *(gợi ý: liên quan tới việc test cho kết quả ổn định, và tới việc HTML dựng sẵn trên máy chủ phải khớp với HTML trên trình duyệt)*
3. Form đã validate rồi, vì sao tuần 4 vẫn phải validate lại y hệt ở backend?

### Chỗ AI làm mà nhóm nên cân nhắc sửa

- Bộ chuyển **"Chế độ demo"** là thứ chỉ phục vụ trình bày trên lớp. Phải gỡ khỏi bản deploy ở tuần 4, đừng để lọt lên bản chạy thật.
- Dữ liệu giả trong `lib/mock-data.ts` dùng tên của chính hai thành viên. Nếu thấy dễ gây hiểu nhầm khi trình chiếu thì đổi thành tên chung chung.

---

## Mẫu cho các lần sau

```
## YYYY-MM-DD — <tiêu đề công việc>

| Mục | Nội dung |
| :-- | :-- |
| Task | |
| Tool / model | |
| File sinh ra hoặc bị sửa | |
| Đã kiểm chứng bằng máy | |
| Human review | ai đọc, phát hiện gì |
| Chỉnh sửa đã thực hiện | |
```
