import test from 'node:test'
import assert from 'node:assert/strict'
import type { ProjectInput } from './types.ts'
import { validateProject } from './validate-project.ts'

const CTX = { today: '2026-09-14', coordinatorId: 'u1' }
const MONEY_ITEM = { label: 'Chi phí gas', unit: 'nghìn đồng', kind: 'money' as const, targetQty: 800 }

/** Một dự án hợp lệ; mỗi test chỉ làm hỏng đúng một thứ. */
function validInput(): ProjectInput {
  return {
    name: '100 phần cơm cho mái ấm Hoa Mai',
    goal: 'Nấu và phát 100 phần cơm trưa cho trẻ em tại mái ấm Hoa Mai vào ngày sinh hoạt cuối tháng.',
    beneficiaryGroup: 'Trẻ em tại mái ấm',
    location: 'Phường Linh Trung, TP. Thủ Đức',
    startDate: '2026-09-26',
    endDate: '2026-09-26',
    treasurerId: null,
    needItems: [{ label: 'Cơm', unit: 'phần', kind: 'goods', targetQty: 100 }],
  }
}

test('dự án hợp lệ thì không có lỗi nào', () => {
  assert.deepEqual(validateProject(validInput(), CTX), {})
})

test('tên quá ngắn bị từ chối', () => {
  assert.match(validateProject({ ...validInput(), name: 'Cơm' }, CTX).name, /ít nhất 8 ký tự/)
})

test('mục tiêu chung chung bị từ chối', () => {
  assert.match(validateProject({ ...validInput(), goal: 'Giúp bà con' }, CTX).goal, /ít nhất 20 ký tự/)
})

test('ngày bắt đầu ở quá khứ bị từ chối', () => {
  assert.match(validateProject({ ...validInput(), startDate: '2026-09-01' }, CTX).startDate, /quá khứ/)
})

test('ngày kết thúc trước ngày bắt đầu bị từ chối', () => {
  assert.ok(validateProject({ ...validInput(), endDate: '2026-09-20' }, CTX).endDate)
})

test('dự án không có hạng mục nhu cầu nào bị từ chối', () => {
  assert.ok(validateProject({ ...validInput(), needItems: [] }, CTX).needItems)
})

test('số lượng mục tiêu phải là số nguyên dương', () => {
  const input = validInput()
  input.needItems = [
    { label: 'Cơm', unit: 'phần', kind: 'goods', targetQty: 0 },
    { label: 'Sữa', unit: 'hộp', kind: 'goods', targetQty: 2.5 },
    { label: 'Nước', unit: 'chai', kind: 'goods', targetQty: Number.NaN },
  ]
  const errors = validateProject(input, CTX)
  assert.match(errors['needItems.0.targetQty'], /nguyên lớn hơn 0/)
  assert.match(errors['needItems.1.targetQty'], /nguyên lớn hơn 0/)
  assert.match(errors['needItems.2.targetQty'], /nguyên lớn hơn 0/)
})

test('BR-002: có hạng mục tiền thì bắt buộc có người phụ trách tài chính', () => {
  const input = { ...validInput(), needItems: [...validInput().needItems, MONEY_ITEM] }
  assert.match(validateProject(input, CTX).treasurerId, /BR-002/)
})

test('BR-003: người phụ trách tài chính không được trùng người điều phối', () => {
  const input = { ...validInput(), treasurerId: 'u1', needItems: [MONEY_ITEM] }
  assert.match(validateProject(input, CTX).treasurerId, /BR-003/)
})

test('BR-003 áp dụng cả khi dự án chỉ có vật phẩm nhưng vẫn gán người phụ trách tài chính', () => {
  assert.match(validateProject({ ...validInput(), treasurerId: 'u1' }, CTX).treasurerId, /BR-003/)
})

test('BR-002: người phụ trách tài chính chưa xác minh bị từ chối', () => {
  const input = { ...validInput(), treasurerId: 'u4', needItems: [MONEY_ITEM] }
  assert.match(validateProject(input, { ...CTX, treasurerVerified: false }).treasurerId, /đã được xác minh/)
})

test('có hạng mục tiền và người phụ trách tài chính hợp lệ thì qua', () => {
  const input = { ...validInput(), treasurerId: 'u3', needItems: [MONEY_ITEM] }
  assert.deepEqual(validateProject(input, { ...CTX, treasurerVerified: true }), {})
})

test('ca tình nguyện: chỉ cho công sức/kỹ năng, nằm trong thời gian dự án, giờ hợp lệ, có điểm tập kết', () => {
  const shift = { date: '2026-09-26', start: '07:00', end: '10:00', place: 'Bếp mái ấm Hoa Mai' }
  const labor = { label: 'Phụ bếp', unit: 'người', kind: 'labor' as const, targetQty: 5, shift }
  const run = (item: ProjectInput['needItems'][number]) => validateProject({ ...validInput(), needItems: [item] }, CTX)

  assert.deepEqual(run(labor), {})
  assert.match(run({ ...labor, kind: 'goods' })['needItems.0.shift'], /công sức hoặc kỹ năng/)
  assert.match(run({ ...labor, shift: { ...shift, date: '2026-09-27' } })['needItems.0.shiftDate'], /thời gian dự án/)
  assert.match(run({ ...labor, shift: { ...shift, end: '06:00' } })['needItems.0.shiftTime'], /sau giờ bắt đầu/)
  assert.match(run({ ...labor, shift: { ...shift, start: '7h' } })['needItems.0.shiftTime'], /Nhập giờ/)
  assert.ok(run({ ...labor, shift: { ...shift, place: ' ' } })['needItems.0.shiftPlace'])
  assert.ok(run({ ...labor, shift: { ...shift, date: '2026-9-26' } })['needItems.0.shiftDate'], 'ngày sai định dạng')
  assert.deepEqual(run({ ...labor, shift: null }), {}, 'ca là tuỳ chọn')
})
