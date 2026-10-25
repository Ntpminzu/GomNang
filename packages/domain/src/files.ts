/** Q-04: chứng từ chi tải lên được lưu trong PostgreSQL. Chỉ nhận ảnh và PDF, tối đa 3 MB. */
export const RECEIPT_MAX_BYTES = 3 * 1024 * 1024
export const RECEIPT_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'] as const
export type ReceiptType = (typeof RECEIPT_TYPES)[number]

const startsWith = (bytes: Uint8Array, signature: number[], offset = 0) => signature.every((value, i) => bytes[offset + i] === value)

/** Nhận loại file theo vài byte đầu, không tin Content-Type hay đuôi tên do người dùng gửi. */
export function sniffReceiptType(bytes: Uint8Array): ReceiptType | null {
  if (startsWith(bytes, [0xff, 0xd8, 0xff])) return 'image/jpeg'
  if (startsWith(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return 'image/png'
  if (startsWith(bytes, [0x52, 0x49, 0x46, 0x46]) && startsWith(bytes, [0x57, 0x45, 0x42, 0x50], 8)) return 'image/webp'
  if (startsWith(bytes, [0x25, 0x50, 0x44, 0x46, 0x2d])) return 'application/pdf'
  return null
}

/** Tên hiển thị an toàn: bỏ đường dẫn, ký tự điều khiển và dấu nháy kép; tối đa 120 ký tự. */
export function safeFileName(raw: string): string {
  const base = raw.split(/[\\/]/).pop() ?? ''
  // eslint-disable-next-line no-control-regex
  const clean = base.replace(/[\u0000-\u001f\u007f"]/g, '').trim().slice(0, 120)
  return clean || 'chung-tu'
}
