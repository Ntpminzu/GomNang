import { resolve } from 'node:path'
import { existsSync } from 'node:fs'
import { pathToFileURL } from 'node:url'
import { hashSync } from 'bcryptjs'
import { z } from 'zod'
import { drizzle } from 'drizzle-orm/pglite'
import type { Db } from '../src/infrastructure/database/client.ts'
import { openPglite } from '../src/infrastructure/database/pglite.ts'
import * as auth from '../src/modules/auth/auth.repository.ts'
import { passwordValue } from '../src/modules/auth/auth.schema.ts'
import { HttpError } from '../src/common/errors/http-error.ts'

export async function bootstrapAdmin(db: Db, input: { email: string; name: string; password?: string }, apply = false) {
  const email = z.email().parse(input.email.trim().toLowerCase())
  const name = z.string().trim().min(2).max(100).parse(input.name)
  try {
    return await db.transaction(async (tx) => {
      if (await auth.findAccountByEmail(tx, email)) throw new HttpError(409, 'EMAIL_EXISTS', 'Email đã có tài khoản; không thay đổi quyền hoặc mật khẩu.')
      if (!apply) return { preview: true as const, email }
      const password = passwordValue.parse(input.password)
      const row = await auth.insertAccount(tx, { email, displayName: name, passwordHash: hashSync(password, 10), role: 'admin', identityVerified: false })
      return { preview: false as const, id: row.id, email: row.email, role: row.role }
    })
  } catch (err) {
    if (auth.isUniqueViolation(err)) throw new HttpError(409, 'EMAIL_EXISTS', 'Email đã có tài khoản; không thay đổi quyền hoặc mật khẩu.')
    throw err
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  // Intentionally does not load be/.env or use openDb (which runs migrations).
  const directory = resolve(process.env.US1_TEST_DATA_DIR || '.data/us1-test')
  let close: (() => Promise<void>) | undefined
  try {
    if (!existsSync(directory)) throw new Error('TEST_DB_NOT_PREPARED')
    const opened = await openPglite(directory); close = opened.close
    const result = await bootstrapAdmin(drizzle(opened.client), {
      email: process.env.BOOTSTRAP_ADMIN_EMAIL || '',
      name: process.env.BOOTSTRAP_ADMIN_NAME || '',
      password: process.env.BOOTSTRAP_ADMIN_PASSWORD,
    }, process.argv.includes('--apply'))
    console.log(JSON.stringify(result))
  } catch (err) {
    console.error(err instanceof HttpError ? err.code + ': ' + err.message : 'Không tạo admin. Kiểm tra DB test đã chuẩn bị, backend đã tắt và các biến BOOTSTRAP_ADMIN_* hợp lệ.')
    process.exitCode = 1
  } finally { await close?.() }
}
