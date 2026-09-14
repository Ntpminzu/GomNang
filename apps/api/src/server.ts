import { todayInVietnam } from '@gomnang/domain/validate-project.ts'
import { createApp } from './app.ts'
import { loadConfig } from './config.ts'
import { openDb, openPostgres } from './db/client.ts'
import { seedIfEmpty } from './db/seed.ts'
import { log } from './http.ts'

/** Lỗi lúc khởi động thì ghi log rồi thoát hẳn, để nền tảng deploy thấy tiến trình chết và báo lỗi. */
async function startupStep<T>(name: string, step: () => T | Promise<T>): Promise<T> {
  try {
    return await step()
  } catch (err) {
    log('error', `${name} failed`, { error: (err as Error).message })
    process.exit(1)
  }
}

const config = await startupStep('configuration', () => loadConfig())

const { db, close, database } = await startupStep('database connection', async () => {
  if (!config.databaseUrl) {
    return { ...(await openDb(config.dataDir)), database: `pglite (${config.dataDir})` }
  }
  const opened = await openPostgres(config.databaseUrl, config.databaseCaCert)
  if (opened.tls === 'unverified') {
    log('warn', 'postgres TLS certificate is not verified; set DATABASE_CA_CERT to verify it')
  }
  // Không bao giờ ghi DATABASE_URL ra log: trong đó có mật khẩu database.
  return { ...opened, database: `postgres (tls ${opened.tls})` }
})

if (config.seedOnEmpty && (await seedIfEmpty(db))) {
  log('info', 'database was empty, demo data loaded')
}

if (config.env === 'production' && config.devLoginEnabled) {
  log('warn', 'demo login is enabled in production: anyone can sign in as a demo account', {
    flag: 'ALLOW_DEMO_LOGIN_IN_PRODUCTION',
  })
}

const app = createApp({
  db,
  secret: new TextEncoder().encode(config.jwtSecret),
  devLoginEnabled: config.devLoginEnabled,
  corsOrigins: config.corsOrigins,
  today: () => todayInVietnam(),
})

const server = app.listen(config.port, () => {
  log('info', 'api started', {
    port: config.port,
    env: config.env,
    database,
    devLogin: config.devLoginEnabled,
    corsOrigins: config.corsOrigins,
  })
})

// Tắt êm: ngừng nhận request mới, rồi đóng database để dữ liệu ghi xong xuống đĩa.
// Nếu tắt ngang (kill -9) thì PGlite có thể mất những gì chưa kịp ghi.
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
