import test from 'node:test'
import assert from 'node:assert/strict'
import type { ContributionRow, ContributionStatus, NeedRow } from './types.ts'
import { toNeedItems } from './views.ts'

const need: NeedRow = { id: 'n1', projectId: 'p1', label: 'Cơm', unit: 'phần', kind: 'goods', targetQty: 100, position: 0 }

const contribution = (id: string, quantity: number, status: ContributionStatus): ContributionRow => ({
  id,
  projectId: 'p1',
  needItemId: 'n1',
  contributorId: 'u1',
  quantity,
  status,
  createdAt: '2026-09-14T00:00:00.000Z',
})

test('số lượng được tính từ trạng thái đóng góp, đề xuất thì chưa được tính', () => {
  const [item] = toNeedItems(
    [need],
    [
      contribution('c1', 5, 'proposed'),
      contribution('c2', 10, 'committed'),
      contribution('c3', 20, 'delivered'),
      contribution('c4', 30, 'confirmed'),
    ],
  )
  assert.equal(item.committedQty, 60)
  assert.equal(item.deliveredQty, 50)
  assert.equal(item.confirmedQty, 30)
})
