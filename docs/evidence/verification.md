# Kiểm chứng phục vụ bản nộp cuối kỳ

Ngày kiểm: **25/10/2026**. Phạm vi: source đang làm việc, các nhóm test bên dưới và smoke auth cô lập. Các checks do agent chạy để hỗ trợ rà soát; chưa thay thế review/xác nhận của Khanh và An.

## 1. Test đã chạy

Chạy từ root trên Windows/PowerShell, Node test runner theo workspace:

| Lệnh | Kết quả thực tế | Phạm vi |
| :-- | :-- | :-- |
| `npm.cmd test -w @gomnang/domain` | 41 test, 41 pass, 0 fail | Validation, rules, assessment quy tắc, dashboard/views |
| `npm.cmd test -w gomnang-web` | 15 test, 15 pass, 0 fail | Mock API flow, redirect và project utils; không phải browser |
| `node --test be/tests/integration/chat-model.test.ts be/tests/integration/gemini-model.test.ts be/tests/integration/database-lock.test.ts` | 6 test, 6 pass, 0 fail | Adapter mock fetch và PGlite lock/thư mục tạm |

Không mở DB người dùng, không gọi Gemini/Ollama thật trong các checks trên. Những ca bảo mật này không thay bộ AI evaluation ≥20 ca.

## 2. Smoke auth cô lập

Gọi trực tiếp `loginWithPassword` và `authenticate` với bcrypt/JWT thật nhưng user repository giả, secret/password chỉ là dữ liệu thử. Harness tạm được gỡ sau kiểm, không thêm test hoặc đổi code ứng dụng. Không coi đây là HTTP/DB end-to-end.

| Kịch bản | Kỳ vọng | Kết quả |
| :-- | :-- | :-- |
| Email/password đúng | Trả user đúng và JWT | Pass |
| Password sai | Reject HTTP error 401 | Pass |
| Tài khoản không tồn tại | Reject 401 | Pass |
| JWT phát ra | Verify đúng HS256/issuer/sub; exp − iat = 8 giờ | Pass |
| Bearer token sai | Reject 401 | Pass |

Output: `Auth isolated smoke: valid login, wrong password, unknown account, token verification and 8h expiration: PASS`.

## 3. Khoảng trống trước khi nộp

- Chưa chạy lại full workspace suite, backend API/RAG, typecheck/build hoặc E2E trong lần kiểm này. Test fixtures API thiếu chatEmbedder; retrieval tests vẫn dùng chữ ký đồng bộ và dependency không phù hợp source. Cần cập nhật và chạy lại, không bỏ test để làm xanh.
- Chưa có dataset AI ≥20 ca/kết quả trước–sau cải tiến, tokens/cost/latency, demo guardrails và fallback trên môi trường nộp.
- Chưa kiểm provider thật, container/deploy, responsive trên trình duyệt/thiết bị hoặc secrets toàn lịch sử Git.
- Human review và hiểu biết cá nhân cần từng thành viên xác nhận; tự động pass không phải chứng nhận con người hiểu code.

Khi có lần kiểm tiếp theo, ghi lệnh, commit, môi trường, output và AC liên quan. Không tái sử dụng kết quả này cho source đã thay đổi mà chưa kiểm lại.
