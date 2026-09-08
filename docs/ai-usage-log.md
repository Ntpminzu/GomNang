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
