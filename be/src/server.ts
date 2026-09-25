import { todayInVietnam } from '@gomnang/domain/validate-project.ts'
import { createApp } from './app.ts'
import { loadConfig, type Config } from './config/env.ts'
import { openDb } from './infrastructure/database/client.ts'
import { seedIfEmpty } from './infrastructure/database/seed.ts'
import { log } from './infrastructure/logging/logger.ts'

function readConfig(): Config {
  try {
    return loadConfig()
  } catch (err) {
    log('error', 'invalid configuration', { error: (err as Error).message })
    process.exit(1)
  }
}

const config = readConfig()
const { db, close } = await openDb(config.dataDir, config.databaseUrl).catch((error: Error) => {
  log('error', 'database startup failed', {
    database: config.databaseUrl ? 'postgresql' : config.dataDir,
    error: error.message,
  })
  process.exit(1)
})

if (config.seedOnEmpty && (await seedIfEmpty(db))) {
  log('info', 'database was empty, demo data loaded')
}

const app = createApp({
  db,
  secret: new TextEncoder().encode(config.jwtSecret),
  devLoginEnabled: config.devLoginEnabled,
  today: () => todayInVietnam(),
})

const server = app.listen(config.port, () => {
  log('info', 'api started', {
    port: config.port,
    env: config.env,
    database: config.databaseUrl ? 'postgresql' : config.dataDir,
    devLogin: config.devLoginEnabled,
  })
})

// Tắt êm: ngừng nhận request mới, rồi đóng database để PGlite ghi xong xuống đĩa.
// Nếu tắt ngang (kill -9) thì có thể mất những gì chưa kịp ghi.
for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.once(signal, () => {
    log('info', 'shutting down', { signal })
    server.close(async () => {
      await close()
      log('info', 'database closed')
      process.exit(0)
    })
    server.closeIdleConnections()
  })
}
