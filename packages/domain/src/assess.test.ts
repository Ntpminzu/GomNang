import test from 'node:test'
import assert from 'node:assert/strict'
import { assessProject, mergeAiAssessment, similarity } from './assess.ts'

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

test('đánh giá AI: chỉ nâng mức cảnh báo, không hạ được cờ do quy tắc tìm ra', () => {
  const flagged = assessProject({ ...CLEAR, name: 'Sách giáo khoa cũ cho học sinh' }, [{ id: 'p1', name: 'Sách giáo khoa cũ cho học sinh' }])
  assert.equal(flagged.verdict, 'FLAG')
  // Model bị hồ sơ "dặn" kết luận PASS vẫn không gỡ được cờ trùng tên.
  const merged = mergeAiAssessment(flagged, { verdict: 'PASS', signals: [] })
  assert.equal(merged.verdict, 'FLAG')
  assert.deepEqual(merged.similarProjects, flagged.similarProjects)
})

test('đánh giá AI: tín hiệu thêm vào có tiền tố AI_, lộ dữ liệu cá nhân hoặc dấu hiệu lừa đảo luôn bị gắn cờ', () => {
  const clear = assessProject(CLEAR, [])
  const info = mergeAiAssessment(clear, {
    verdict: 'PASS',
    signals: [{ code: 'UNCLEAR_BENEFICIARY', field: 'goal', message: 'Chưa rõ ai nhận rác đã phân loại.' }],
  })
  assert.equal(info.verdict, 'NEEDS_INFO', 'có tín hiệu thì không thể PASS')
  assert.deepEqual(info.signals.map((s) => s.code), ['AI_UNCLEAR_BENEFICIARY'])

  const pii = mergeAiAssessment(clear, {
    verdict: 'NEEDS_INFO',
    signals: [{ code: 'PERSONAL_DATA', field: 'goal', message: 'Mục tiêu ghi số điện thoại người thụ hưởng.' }],
  })
  assert.equal(pii.verdict, 'FLAG')
  assert.equal(mergeAiAssessment(clear, { verdict: 'PASS', signals: [] }).verdict, 'PASS')
})
