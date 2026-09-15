import assert from 'node:assert/strict'
import test from 'node:test'
import { hashPassword, verifyPassword } from './password.ts'

const PASSWORD = 'mat khau dai du 8 ky tu'

test('băm rồi kiểm lại đúng mật khẩu → true', async () => {
  assert.equal(await verifyPassword(PASSWORD, await hashPassword(PASSWORD)), true)
})

test('sai mật khẩu → false', async () => {
  assert.equal(await verifyPassword(PASSWORD + ' ', await hashPassword(PASSWORD)), false)
})

test('chuỗi lưu mang tham số scrypt, và hai lần băm cùng mật khẩu ra hai chuỗi khác nhau nhờ salt', async () => {
  const [a, b] = await Promise.all([hashPassword(PASSWORD), hashPassword(PASSWORD)])
  assert.match(a, /^scrypt\$32768\$8\$1\$/)
  assert.notEqual(a, b)
})

test('chuỗi lưu hỏng → false, không ném lỗi', async () => {
  const [, , , , salt, hash] = (await hashPassword(PASSWORD)).split('$')
  const malformed = [
    '',
    'khong-phai-hash',
    `bcrypt$32768$8$1$${salt}$${hash}`,
    `scrypt$32768$8$1$${salt}`,
    `scrypt$32768$8$1$${salt}$${hash}$thua`,
    `scrypt$abc$8$1$${salt}$${hash}`,
    `scrypt$1000$8$1$${salt}$${hash}`,
    `scrypt$32768$8$1$$${hash}`,
    `scrypt$32768$8$1$${salt}$${hash.slice(0, 20)}`,
  ]
  for (const stored of malformed) assert.equal(await verifyPassword(PASSWORD, stored), false, stored)
})
