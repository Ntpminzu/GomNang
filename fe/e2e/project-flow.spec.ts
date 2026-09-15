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
