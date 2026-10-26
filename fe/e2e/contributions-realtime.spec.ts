import { expect, test, type Browser, type BrowserContext, type Page } from '@playwright/test'
import { DEMO_IDS } from '@gomnang/domain/demo-data.ts'
import { startLocalServers, stopLocalServers, restartLocalBackend } from './local-servers.ts'
import { E2E_PASSWORD } from './fixtures.ts'

test.beforeAll(async () => { test.setTimeout(120_000); await startLocalServers() })
test.afterAll(stopLocalServers)

async function session(browser: Browser, email?: string) {
  const context = await browser.newContext()
  const page = await context.newPage()
  let token = ''
  if (email) {
    const response = await context.request.post('http://127.0.0.1:3100/api/auth/login', { data: { email, password: E2E_PASSWORD } })
    expect(response.status()).toBe(200)
    const login = await response.json()
    token = login.token
    await context.addInitScript((login) => sessionStorage.setItem('gomnang.httpSession.v1', JSON.stringify(login)), login)
  }
  return { context, page, token }
}
async function table(page: Page, id: string = DEMO_IDS.projects.hoaMai) {
  await page.goto(`/projects/${id}`)
  await page.getByRole('tab', { name: /^Đóng góp/ }).click()
  await expect(page.getByRole('status').filter({ hasText: 'Bảng đóng góp đã đồng bộ trực tiếp.' })).toBeVisible()
  return page.getByRole('list', { name: 'Danh sách đóng góp của dự án' })
}
async function commit(context: BrowserContext, token: string, quantity = 1) {
  const response = await context.request.post(`http://127.0.0.1:3100/api/projects/${DEMO_IDS.projects.hoaMai}/contributions`, {
    headers: { authorization: `Bearer ${token}` }, data: { needItemId: DEMO_IDS.needs.com, quantity },
  })
  expect(response.status()).toBe(201)
  return response.json()
}
async function transition(context: BrowserContext, token: string, id: string, to: string, note?: string) {
  const response = await context.request.post(`http://127.0.0.1:3100/api/contributions/${id}/transition`, {
    headers: { authorization: `Bearer ${token}` }, data: { to, note },
  })
  expect(response.status()).toBe(200)
}

test('two sessions: only table updates for creation/delivery/confirmation/cancel, notes and no navigation', async ({ browser }) => {
  const actor = await session(browser, 'an@gomnang.test')
  const viewer = await session(browser, 'khanh@gomnang.test')
  const outsider = await session(browser)
  try {
    const list = await table(viewer.page)
    const otherList = await table(outsider.page, DEMO_IDS.projects.sachGiaoKhoa)
    const count = await list.getByRole('listitem').count()
    const otherCount = await otherList.getByRole('listitem').count()
    const tabLabel = await viewer.page.getByRole('tab', { name: /^Đóng góp/ }).textContent()
    let navigations = 0
    viewer.page.on('framenavigated', () => navigations++)
    const contribution = await commit(actor.context, actor.token)
    await expect(list.getByRole('listitem')).toHaveCount(count + 1)
    const row = list.getByRole('listitem').last()
    await transition(actor.context, actor.token, contribution.id, 'delivered', 'Giao tận tay US10')
    await expect(row).toContainText('Giao tận tay US10')
    await expect(row.getByRole('button', { name: 'Xác nhận đã nhận' })).toBeVisible()
    await transition(viewer.context, viewer.token, contribution.id, 'confirmed')
    await expect(row).toContainText('Đã xác nhận')
    const cancelled = await commit(actor.context, actor.token)
    await expect(list.getByRole('listitem')).toHaveCount(count + 2)
    await transition(actor.context, actor.token, cancelled.id, 'cancelled', 'Hủy US10')
    await expect(list.getByRole('listitem').last()).toContainText('Hủy US10')
    await expect(otherList.getByRole('listitem')).toHaveCount(otherCount)
    expect(await viewer.page.getByRole('tab', { name: /^Đóng góp/ }).textContent()).toBe(tabLabel)
    expect(navigations).toBe(0)
  } finally { await actor.context.close(); await viewer.context.close(); await outsider.context.close() }
})

test('offline/remount resync and backend restart preserve latest table', async ({ browser }) => {
  test.setTimeout(120_000)
  const actor = await session(browser, 'an@gomnang.test'), viewer = await session(browser)
  try {
    const list = await table(viewer.page)
    const count = await list.getByRole('listitem').count()
    await viewer.page.getByRole('tab', { name: /^Nhu cầu/ }).click()
    await viewer.context.setOffline(true)
    await viewer.page.getByRole('tab', { name: /^Đóng góp/ }).click()
    await expect(viewer.page.getByRole('status').filter({ hasText: 'Mất kết nối' })).toBeVisible()
    await commit(actor.context, actor.token)
    await viewer.context.setOffline(false)
    await expect(list.getByRole('listitem')).toHaveCount(count + 1)
    await restartLocalBackend()
    await expect(viewer.page.getByRole('status').filter({ hasText: 'Bảng đóng góp đã đồng bộ trực tiếp.' })).toBeVisible({ timeout: 30_000 })
    await commit(actor.context, actor.token)
    await expect(list.getByRole('listitem')).toHaveCount(count + 2)
  } finally { await actor.context.close(); await viewer.context.close() }
})

