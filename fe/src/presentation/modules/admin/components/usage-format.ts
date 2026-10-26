export const number = (value: number | null) => value === null ? '—' : value.toLocaleString('vi-VN', { maximumFractionDigits: 2 })
export const dateTime = (value: string) => new Date(value).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })
export const seconds = (ms: number | null) => ms === null ? '—' : ms < 1000 ? Math.round(ms) + ' ms'
  : (ms / 1000).toLocaleString('vi-VN', { maximumFractionDigits: 1 }) + ' giây'
/** Tỷ lệ phần trăm có làm tròn; mẫu số 0 thì không có tỷ lệ. */
export const percent = (part: number, whole: number) => whole === 0 ? '—' : Math.round((part / whole) * 100) + '%'
