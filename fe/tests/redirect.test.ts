import assert from 'node:assert/strict'
import test from 'node:test'
import { safeNext } from '../src/libs/utils/redirect.ts'

test('safeNext chỉ nhận đường dẫn trong chính trang web', () => {
  assert.equal(safeNext('/projects/1?tab=needs'), '/projects/1?tab=needs')
  for (const bad of [null, '', 'projects/1', 'https://evil.example', '//evil.example', '/\\evil.example', '/\t/evil.example', 'javascript:alert(1)']) {
    assert.equal(safeNext(bad), '/', String(bad))
  }
})
