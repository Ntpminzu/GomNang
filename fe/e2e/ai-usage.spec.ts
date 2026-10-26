import { expect, test, type Page } from '@playwright/test'
import { startLocalServers, stopLocalServers } from './local-servers.ts'
import { E2E_PASSWORD } from './fixtures.ts'
import type { AiUsage } from '@gomnang/domain/ai-usage.ts'

test.beforeAll(async () => { test.setTimeout(120_000); await startLocalServers() })
test.afterAll(stopLocalServers)
async function login(page: Page) {
  await page.goto('/login')
  await page.getByLabel(/^Email/).fill('admin@e2e.test')
  await page.getByLabel(/^Mật khẩu/).fill(E2E_PASSWORD)
  await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click()
  await expect(page).toHaveURL(/\/admin\/verifiers$/)
}
test('admin sees recorded requests, date filters, errors/retry and mobile metadata', async ({ page }, info) => {
  await login(page)
  const chat = await page.request.post('/api/chat', { data: { message: 'Cách tạo dự án?', history: [] } })
  expect(chat.status()).toBe(200)
  await page.getByRole('link', { name: 'Mức sử dụng AI', exact: true }).first().click()
  await expect(page.getByRole('status').filter({ hasText: 'Khoảng đã áp dụng' })).toBeVisible()
  await expect(page.getByText('RAG_ANSWERED · HTTP 200', { exact: true }).first()).toBeVisible()
  await expect(page.getByText('Chi phí TB/request: không áp dụng (local).', { exact: false })).toBeVisible()
  await page.getByText(/^Metadata request #/).first().click()
  await expect(page.getByText('Tokens generation / embedding')).toBeVisible()
  await page.setViewportSize({ width: 375, height: 812 })
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  await page.screenshot({ path: info.outputPath('ai-usage-mobile.png'), fullPage: true })
  await page.getByLabel('Khoảng đo').selectOption('custom')
  await page.getByLabel('Từ ngày').fill('2000-01-01'); await page.getByLabel('Đến ngày').fill('2000-01-02')
  await page.getByRole('button', { name: 'Áp dụng', exact: true }).click()
  await expect(page.getByText('Chưa có request trong khoảng đã chọn')).toBeVisible()
  await page.getByLabel('Đến ngày').fill('2000-05-01')
  await page.getByRole('button', { name: 'Áp dụng', exact: true }).click()
  await expect(page.getByRole('alert').filter({ hasText: '92 ngày' })).toBeVisible()
  await page.route('**/api/admin/ai-usage?*', (route) => route.fulfill({ status: 500, json: { error: { code: 'TEST_DB_FAILURE', message: 'Không tải được số liệu thử nghiệm.' } } }))
  await page.getByLabel('Khoảng đo').selectOption('24h'); await page.getByRole('button', { name: 'Áp dụng', exact: true }).click()
  await expect(page.getByRole('alert').filter({ hasText: 'Không tải được số liệu thử nghiệm.' })).toBeVisible()
  await page.unroute('**/api/admin/ai-usage?*')
  await page.getByRole('button', { name: 'Thử lại', exact: true }).click()
  await expect(page.getByRole('status').filter({ hasText: 'Khoảng đã áp dụng' })).toBeVisible()
  await expect(page.getByRole('alert').filter({ hasText: 'Không tải được số liệu thử nghiệm.' })).toHaveCount(0)
})
test('an old filter response cannot overwrite a newer filter and loading is announced', async ({ page }) => {
  await login(page)
  const token = await page.evaluate(() => JSON.parse(sessionStorage.getItem('gomnang.httpSession.v1')!).token as string)
  const response = await page.request.get('/api/admin/ai-usage', { headers: { authorization: 'Bearer ' + token } })
  const data = await response.json() as AiUsage
  let release!: () => void
  const held = new Promise<void>((resolve) => { release = resolve })
  await page.route('**/api/admin/ai-usage?*', async (route) => {
    if (route.request().url().includes('period=7d')) {
      await held
      await route.fulfill({ json: { ...data, totals: { ...data.totals, requests: 999 } } })
    } else await route.fulfill({ json: data })
  })
  await page.goto('/admin/ai-usage')
  await expect(page.getByRole('status').filter({ hasText: 'Đang tải mức sử dụng AI' })).toBeAttached()
  await page.getByLabel('Khoảng đo').selectOption('24h'); await page.getByRole('button', { name: 'Áp dụng', exact: true }).click()
  await expect(page.getByRole('status').filter({ hasText: 'Khoảng đã áp dụng' })).toBeVisible()
  const oldResponse = page.waitForResponse((res) => res.url().includes('ai-usage?period=7d'))
  release(); await oldResponse
  await expect(page.getByText('999', { exact: true })).toHaveCount(0)
})
test('guest cannot see usage or call admin API', async ({ page }) => {
  await page.goto('/admin/ai-usage')
  await expect(page.getByText('Không có quyền xem trang này')).toBeVisible()
  expect((await page.request.get('/api/admin/ai-usage')).status()).toBe(401)
  await expect(page.getByRole('link', { name: 'Mức sử dụng AI', exact: true })).toHaveCount(0)
})
test('ordinary user and verifier cannot see dashboard or call admin API', async ({ page }) => {
  for (const [email, home] of [['khanh@gomnang.test', '/'], ['tam@gomnang.test', '/verify']]) {
    await page.goto('/login')
    await page.getByLabel(/^Email/).fill(email)
    await page.getByLabel(/^Mật khẩu/).fill(E2E_PASSWORD)
    await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click()
    await expect(page).toHaveURL('http://127.0.0.1:3100' + home)
    const token = await page.evaluate(() => JSON.parse(sessionStorage.getItem('gomnang.httpSession.v1')!).token as string)
    await page.goto('/admin/ai-usage')
    await expect(page.getByText('Không có quyền xem trang này')).toBeVisible()
    await expect(page.getByRole('link', { name: 'Mức sử dụng AI', exact: true })).toHaveCount(0)
    expect((await page.request.get('/api/admin/ai-usage', { headers: { authorization: 'Bearer ' + token } })).status()).toBe(403)
    await page.evaluate(() => sessionStorage.clear())
    await page.reload()
  }
})
