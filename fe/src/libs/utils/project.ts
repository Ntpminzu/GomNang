import type { NeedItem, ProjectDetail } from '@gomnang/domain/types.ts'

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
