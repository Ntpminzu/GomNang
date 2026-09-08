# Week 2 — Homework 2B evidence

**Bài:** Final-project proposal and AI smoke test
**Hạn:** trước buổi Thứ Ba tuần 3
**Nhóm:** Võ Tuấn Khanh (23110031) · Phạm Văn Bảo An (23110001)

---

## Checklist yêu cầu của đề bài

| # | Yêu cầu | Nơi nộp | Trạng thái |
| :-- | :-- | :-- | :-- |
| 1 | Problem statement, target users, three essential user stories | [`proposal.md`](proposal.md) §1, §2, §3 | ✅ |
| 2 | One complete vertical-slice scenario, demo dưới 2 phút | [`proposal.md`](proposal.md) §4 | ✅ |
| 3 | Chọn frontend path, backend technology, data store, deployment approach | [`proposal.md`](proposal.md) §6 | ✅ |
| 4 | Proposed AI capability: benefit, failure risk, non-AI fallback | [`proposal.md`](proposal.md) §5 | ✅ |
| 5 | Architecture diagram | [`architecture.md`](architecture.md) §1, §2, §3, §5 | ✅ |
| 6 | Eight-week backlog with owners | [`backlog.md`](backlog.md) | ✅ |
| 7 | Repository | repo này | ✅ |
| 8 | Saved LLM smoke-test result: 1 prompt + response + latency | `docs/evidence/llm-smoke-test.json` | ⬜ **chưa chạy — thiếu API key** |

## Cách nộp

| Mục | Giá trị |
| :-- | :-- |
| Repository URL | _(điền sau khi push lên GitHub)_ |
| Commit hash | _(điền `git rev-parse HEAD` của bản nộp)_ |
| Deployment URL | Chưa có — tuần 2 chưa có mã ứng dụng, deploy bắt đầu ở Homework 4B |
| Video 60 giây | _(quay màn hình: mở proposal, chỉ sơ đồ, chạy smoke test, đọc kết quả)_ |

## Về mục 8 — LLM smoke test

Đề bài ghi *"Run the instructor LLM smoke-test script or notebook"*. Nhóm **chưa nhận được script của giảng viên trên LMS**, nên đã tự viết một script tương đương tại [`scripts/llm-smoke-test.mjs`](../scripts/llm-smoke-test.mjs). Nếu giảng viên công bố script chính thức, nhóm sẽ chạy lại bằng script đó và thay kết quả.

Script làm đúng những gì đề bài đòi, cộng thêm một phần phục vụ tuần 6:

- gửi **một prompt thật của dự án** (không phải "hello world"): mô tả một dự án thiện nguyện cố tình thiếu thông tin;
- ép model trả **JSON có schema**, rồi tự kiểm tra schema — đây là bước đầu của track *Structured AI workflow*;
- chạy nhiều lần (mặc định 3) và ghi min / trung bình / max độ trễ, vì một mẫu đơn lẻ không nói lên gì;
- lưu nguyên văn prompt và response vào `docs/evidence/`.

**Cách chạy** (cần API key — Google AI Studio có gói miễn phí tại https://aistudio.google.com/apikey):

```bash
LLM_PROVIDER=gemini GEMINI_API_KEY=<key> node scripts/llm-smoke-test.mjs --runs 3
```

Prompt dùng **dữ liệu giả do nhóm tự soạn**, không chứa thông tin của người thật — theo đúng mục 8 của Course Guide về bảo vệ dữ liệu.

## Blocker (bắt buộc nộp kèm, kể cả khi milestone đã xong)

**Blocker chính:** chưa có API key LLM nào, nên mục 8 của checklist chưa hoàn thành. Không có key thì cả milestone tuần 2 lẫn toàn bộ nhánh AI từ tuần 6 đều dừng.
*Hành động:* Khanh tạo key ở Google AI Studio và chạy script trước buổi Thứ Ba tuần 3. Nếu gói miễn phí không đủ, chuyển sang dùng vLLM chung của lớp.

**Rủi ro thứ hai:** Homework 1B yêu cầu phỏng vấn ít nhất một người dùng hoặc bên liên quan thật. Nhóm **chưa thực hiện**. Course Guide cấm bịa phỏng vấn, nên đây là món nợ phải trả trong tuần 3, không phải thứ có thể viết bù.
*Hành động:* An liên hệ một CLB thiện nguyện trong trường, phỏng vấn 20 phút, ghi lại nguyên văn vào `docs/week-01.md`.

## Điều chúng tôi muốn nghe phản hồi

1. Phạm vi vertical slice ở §4 có quá rộng cho 8 tuần với 2 người không? Nếu cần cắt, chúng tôi định bỏ hạng mục đóng góp *bằng tiền* trước.
2. Quyết định "hệ thống không giữ tiền, chỉ ghi sổ và đối chiếu biên lai" (D-01) có làm đề tài mất trọng tâm minh bạch không, hay ngược lại?
3. Track AI *Structured AI workflow* có được tính là "advanced capability" đủ nặng cho tuần 7 không, hay nên chuyển sang track RAG?
