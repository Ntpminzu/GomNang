import { spawn } from 'node:child_process'
import { resolve } from 'node:path'
const child = spawn(process.execPath, ['--env-file-if-exists=.env', 'src/server.ts'], {
  stdio: 'inherit',
  env: {
    ...process.env, DATABASE_URL: '', DATA_DIR: resolve(process.env.US1_TEST_DATA_DIR || '.data/us1-test'),
    NODE_ENV: 'development', PORT: process.env.US1_TEST_PORT || '4000',
    JWT_SECRET: process.env.US1_TEST_JWT_SECRET || 'local-us1-test-only-secret-0123456789abcdef',
    ENABLE_DEV_LOGIN: 'false', SEED_ON_EMPTY: 'true',
  },
})
child.on('exit', (code) => { process.exitCode = code ?? 1 })
