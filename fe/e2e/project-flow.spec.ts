import { expect, test, type Page } from '@playwright/test'
import { startLocalServers, stopLocalServers } from './local-servers.ts'

test.beforeAll(startLocalServers)
test.afterAll(stopLocalServers)

type LoginResult = {
  token: string
  user: { id: string; name: string; isVerifier: boolean }
}

async function loginAs(page: Page, email: string) {
  const response = await page.request.post('/api/auth/dev-login', { data: { email } })
  expect(response.status()).toBe(200)
  const session = (await response.json()) as LoginResult
  await page.addInitScript((value) => {
    sessionStorage.setItem('gomnang.httpSession.v1', JSON.stringify(value))
  }, session)
  await page.goto('/')
  await page.evaluate((value) => {
    sessionStorage.setItem('gomnang.httpSession.v1', JSON.stringify(value))
  }, session)
  await page.reload()
  await expect(page.getByText(session.user.name, { exact: true })).toBeVisible()
}

test('verification navigation and direct access follow the session role', async ({ page }) => {
  const queueLink = page.getByRole('navigation').getByRole('link', { name: 'Hàng chờ xác minh' })
  let queueRequests = 0
  page.on('request', (request) => {
    if (request.url().includes('/verification-queue')) queueRequests++
  })

  await page.goto('/verify')
  await expect(page.getByRole('heading', { name: 'Không có quyền xem trang này' })).toBeVisible()
  await expect(queueLink).toHaveCount(0)
  expect(queueRequests).toBe(0)

  await loginAs(page, 'an@gomnang.test')
  await expect(queueLink).toHaveCount(0)
  await page.goto('/verify')
  await expect(page.getByRole('heading', { name: 'Không có quyền xem trang này' })).toBeVisible()
  expect(queueRequests).toBe(0)

  await loginAs(page, 'tam@gomnang.test')
  await expect(queueLink).toBeVisible()
  await queueLink.click()
  await expect(page.getByRole('heading', { name: 'Hàng chờ xác minh' })).toBeVisible()
  await expect.poll(() => queueRequests).toBeGreaterThan(0)
  await page.getByRole('button', { name: 'Đăng xuất' }).click()
  await expect(queueLink).toHaveCount(0)
  await expect(page.getByRole('heading', { name: 'Không có quyền xem trang này' })).toBeVisible()

  await page.setViewportSize({ width: 375, height: 812 })
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Dự án đang kêu gọi' })).toBeVisible()
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
})

test('frontend → backend → database: tạo, duyệt và xác nhận đóng góp', async ({ page }) => {
  const projectName = `E2E 100 phần cơm ${Date.now()}`

  await loginAs(page, 'khanh@gomnang.test')
  await page.goto('/projects/new')
  await page.getByLabel('Tên dự án').fill(projectName)
  await page.getByLabel('Mục tiêu').fill('Nấu và trao 100 phần cơm cho trẻ em tại mái ấm trong tháng này.')
  await page.getByLabel('Nhóm thụ hưởng').selectOption({ label: 'Trẻ em tại mái ấm' })
  await page.getByLabel('Địa điểm').fill('Phường Linh Trung, Thành phố Thủ Đức')
  await page.getByLabel('Ngày bắt đầu').fill('2026-10-10')
  await page.getByLabel('Ngày kết thúc').fill('2026-10-10')
  await page.locator('[id="needItems.0.label"]').fill('Cơm')
  await page.locator('[id="needItems.0.unit"]').fill('phần')
  await page.locator('[id="needItems.0.targetQty"]').fill('100')
  await page.getByRole('button', { name: 'Tạo bản nháp dự án' }).click()
  await expect(page.getByRole('heading', { name: projectName })).toBeVisible()
  const projectUrl = page.url()

  await page.getByRole('button', { name: 'Gửi xác minh' }).click()
  await expect(page.getByText('Quyết định xác minh')).not.toBeVisible()

  await loginAs(page, 'tam@gomnang.test')
  await page.goto('/verify')
  await page.getByRole('link', { name: new RegExp(projectName) }).click()
  await page.getByRole('button', { name: 'Duyệt và công khai' }).click()
  await expect(page.getByText('Đang kêu gọi', { exact: true })).toBeVisible()

  await loginAs(page, 'an@gomnang.test')
  await page.goto(projectUrl)
  await page.getByLabel('Số lượng (phần)').fill('30')
  await page.getByRole('button', { name: 'Cam kết', exact: true }).click()
  await expect(page.locator('.need-legend').filter({ hasText: 'còn thiếu 70 phần' })).toBeVisible()

  await page.getByLabel('Số lượng (phần)').fill('150')
  await page.getByRole('button', { name: 'Cam kết', exact: true }).click()
  await expect(page.getByText('HTTP 422 · EXCEEDS_REMAINING')).toBeVisible()

  await page.getByRole('button', { name: 'Đã bàn giao' }).click()
  await expect(page.getByText('Đã bàn giao', { exact: true })).toBeVisible()

  await loginAs(page, 'khanh@gomnang.test')
  await page.goto(projectUrl)
  await page.getByRole('button', { name: 'Xác nhận' }).click()
  await expect(page.getByText('Đã xác nhận', { exact: true })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Sổ ghi vết' })).toBeVisible()
})
