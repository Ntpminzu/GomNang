/**
 * Đăng nhập xong quay về trang đang xem dở, ghi trong ?next=. ?next nằm trên URL nên ai gửi link cũng sửa được:
 * chỉ nhận đường dẫn trong chính trang web này, không để trang đăng nhập bị mượn để đẩy người dùng sang trang lạ (open redirect).
 */
const BASE = 'http://gomnang.invalid'

export function safeNext(raw: string | null): string {
  if (!raw?.startsWith('/') || raw.startsWith('//')) return '/'
  // Trình duyệt đọc "\" như "/" và bỏ qua tab/xuống dòng: "/\evil.example" thành "//evil.example". Để bộ phân tích URL chuẩn quyết định.
  try {
    return new URL(raw, BASE).origin === BASE ? raw : '/'
  } catch {
    return '/'
  }
}

/** ?next của địa chỉ hiện tại. Chỉ gọi trên trình duyệt. */
export const readNext = (): string | null => new URLSearchParams(globalThis.location?.search).get('next')
