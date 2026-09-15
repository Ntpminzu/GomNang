import test from 'node:test'
import assert from 'node:assert/strict'
import { PASSWORD_MAX, PASSWORD_MIN, normalizeEmail, validateLogin, validateRegistration } from './validate-auth.ts'

const VALID = { displayName: 'Võ Tuấn Khanh', email: 'khanh@example.com', password: 'nang-am-2026' }

test('đăng ký hợp lệ thì không có lỗi nào', () => {
  assert.deepEqual(validateRegistration(VALID), {})
})

test('đăng ký bỏ trống cả ba ô thì báo đủ ba lỗi', () => {
  const errors = validateRegistration({ displayName: '   ', email: '', password: '' })
  assert.deepEqual(Object.keys(errors).sort(), ['displayName', 'email', 'password'])
})

test('email sai dạng bị từ chối', () => {
  for (const email of ['khanh', 'khanh@', 'khanh@gomnang', 'khanh @gomnang.vn']) {
    assert.ok(validateRegistration({ ...VALID, email }).email, email)
  }
})

test('mật khẩu phải nằm trong khoảng độ dài cho phép', () => {
  assert.match(validateRegistration({ ...VALID, password: 'x'.repeat(PASSWORD_MIN - 1) }).password, /ít nhất/)
  assert.equal(validateRegistration({ ...VALID, password: 'x'.repeat(PASSWORD_MIN) }).password, undefined)
  assert.match(validateRegistration({ ...VALID, password: 'x'.repeat(PASSWORD_MAX + 1) }).password, /tối đa/)
})

test('tên hiển thị một ký tự là quá ngắn', () => {
  assert.match(validateRegistration({ ...VALID, displayName: 'K' }).displayName, /từ 2 đến 80/)
})

test('đăng nhập chỉ kiểm có nhập, không áp độ dài tối thiểu', () => {
  assert.deepEqual(validateLogin({ email: 'khanh@example.com', password: 'x' }), {})
  assert.ok(validateLogin({ email: 'khanh@example.com', password: '' }).password)
  assert.ok(validateLogin({ email: 'khong-phai-email', password: 'x' }).email)
})

test('normalizeEmail bỏ khoảng trắng hai đầu và đưa về chữ thường', () => {
  assert.equal(normalizeEmail('  Khanh@GomNang.TEST '), 'khanh@gomnang.test')
})