test('snapshot error retries and invalidation during an old snapshot triggers a fresh read', async ({ browser }) => {
  const actor = await session(browser, 'an@gomnang.test'), viewer = await session(browser)
  try {
    const list = await table(viewer.page)
    const count = await list.getByRole('listitem').count()
    const snapshotUrl = `**/api/projects/${DEMO_IDS.projects.hoaMai}`
    await viewer.page.route(snapshotUrl, (route) => route.abort('failed'))
    await commit(actor.context, actor.token)
    await expect(viewer.page.getByRole('status').filter({ hasText: 'Chưa đồng bộ được' })).toBeVisible()
    await expect(list.getByRole('listitem')).toHaveCount(count)
    await viewer.page.unroute(snapshotUrl)
    await expect(list.getByRole('listitem')).toHaveCount(count + 1)
    let release!: () => void
    let captured!: () => void
    const oldSnapshot = new Promise<void>((resolve) => { captured = resolve })
    const gate = new Promise<void>((resolve) => { release = resolve })
    let first = true
    await viewer.page.route(snapshotUrl, async (route) => {
      if (!first) { await route.continue(); return }
      first = false
      const response = await route.fetch()
      captured()
      await gate
      await route.fulfill({ response })
    })
    await commit(actor.context, actor.token)
    await oldSnapshot
    await commit(actor.context, actor.token)
    release()
    await expect(list.getByRole('listitem')).toHaveCount(count + 3)
    await expect(viewer.page.getByRole('status').filter({ hasText: 'Bảng đóng góp đã đồng bộ trực tiếp.' })).toBeVisible()
  } finally { await actor.context.close(); await viewer.context.close() }
})

test('empty public table gets its first row and project cancellation updates only the table', async ({ browser }) => {
  const owner = await session(browser, 'khanh@gomnang.test'), reviewer = await session(browser, 'tam@gomnang.test'), guest = await session(browser)
  const contributor = await session(browser, 'an@gomnang.test')
  try {
    const headers = { authorization: `Bearer ${owner.token}` }
    const created = await owner.context.request.post('http://127.0.0.1:3100/api/projects', { headers, data: {
      name: `E2E SSE 100 phần cơm ${Date.now()}`, goal: 'Nấu và trao 100 phần cơm cho trẻ em tại mái ấm trong tháng này.',
      beneficiaryGroup: 'Trẻ em tại mái ấm', location: 'Phường Linh Trung, Thành phố Thủ Đức',
      startDate: '2026-10-30', endDate: '2026-10-30', needItems: [{ label: 'Cơm', unit: 'phần', kind: 'goods', targetQty: 100 }],
    } })
    expect(created.status()).toBe(201)
    const project = await created.json()
    const base = `http://127.0.0.1:3100/api/projects/${project.id}`
    expect((await guest.context.request.get(base + '/contributions/events')).status()).toBe(404)
    expect((await owner.context.request.post(base + '/submit', { headers })).status()).toBe(200)
    expect((await reviewer.context.request.post(base + '/review', { headers: { authorization: `Bearer ${reviewer.token}` }, data: { decision: 'approve' } })).status()).toBe(200)
    const list = await table(guest.page, project.id)
    await expect(guest.page.getByText('Chưa có ai đóng góp')).toBeVisible()
    const contribution = await contributor.context.request.post(base + '/contributions', { headers: { authorization: `Bearer ${contributor.token}` }, data: { needItemId: project.needs[0].id, quantity: 1 } })
    expect(contribution.status()).toBe(201)
    await expect(list.getByRole('listitem')).toHaveCount(1)
    expect((await owner.context.request.post(base + '/cancel', { headers, data: { reason: 'Hủy để kiểm thử SSE' } })).status()).toBe(200)
    await expect(list.getByRole('listitem')).toContainText('Đã huỷ')
    await expect(guest.page.getByRole('tab', { name: 'Đóng góp (0)' })).toBeVisible()
  } finally { await owner.context.close(); await reviewer.context.close(); await guest.context.close(); await contributor.context.close() }
})

test('Next proxy remains live after multiple rotations beyond 125 seconds', async ({ browser }) => {
  test.setTimeout(180_000)
  const actor = await session(browser, 'an@gomnang.test'), viewer = await session(browser)
  try {
    const list = await table(viewer.page)
    const count = await list.getByRole('listitem').count()
    let streams = 0
    viewer.page.on('request', (request) => { if (request.url().endsWith('/contributions/events')) streams++ })
    await viewer.page.waitForTimeout(130_000)
    expect(streams).toBeGreaterThanOrEqual(2)
    await commit(actor.context, actor.token)
    await expect(list.getByRole('listitem')).toHaveCount(count + 1)
  } finally { await actor.context.close(); await viewer.context.close() }
})
