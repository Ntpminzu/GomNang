import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { test } from 'node:test'
import { openDb } from '../../src/infrastructure/database/client.ts'

test('khóa chặn tiến trình thứ hai và được nhả sau khi đóng database', async () => {
  const directory = mkdtempSync(join(tmpdir(), 'gomnang-lock-'))
  const moduleUrl = new URL('../../src/infrastructure/database/client.ts', import.meta.url).href
  let opened: Awaited<ReturnType<typeof openDb>> | undefined
  try {
    opened = await openDb(directory)
    const child = spawnSync(process.execPath, ['--input-type=module', '-e', `
      import { openDb } from ${JSON.stringify(moduleUrl)};
      try {
        const db = await openDb(${JSON.stringify(directory)});
        await db.close();
        process.exitCode = 2;
      } catch (error) {
        console.error(error.message);
        process.exitCode = 1;
      }
    `], { encoding: 'utf8', timeout: 5000 })
    assert.ifError(child.error)
    assert.equal(child.status, 1)
    assert.match(child.stderr, /Database đang được sử dụng/)
    await opened.close()
    opened = await openDb(directory)
  } finally {
    await opened?.close()
    rmSync(directory, { recursive: true, force: true })
  }
})
