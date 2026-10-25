import { expect, test, type Page } from '@playwright/test'
import { startLocalServers, stopLocalServers } from './local-servers.ts'
import { E2E_PASSWORD } from './fixtures.ts'

test.beforeAll(async () => { test.setTimeout(120_000); await startLocalServers() })
test.afterAll(stopLocalServers)

type LoginResult = {
  token: string
  user: { id: string; name: string; role: import('@gomnang/domain/types.ts').Role }
}

async function loginAs(page: Page, email: string) {
  await page.goto('/login')
  await page.getByLabel(/^Email/).fill(email)
  await page.getByLabel(/^Mật khẩu/).fill(E2E_PASSWORD)
  const pending = page.waitForResponse((response) => response.url().endsWith('/api/auth/login') && response.request().method() === 'POST')
  await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click()
  const response = await pending
  expect(response.status()).toBe(200)
  const session = (await response.json()) as LoginResult
  await expect(page.getByRole('button', { name: `Tài khoản: ${session.user.name}` })).toBeVisible()
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
  await page.getByRole('button', { name: /^Tài khoản:/ }).click()
  await page.getByRole('menuitem', { name: 'Đăng xuất' }).click()
  await expect(queueLink).toHaveCount(0)
  await expect(page.getByRole('heading', { name: 'Không có quyền xem trang này' })).toBeVisible()

  await page.setViewportSize({ width: 375, height: 812 })
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Dự án đang kêu gọi' })).toBeVisible()
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
})

test('frontend → backend → database: tạo, duyệt và xác nhận đóng góp', async ({ page }) => {
  const projectName = `E2E 100 phần cơm ${Date.now()}`
  const futureDate = new Date(Date.now() + 2 * 86400_000).toISOString().slice(0, 10)

  await loginAs(page, 'khanh@gomnang.test')
  await page.goto('/projects/new')
  await page.getByLabel('Tên dự án').fill(projectName)
  await page.getByLabel('Mục tiêu').fill('Nấu và trao 100 phần cơm cho trẻ em tại mái ấm trong tháng này.')
  await page.getByLabel('Nhóm thụ hưởng').selectOption({ label: 'Trẻ em tại mái ấm' })
  await page.getByLabel('Địa điểm').fill('Phường Linh Trung, Thành phố Thủ Đức')
  await page.getByLabel('Ngày bắt đầu').fill(futureDate)
  await page.getByLabel('Ngày kết thúc').fill(futureDate)
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
  await page.getByRole('button', { name: 'Nhận phần này', exact: true }).click()
  await page.getByLabel(/^Số lượng \(phần\)/).fill('30')
  await page.getByRole('button', { name: 'Xác nhận cam kết', exact: true }).click()
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await expect(page.getByText(/Còn thiếu\s+70\s+phần/)).toBeVisible()

  await page.getByRole('button', { name: 'Nhận phần này', exact: true }).click()
  await page.getByLabel(/^Số lượng \(phần\)/).fill('150')
  await page.getByRole('button', { name: 'Xác nhận cam kết', exact: true }).click()
  await expect(page.getByText('Chỉ còn thiếu 70 phần.', { exact: true })).toBeVisible()
  await page.getByRole('dialog').getByRole('button', { name: 'Huỷ', exact: true }).click()
  const copiedToken = await page.evaluate(() => JSON.parse(sessionStorage.getItem('gomnang.httpSession.v1')!).token)
  const projectId = new URL(projectUrl).pathname.split('/').pop()
  const detail = await (await page.request.get(`/api/projects/${projectId}`)).json()
  const rejected = await page.request.post(`/api/projects/${projectId}/contributions`, {
    headers: { authorization: `Bearer ${copiedToken}` }, data: { needItemId: detail.needs[0].id, quantity: 150 },
  })
  expect(rejected.status()).toBe(422)
  expect((await rejected.json()).error.code).toBe('EXCEEDS_REMAINING')

  await page.getByRole('tab', { name: /^Đóng góp/ }).click()
  await page.getByRole('button', { name: 'Đã bàn giao', exact: true }).click()
  await page.getByRole('dialog').getByRole('button', { name: 'Đã bàn giao', exact: true }).click()
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await expect(page.getByText('Đã bàn giao', { exact: true })).toBeVisible()

  await loginAs(page, 'khanh@gomnang.test')
  await page.goto(projectUrl)
  await page.getByRole('tab', { name: /^Đóng góp/ }).click()
  await page.getByRole('button', { name: 'Xác nhận' }).click()
  await expect(page.getByText('Đã xác nhận', { exact: true })).toBeVisible()
  await page.getByRole('tab', { name: 'Sổ ghi vết' }).click()
  await expect(page.getByText('Mọi thay đổi trạng thái đều được ghi lại và không sửa được.', { exact: false })).toBeVisible()
})

test('người xác minh nhờ AI soát hồ sơ: lộ số điện thoại → Cần xem kỹ, người xác minh vẫn tự quyết định', async ({ page }) => {
  const projectName = `E2E AI soát hồ sơ ${Date.now()}`
  const futureDate = new Date(Date.now() + 2 * 86400_000).toISOString().slice(0, 10)

  await loginAs(page, 'khanh@gomnang.test')
  await page.goto('/projects/new')
  await page.getByLabel('Tên dự án').fill(projectName)
  await page.getByLabel('Mục tiêu').fill('Trao 50 suất quà cho chị Lan, liên hệ 0912345678 để nhận tại nhà số 12.')
  await page.getByLabel('Nhóm thụ hưởng').selectOption({ label: 'Trẻ em tại mái ấm' })
  await page.getByLabel('Địa điểm').fill('Phường Linh Trung, Thành phố Thủ Đức')
  await page.getByLabel('Ngày bắt đầu').fill(futureDate)
  await page.getByLabel('Ngày kết thúc').fill(futureDate)
  await page.locator('[id="needItems.0.label"]').fill('Quà')
  await page.locator('[id="needItems.0.unit"]').fill('suất')
  await page.locator('[id="needItems.0.targetQty"]').fill('50')
  await page.getByRole('button', { name: 'Tạo bản nháp dự án' }).click()
  await expect(page.getByRole('heading', { name: projectName })).toBeVisible()
  await page.getByRole('button', { name: 'Gửi xác minh' }).click()
  await expect(page.getByRole('button', { name: 'Đánh giá bằng AI' })).toHaveCount(0)

  await loginAs(page, 'tam@gomnang.test')
  await page.goto('/verify')
  await page.getByRole('link', { name: new RegExp(projectName) }).click()
  const gatekeeper = page.getByRole('region', { name: /Người gác cổng/ })
  await expect(gatekeeper.getByText('Kiểm tra theo quy tắc, chưa dùng AI', { exact: false })).toBeVisible()
  await gatekeeper.getByRole('button', { name: 'Đánh giá bằng AI' }).click()
  await expect(gatekeeper.getByText('Quy tắc kết hợp đánh giá bằng mô hình AI', { exact: false })).toBeVisible()
  await expect(gatekeeper.getByRole('heading', { name: /Cần xem kỹ/ })).toBeVisible()
  await expect(gatekeeper.getByText('Mục tiêu ghi số điện thoại riêng của người nhận.')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Duyệt và công khai' })).toBeEnabled()
  await expect(page.getByRole('button', { name: 'Trả lại cho người điều phối' })).toBeEnabled()
})
