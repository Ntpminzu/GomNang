import test from 'node:test'
import assert from 'node:assert/strict'
import { assessProject, similarity } from './assess.ts'

const CLEAR = {
  name: 'Dọn vệ sinh bờ kênh khu phố 6',
  goal: 'Huy động 25 tình nguyện viên dọn rác dọc 400m bờ kênh.',
  location: 'Khu phố 6, Phường Hiệp Bình Chánh',
}

test('dự án rõ ràng, không trùng thì đạt', () => {
  const result = assessProject(CLEAR, [{ id: 'p1', name: 'Sách giáo khoa cũ cho học sinh' }])
  assert.equal(result.verdict, 'PASS')
  assert.deepEqual(result.signals, [])
})

test('địa điểm chỉ ghi tên quận thì cần bổ sung', () => {
  const result = assessProject({ ...CLEAR, location: 'Quận 9' }, [])
  assert.equal(result.verdict, 'NEEDS_INFO')
  assert.ok(result.signals.some((s) => s.code === 'LOCATION_VAGUE'))
})

test('mục tiêu không có con số nào thì cần bổ sung', () => {
  const result = assessProject({ ...CLEAR, goal: 'Giúp đỡ mọi người có hoàn cảnh khó khăn trong khu vực' }, [])
  assert.ok(result.signals.some((s) => s.code === 'GOAL_NOT_QUANTIFIED'))
})

test('so trùng bỏ qua dấu tiếng Việt và từ nối', () => {
  assert.equal(similarity('Cơm cho mái ấm Hoa Mai', 'com mai am hoa mai'), 1)
})

test('tên gần trùng một dự án đang chạy thì bị gắn cờ, kèm tên dự án bị trùng', () => {
  const result = assessProject({ ...CLEAR, name: '100 phần cơm mái ấm Hoa Mai' }, [
    { id: 'p1', name: '100 phần cơm cho mái ấm Hoa Mai' },
    { id: 'p2', name: 'Dọn vệ sinh công viên' },
  ])
  assert.equal(result.verdict, 'FLAG')
  assert.equal(result.similarProjects[0].id, 'p1')
  assert.equal(result.similarProjects.length, 1)
})
