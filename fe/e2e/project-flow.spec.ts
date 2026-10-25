import { expect, test, type Page } from '@playwright/test'
import { startLocalServers, stopLocalServers } from './local-servers.ts'
import { E2E_PASSWORD } from './fixtures.ts'
import { DEMO_IDS } from '@gomnang/domain/demo-data.ts'

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

/** Người đang đăng nhập tạo bản nháp qua form thật; trả URL trang dự án. */
async function createDraft(page: Page, name: string, goal: string, need: { label: string; unit: string; qty: number }) {
  const futureDate = new Date(Date.now() + 2 * 86400_000).toISOString().slice(0, 10)
  await page.goto('/projects/new')
  await page.getByLabel('Tên dự án').fill(name)
  await page.getByLabel('Mục tiêu').fill(goal)
  await page.getByLabel('Nhóm thụ hưởng').selectOption({ label: 'Trẻ em tại mái ấm' })
  await page.getByLabel('Địa điểm').fill('Phường Linh Trung, Thành phố Thủ Đức')
  await page.getByLabel('Ngày bắt đầu').fill(futureDate)
  await page.getByLabel('Ngày kết thúc').fill(futureDate)
  await page.locator('[id="needItems.0.label"]').fill(need.label)
  await page.locator('[id="needItems.0.unit"]').fill(need.unit)
  await page.locator('[id="needItems.0.targetQty"]').fill(String(need.qty))
  await page.getByRole('button', { name: 'Tạo bản nháp dự án' }).click()
  await expect(page.getByRole('heading', { name })).toBeVisible()
  return page.url()
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

  await loginAs(page, 'khanh@gomnang.test')
  const projectUrl = await createDraft(page, projectName, 'Nấu và trao 100 phần cơm cho trẻ em tại mái ấm trong tháng này.', { label: 'Cơm', unit: 'phần', qty: 100 })

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

  await loginAs(page, 'khanh@gomnang.test')
  await createDraft(page, projectName, 'Trao 50 suất quà cho chị Lan, liên hệ 0912345678 để nhận tại nhà số 12.', { label: 'Quà', unit: 'suất', qty: 50 })
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

test('Q-03 xoá bản nháp: phải xác nhận, xoá xong về Việc của tôi và không mở lại được', async ({ page }) => {
  const projectName = `E2E bản nháp sẽ xoá ${Date.now()}`

  await loginAs(page, 'khanh@gomnang.test')
  const projectUrl = await createDraft(page, projectName, 'Trao 20 phần quà cho 20 em nhỏ tại mái ấm trong buổi sinh hoạt cuối tuần.', { label: 'Quà', unit: 'phần', qty: 20 })

  await page.getByRole('button', { name: 'Xoá bản nháp' }).click()
  const dialog = page.getByRole('dialog', { name: 'Xoá bản nháp này?' })
  await dialog.getByRole('button', { name: 'Quay lại' }).click()
  await expect(dialog).toHaveCount(0)
  await expect(page.getByRole('heading', { name: projectName })).toBeVisible()

  await page.getByRole('button', { name: 'Xoá bản nháp' }).click()
  await dialog.getByRole('button', { name: 'Xoá bản nháp' }).click()
  await expect(page).toHaveURL(/\/me$/)
  await expect(page.getByText('Đã xoá bản nháp.')).toBeVisible()
  await expect(page.getByText(projectName)).toHaveCount(0)

  await page.goto(projectUrl)
  await expect(page.getByText('Không tìm thấy', { exact: true })).toBeVisible()
})

test('US-3 danh sách: tìm không dấu, bộ lọc nằm trên URL, tải lại vẫn giữ, không khớp thì có nút xoá bộ lọc', async ({ page }) => {
  await page.goto('/?q=hoa%20mai')
  const list = page.locator('#projects')
  await expect(page.getByLabel('Tìm theo tên dự án, địa điểm hoặc nhóm thụ hưởng')).toHaveValue('hoa mai')
  await expect(list.getByRole('heading', { name: '100 phần cơm cho mái ấm Hoa Mai' })).toBeVisible()
  await expect(list.getByText('1 dự án', { exact: true })).toBeVisible()
  await expect(page).toHaveURL(/\?q=hoa\+mai$/)

  await page.reload()
  await expect(page.getByLabel('Tìm theo tên dự án, địa điểm hoặc nhóm thụ hưởng')).toHaveValue('hoa mai')
  await expect(page).toHaveURL(/\?q=hoa\+mai$/)

  await page.getByLabel('Lọc theo trạng thái').selectOption({ label: 'Đã huỷ' })
  await expect(page).toHaveURL(/status=cancelled/)
  await expect(list.getByText('Không có dự án nào khớp bộ lọc')).toBeVisible()
  await list.getByRole('button', { name: 'Xoá bộ lọc' }).last().click()
  await expect(page).toHaveURL(/\/$/)
  await expect(list.getByRole('heading', { name: '100 phần cơm cho mái ấm Hoa Mai' })).toBeVisible()
})

test('US-5 chứng từ: thủ quỹ tải ảnh rồi ghi chi; chờ duyệt thì khách không xem được, duyệt xong thì công khai', async ({ page }) => {
  const ledger = `/projects/${DEMO_IDS.projects.hoaMai}?tab=ledger`
  const description = `E2E mua gas có chứng từ ${Date.now()}`
  // Ảnh PNG 1×1 thật: máy chủ kiểm loại theo byte đầu file.
  const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==', 'base64')

  await loginAs(page, 'mai@gomnang.test')
  await page.goto(ledger)
  await page.getByRole('button', { name: 'Ghi khoản chi' }).click()
  const dialog = page.getByRole('dialog', { name: 'Ghi khoản chi' })
  await dialog.getByLabel(/^Số tiền/).fill('20')
  await dialog.getByLabel(/^Chi cho việc gì/).fill(description)
  await dialog.getByLabel('Ảnh hoặc PDF chứng từ').setInputFiles({ name: 'hoa-don-gas.png', mimeType: 'image/png', buffer: png })
  await expect(dialog.getByText(/Đã tải: hoa-don-gas\.png/)).toBeVisible()
  await dialog.getByRole('button', { name: 'Ghi khoản chi' }).click()
  await expect(dialog).toHaveCount(0)
  const row = page.getByRole('listitem').filter({ hasText: description })
  await expect(row.getByRole('button', { name: 'Xem chứng từ' })).toBeVisible()

  const guest = await page.context().newPage()
  await guest.goto(ledger)
  await guest.getByRole('listitem').filter({ hasText: description }).getByRole('button', { name: 'Xem chứng từ' }).click()
  await expect(guest.getByRole('dialog').getByText('Không tìm thấy file, hoặc bạn không có quyền xem.')).toBeVisible()

  await loginAs(page, 'khanh@gomnang.test')
  await page.goto(ledger)
  await row.getByRole('button', { name: 'Xem chứng từ' }).click()
  await expect(page.getByRole('dialog').getByRole('img', { name: 'Chứng từ hoa-don-gas.png' })).toBeVisible()
  await page.keyboard.press('Escape')
  await row.getByRole('button', { name: 'Duyệt' }).click()
  await expect(row.getByText('Đã duyệt')).toBeVisible()

  await guest.reload()
  await guest.getByRole('listitem').filter({ hasText: description }).getByRole('button', { name: 'Xem chứng từ' }).click()
  await expect(guest.getByRole('dialog').getByRole('img', { name: 'Chứng từ hoa-don-gas.png' })).toBeVisible()
  await guest.close()
})

test('US-4 người xác minh trả lại có lý do; người điều phối thấy lý do, gửi lại được', async ({ page }) => {
  const projectName = `E2E trả lại ${Date.now()}`
  const reason = 'Cần ghi rõ giờ phát quà và ai nhận quà.'
  await loginAs(page, 'khanh@gomnang.test')
  const projectUrl = await createDraft(page, projectName, 'Trao 30 phần quà cho 30 em nhỏ tại mái ấm trong buổi sinh hoạt.', { label: 'Quà', unit: 'phần', qty: 30 })
  await page.getByRole('button', { name: 'Gửi xác minh' }).click()
  await expect(page.getByRole('button', { name: 'Gửi xác minh' })).toHaveCount(0)

  await loginAs(page, 'tam@gomnang.test')
  await page.goto('/verify')
  await page.getByRole('link', { name: new RegExp(projectName) }).click()
  await page.getByRole('button', { name: 'Trả lại cho người điều phối' }).click()
  await expect(page.getByText('Trả lại dự án thì bắt buộc ghi lý do', { exact: false })).toBeVisible()
  await page.getByLabel(/^Lý do trả lại/).fill(reason)
  await page.getByRole('button', { name: 'Trả lại cho người điều phối' }).click()
  await expect(page.getByRole('button', { name: 'Trả lại cho người điều phối' })).toHaveCount(0)
  await page.goto('/verify')
  await expect(page.getByRole('link', { name: new RegExp(projectName) })).toHaveCount(0)

  await loginAs(page, 'khanh@gomnang.test')
  await page.goto(projectUrl)
  await expect(page.getByText('Người xác minh đã trả lại dự án')).toBeVisible()
  await expect(page.getByText(reason)).toBeVisible()
  await page.getByRole('button', { name: 'Gửi xác minh' }).click()
  await expect(page.getByText('Người xác minh đã trả lại dự án')).toHaveCount(0)
})

test('US-6 việc của tôi đổi theo tài khoản; hồ sơ công khai không có email', async ({ page }) => {
  const hoaMai = '100 phần cơm cho mái ấm Hoa Mai'
  const mine = page.locator('section[aria-labelledby="my-projects-title"]')
  await loginAs(page, 'khanh@gomnang.test')
  await page.goto('/me')
  await expect(mine.getByRole('listitem').filter({ hasText: hoaMai }).getByText('Bạn điều phối')).toBeVisible()

  await loginAs(page, 'mai@gomnang.test')
  await page.goto('/me')
  await expect(mine.getByRole('listitem').filter({ hasText: hoaMai }).getByText('Bạn phụ trách tài chính')).toBeVisible()

  await loginAs(page, 'an@gomnang.test')
  await page.goto('/me')
  await expect(page.getByRole('heading', { name: 'Việc của tôi' })).toBeVisible()
  await expect(mine.getByText(hoaMai)).toHaveCount(0)

  await page.goto(`/u/${DEMO_IDS.users.mai}`)
  await expect(page.getByRole('heading', { level: 1, name: 'Nguyễn Thị Mai' })).toBeVisible()
  await expect(page.getByText('@gomnang.test')).toHaveCount(0)
})
