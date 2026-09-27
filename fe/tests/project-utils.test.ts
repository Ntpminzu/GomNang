import assert from 'node:assert/strict'
import test from 'node:test'
import type { NeedItem } from '@gomnang/domain/types.ts'
import { calendarLink, daysUntil, formatDate, formatDay, needCoverage } from '../src/libs/utils/project.ts'

const need = (targetQty: number, committedQty: number, confirmedQty = 0): NeedItem => ({
  id: String(targetQty),
  label: 'x',
  unit: 'phần',
  kind: 'goods',
  targetQty,
  committedQty,
  deliveredQty: confirmedQty,
  confirmedQty,
  shift: null,
})

test('mức đủ nhu cầu lấy trung bình từng hạng mục, hạng mục dư không bù cho hạng mục thiếu', () => {
  assert.deepEqual(needCoverage([need(100, 150, 100), need(40, 0)]), { committedPct: 50, confirmedPct: 50, openNeeds: 1 })
})

test('dự án chưa có hạng mục nào → 0%, không chia cho 0', () => {
  assert.deepEqual(needCoverage([]), { committedPct: 0, confirmedPct: 0, openNeeds: 0 })
})

test('daysUntil và formatDate', () => {
  assert.equal(daysUntil('2026-10-01', '2026-09-26'), 5)
  assert.equal(daysUntil('2026-09-20', '2026-09-26'), -6)
  assert.equal(formatDate('2026-09-26'), '26/09/2026')
})

test('ca tình nguyện: link lịch Google đúng giờ Việt Nam, ngày hiện kèm thứ', () => {
  const url = new URL(calendarLink('Phân loại sách', { date: '2026-09-27', start: '08:00', end: '11:30', place: 'Nhà văn hoá KP3' }, 'GOM NẮNG'))
  assert.equal(url.hostname, 'calendar.google.com')
  assert.equal(url.searchParams.get('dates'), '20260927T080000/20260927T113000')
  assert.equal(url.searchParams.get('ctz'), 'Asia/Ho_Chi_Minh')
  assert.equal(url.searchParams.get('location'), 'Nhà văn hoá KP3')
  assert.match(formatDay('2026-09-27'), /Chủ Nhật.*27\/09/)
})
