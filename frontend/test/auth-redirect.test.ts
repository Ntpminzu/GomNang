import assert from 'node:assert/strict'
import { test } from 'node:test'
import { safeNext } from '../src/features/auth/auth-redirect.ts'

test('safeNext giữ đường dẫn nằm trong trang web', () => {
  assert.equal(safeNext('/projects/1'), '/projects/1')
  assert.equal(safeNext('/projects/1/edit?tab=needs'), '/projects/1/edit?tab=needs')
})

test('safeNext đưa mọi địa chỉ ra ngoài trang web về trang chủ', () => {
  for (const raw of [
    null,
    '',
    'projects/1',
    'https://evil.example',
    '//evil.example',
    '/\\evil.example',
    '/\t/evil.example',
    'javascript:alert(1)',
  ]) {
    assert.equal(safeNext(raw), '/', JSON.stringify(raw))
  }
})
