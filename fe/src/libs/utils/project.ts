import type { NeedItem, ProjectDetail, Shift } from '@gomnang/domain/types.ts'

export const projectRef = (p: ProjectDetail) => ({
  status: p.status,
  coordinatorId: p.coordinator.id,
  treasurerId: p.treasurer?.id ?? null,
})

/**
 * Mức đủ nhu cầu của cả dự án, 0–100. Các hạng mục khác đơn vị (phần cơm, nghìn đồng, người) nên không cộng thô số lượng:
 * lấy trung bình tỉ lệ của từng hạng mục, mỗi hạng mục tối đa 100% — dư một món không bù được cho món còn thiếu.
 */
export function needCoverage(needs: readonly NeedItem[]) {
  const ratio = (value: (n: NeedItem) => number) =>
    needs.length === 0 ? 0 : Math.round((needs.reduce((sum, n) => sum + Math.min(1, value(n) / n.targetQty), 0) / needs.length) * 100)
  return {
    committedPct: ratio((n) => n.committedQty),
    confirmedPct: ratio((n) => n.confirmedQty),
    openNeeds: needs.filter((n) => n.committedQty < n.targetQty).length,
  }
}

/** Số ngày từ hôm nay (giờ Việt Nam) tới `date` (YYYY-MM-DD). Âm nếu đã qua. */
export function daysUntil(date: string, today: string = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' })): number {
  return Math.round((Date.parse(date) - Date.parse(today)) / 86_400_000)
}

/** 2026-09-26 → 26/09/2026. */
export const formatDate = (date: string) => date.split('-').reverse().join('/')

/** 2026-09-27 → "Chủ Nhật, 27/09". Tính theo UTC vì chuỗi ngày không mang múi giờ. */
export const formatDay = (date: string) =>
  new Date(`${date}T00:00:00Z`).toLocaleDateString('vi-VN', { weekday: 'long', day: '2-digit', month: '2-digit', timeZone: 'UTC' })

/** Link "Thêm vào Google Calendar" cho một ca — chỉ là URL mẫu của Google, không cần thư viện hay đăng nhập. */
export function calendarLink(title: string, shift: Shift, details: string): string {
  const stamp = (time: string) => `${shift.date.replaceAll('-', '')}T${time.replace(':', '')}00`
  const query = new URLSearchParams({
    action: 'TEMPLATE',
    text: title,
    dates: `${stamp(shift.start)}/${stamp(shift.end)}`,
    ctz: 'Asia/Ho_Chi_Minh',
    location: shift.place,
    details,
  })
  return `https://calendar.google.com/calendar/render?${query}`
}
