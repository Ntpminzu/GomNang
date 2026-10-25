import test from 'node:test'
import assert from 'node:assert/strict'
import { catalogStats, fold, queryProjects } from './catalog.ts'
import type { NeedItem, NeedKind, ProjectStatus, ProjectSummary } from './types.ts'

const TODAY = '2026-10-25'
const need = (kind: NeedKind, targetQty: number, committedQty: number, confirmedQty = 0): NeedItem => ({
  id: `n-${kind}-${targetQty}-${committedQty}`,
  label: kind,
  unit: 'phần',
  kind,
  targetQty,
  committedQty,
  deliveredQty: confirmedQty,
  confirmedQty,
  shift: null,
})
const project = (id: string, over: Partial<ProjectSummary> = {}): ProjectSummary => ({
  id,
  name: `Dự án ${id}`,
  status: 'published',
  beneficiaryGroup: 'Trẻ em',
  location: 'Phường Linh Trung, Thành phố Thủ Đức',
  startDate: TODAY,
  endDate: TODAY,
  createdAt: '2026-10-01T00:00:00.000Z',
  needs: [need('goods', 10, 0)],
  ...over,
})

test('tìm không phân biệt hoa thường và dấu tiếng Việt, theo tên/địa điểm/nhóm thụ hưởng', () => {
  assert.equal(fold('Thủ Đức'), 'thu duc')
  const all = [
    project('a', { name: 'Bữa cơm cho mái ấm' }),
    project('b', { location: 'Phường Hiệp Bình Chánh' }),
    project('c', { beneficiaryGroup: 'Người cao tuổi neo đơn' }),
  ]
  assert.deepEqual(queryProjects(all, { q: 'bua com' }, TODAY).items.map((p) => p.id), ['a'])
  assert.deepEqual(queryProjects(all, { q: 'HIỆP BÌNH' }, TODAY).items.map((p) => p.id), ['b'])
  assert.deepEqual(queryProjects(all, { q: 'cao tuoi' }, TODAY).items.map((p) => p.id), ['c'])
  assert.equal(queryProjects(all, { q: 'không có' }, TODAY).total, 0)
})

test('chỉ dự án công khai; mặc định ẩn đã huỷ, lọc đúng trạng thái thì hiện; lọc theo loại nhu cầu', () => {
  const statuses: ProjectStatus[] = ['draft', 'pending_verification', 'published', 'in_progress', 'completed', 'cancelled']
  const all = statuses.map((status) => project(status, { status, needs: [need(status === 'in_progress' ? 'money' : 'goods', 10, 0)] }))
  assert.deepEqual(queryProjects(all, {}, TODAY).items.map((p) => p.id).sort(), ['completed', 'in_progress', 'published'])
  assert.deepEqual(queryProjects(all, { status: 'cancelled' }, TODAY).items.map((p) => p.id), ['cancelled'])
  assert.deepEqual(queryProjects(all, { status: 'draft' }, TODAY).items, [], 'không lộ bản nháp kể cả khi lọc thẳng')
  assert.deepEqual(queryProjects(all, { kind: 'money' }, TODAY).items.map((p) => p.id), ['in_progress'])
})

test('sắp xếp: đã kết thúc xuống cuối; gần ngày nhất, còn thiếu nhiều nhất, mới đăng', () => {
  const all = [
    project('xa', { startDate: '2026-12-01', needs: [need('goods', 10, 9)], createdAt: '2026-10-03T00:00:00.000Z' }),
    project('gan', { startDate: '2026-10-26', needs: [need('goods', 10, 5)], createdAt: '2026-10-01T00:00:00.000Z' }),
    project('xong', { status: 'completed', startDate: TODAY, needs: [need('goods', 10, 0)], createdAt: '2026-10-09T00:00:00.000Z' }),
    project('thieu', { startDate: '2026-11-10', needs: [need('goods', 10, 0)], createdAt: '2026-10-02T00:00:00.000Z' }),
  ]
  const ids = (sort: 'soon' | 'needed' | 'newest') => queryProjects(all, { sort }, TODAY).items.map((p) => p.id)
  assert.deepEqual(ids('soon'), ['gan', 'thieu', 'xa', 'xong'])
  assert.deepEqual(ids('needed'), ['thieu', 'gan', 'xa', 'xong'])
  assert.deepEqual(ids('newest'), ['xa', 'thieu', 'gan', 'xong'])
})

test('phân trang: tổng số đúng, các trang ghép lại đủ và không trùng, trang vượt quá trả trang cuối', () => {
  // Cùng ngày, cùng độ phủ: thứ tự chỉ còn dựa vào khoá phụ id.
  const all = Array.from({ length: 7 }, (_, i) => project(`p${7 - i}`))
  const pages = [1, 2, 3].map((page) => queryProjects(all, { page, pageSize: 3 }, TODAY))
  assert.deepEqual(pages.map((p) => [p.page, p.total, p.totalPages, p.items.length]), [[1, 7, 3, 3], [2, 7, 3, 3], [3, 7, 3, 1]])
  const seen = pages.flatMap((p) => p.items.map((x) => x.id))
  assert.deepEqual(seen, ['p1', 'p2', 'p3', 'p4', 'p5', 'p6', 'p7'])
  assert.equal(queryProjects(all, { page: 9, pageSize: 3 }, TODAY).page, 3)
  assert.equal(queryProjects(all, { page: 0 }, TODAY).page, 1)
  const empty = queryProjects([], {}, TODAY)
  assert.deepEqual([empty.total, empty.page, empty.totalPages, empty.items.length], [0, 1, 1, 0])
})

test('số liệu tổng không đổi theo bộ lọc hay trang', () => {
  const all = [
    project('a', { needs: [need('goods', 10, 10, 4)] }),
    project('b', { status: 'in_progress', needs: [need('money', 100, 50)] }),
    project('c', { status: 'completed', needs: [need('goods', 5, 5, 5)] }),
  ]
  const expected = catalogStats(all)
  assert.deepEqual(expected, { open: 2, coveragePct: 75, confirmedUnits: 9, missingNeeds: 1 })
  assert.deepEqual(queryProjects(all, { q: 'không có', page: 3 }, TODAY).stats, expected)
})
