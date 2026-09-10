import test from 'node:test'
import assert from 'node:assert/strict'
import { validateProjectForm, type ProjectFormInput } from './validate-project.ts'

const TODAY = '2026-09-11'

/** Một form hợp lệ; mỗi test chỉ làm hỏng đúng một thứ. */
function validForm(): ProjectFormInput {
  return {
    name: '100 phần cơm cho mái ấm Hoa Mai',
    goal: 'Nấu và phát 100 phần cơm trưa cho trẻ em tại mái ấm Hoa Mai vào ngày sinh hoạt cuối tháng.',
    beneficiaryGroup: 'Trẻ em tại mái ấm',
    location: 'Phường Linh Trung, TP. Thủ Đức',
    startDate: '2026-09-26',
    endDate: '2026-09-26',
    coordinatorId: 'u1',
    treasurerId: '',
    needItems: [{ label: 'Cơm', unit: 'phần', kind: 'goods', targetQty: '100' }],
  }
}

test('form hợp lệ thì không có lỗi nào', () => {
  assert.deepEqual(validateProjectForm(validForm(), TODAY), {})
})

test('tên quá ngắn bị từ chối', () => {
  const errors = validateProjectForm({ ...validForm(), name: 'Cơm' }, TODAY)
  assert.match(errors.name, /ít nhất 8 ký tự/)
})

test('mục tiêu chung chung bị từ chối', () => {
  const errors = validateProjectForm({ ...validForm(), goal: 'Giúp bà con' }, TODAY)
  assert.match(errors.goal, /ít nhất 20 ký tự/)
})

test('ngày bắt đầu ở quá khứ bị từ chối', () => {
  const errors = validateProjectForm({ ...validForm(), startDate: '2026-09-01' }, TODAY)
  assert.match(errors.startDate, /quá khứ/)
})

test('ngày kết thúc trước ngày bắt đầu bị từ chối', () => {
  const errors = validateProjectForm({ ...validForm(), endDate: '2026-09-20' }, TODAY)
  assert.ok(errors.endDate)
})

test('dự án không có hạng mục nhu cầu nào bị từ chối', () => {
  const errors = validateProjectForm({ ...validForm(), needItems: [] }, TODAY)
  assert.ok(errors.needItems)
})

test('số lượng mục tiêu phải là số dương', () => {
  const form = validForm()
  form.needItems = [
    { label: 'Cơm', unit: 'phần', kind: 'goods', targetQty: '0' },
    { label: 'Sữa', unit: 'hộp', kind: 'goods', targetQty: 'một trăm' },
  ]
  const errors = validateProjectForm(form, TODAY)
  assert.match(errors['needItems.0.targetQty'], /lớn hơn 0/)
  assert.match(errors['needItems.1.targetQty'], /lớn hơn 0/)
})

test('BR-002: có hạng mục tiền thì bắt buộc có người phụ trách tài chính', () => {
  const form = validForm()
  form.needItems.push({ label: 'Chi phí gas', unit: 'nghìn đồng', kind: 'money', targetQty: '800' })
  form.treasurerId = ''
  const errors = validateProjectForm(form, TODAY)
  assert.match(errors.treasurerId, /BR-002/)
})

test('BR-003: người phụ trách tài chính không được trùng người điều phối', () => {
  const form = validForm()
  form.needItems.push({ label: 'Chi phí gas', unit: 'nghìn đồng', kind: 'money', targetQty: '800' })
  form.coordinatorId = 'u1'
  form.treasurerId = 'u1'
  const errors = validateProjectForm(form, TODAY)
  assert.match(errors.treasurerId, /BR-003/)
})

test('BR-003 được thoả khi chọn người khác làm phụ trách tài chính', () => {
  const form = validForm()
  form.needItems.push({ label: 'Chi phí gas', unit: 'nghìn đồng', kind: 'money', targetQty: '800' })
  form.coordinatorId = 'u1'
  form.treasurerId = 'u3'
  assert.deepEqual(validateProjectForm(form, TODAY), {})
})

test('dự án chỉ có vật phẩm thì không đòi người phụ trách tài chính', () => {
  const errors = validateProjectForm({ ...validForm(), treasurerId: '' }, TODAY)
  assert.equal(errors.treasurerId, undefined)
})
