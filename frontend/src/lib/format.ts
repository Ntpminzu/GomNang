/** Giờ Việt Nam, dạng ngắn. Chỉ gọi trong component đã chạy trên trình duyệt. */
export function formatTime(iso: string): string {
  return new Date(iso).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh', dateStyle: 'short', timeStyle: 'short' })
}
