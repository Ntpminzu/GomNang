import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
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
    // spawn bất đồng bộ: spawnSync chặn event loop nên tiến trình cha không làm mới được khoá,
    // máy bận thì con khởi động quá 10 giây, thấy khoá "cũ" và chiếm luôn → test chập chờn.
    const child = await new Promise<{ status: number | null; stderr: string }>((resolve, reject) => {
      const proc = spawn(process.execPath, ['--input-type=module', '-e', `
      import { openDb } from ${JSON.stringify(moduleUrl)};
      try {
        const db = await openDb(${JSON.stringify(directory)});
        await db.close();
        process.exitCode = 2;
      } catch (error) {
        console.error(error.message);
        process.exitCode = 1;
      }
    `], { stdio: ['ignore', 'ignore', 'pipe'] })
      let stderr = ''
      proc.stderr.setEncoding('utf8').on('data', (chunk: string) => (stderr += chunk))
      proc.on('error', reject).on('close', (status) => resolve({ status, stderr }))
    })
    assert.equal(child.status, 1)
    assert.match(child.stderr, /Database đang được sử dụng/)
    await opened.close()
    opened = await openDb(directory)
  } finally {
    await opened?.close()
    rmSync(directory, { recursive: true, force: true })
  }
})
