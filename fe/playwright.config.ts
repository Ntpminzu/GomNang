import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './e2e',
  workers: 1,
  timeout: 45_000,
  expect: { timeout: 10_000 },
  use: {
    baseURL: 'http://127.0.0.1:3100',
    // Máy chưa tải trình duyệt của Playwright thì chạy bằng Chrome đã cài: PW_CHANNEL=chrome npm run test:e2e
    channel: process.env.PW_CHANNEL || undefined,
    trace: 'retain-on-failure',
  },
})
