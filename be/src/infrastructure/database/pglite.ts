import { mkdirSync } from 'node:fs'
import { resolve } from 'node:path'
import { PGlite } from '@electric-sql/pglite'
import { vector } from '@electric-sql/pglite-pgvector'
import lockfile from 'proper-lockfile'

/** Server và SQL CLI phải giữ cùng một khóa trong suốt thời gian mở database. */
export async function openPglite(dataDir: string | null) {
  let release: (() => Promise<void>) | undefined
  const directory = dataDir ? resolve(dataDir) : undefined
  if (directory) {
    mkdirSync(directory, { recursive: true })
    try {
      release = await lockfile.lock(directory)
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ELOCKED') {
        throw new Error(`Database đang được sử dụng: ${directory}. Tắt backend hoặc lệnh SQL đang chạy trước khi mở lại. Nếu tiến trình vừa bị tắt đột ngột, chờ 10 giây rồi thử lại.`, { cause: error })
      }
      throw error
    }
  }

  let client: PGlite | undefined
  try {
    client = directory
      ? new PGlite(directory, { extensions: { vector } })
      : new PGlite({ extensions: { vector } })
    await client.waitReady
  } catch (error) {
    await release?.()
    throw error
  }

  const connection = client
  let closing: Promise<void> | undefined
  return {
    client: connection,
    close: () => closing ??= (async () => {
      await connection.close()
      await release?.()
    })(),
  }
}
