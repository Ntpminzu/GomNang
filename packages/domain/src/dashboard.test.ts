import test from 'node:test'
import assert from 'node:assert/strict'
import { buildDashboard, toProfile } from './dashboard.ts'
import { DEMO_CONTRIBUTIONS, DEMO_EXPENSES, DEMO_IDS, DEMO_NEEDS, DEMO_PROJECTS, DEMO_USERS } from './demo-data.ts'

const U = DEMO_IDS.users
const P = DEMO_IDS.projects
const src = { projects: DEMO_PROJECTS, needs: DEMO_NEEDS, contributions: DEMO_CONTRIBUTIONS, expenses: DEMO_EXPENSES }
const user = (id: string) => DEMO_USERS.find((u) => u.id === id)!
const kinds = (id: string, today = '2026-09-14') => buildDashboard(user(id), src, today).tasks.map((t) => `${t.kind}:${t.projectId === P.hoaMai ? 'hoaMai' : t.projectId === P.sachGiaoKhoa ? 'sgk' : 'boKenh'}:${t.count}`)

test('việc của tôi: mỗi vai thấy đúng việc mình được phép làm', () => {
  // Khanh điều phối Hoa Mai: sữa của Hùng chờ xác nhận, 1 khoản chi chờ duyệt.
  assert.deepEqual(kinds(U.khanh), ['confirm_contributions:hoaMai:1', 'review_expenses:hoaMai:1'])
  // Mai là người tài chính Hoa Mai (xác nhận được hàng, không duyệt chi), còn 1 cam kết cơm chưa bàn giao.
  assert.deepEqual(kinds(U.mai), ['confirm_contributions:hoaMai:1', 'deliver_pledge:hoaMai:1'])
  // Tâm là người xác minh: dự án bờ kênh đang chờ.
  assert.deepEqual(kinds(U.tam), ['review_project:boKenh:1'])
  // An điều phối sách giáo khoa: bộ sách của Hùng chờ xác nhận.
  assert.deepEqual(kinds(U.an), ['confirm_contributions:sgk:1'])
})

test('việc của tôi: tới ngày bắt đầu thì nhắc người điều phối chuyển trạng thái', () => {
  assert.ok(kinds(U.khanh, '2026-09-26').includes('start_project:hoaMai:1'))
})

test('việc của tôi: liệt kê dự án theo vai và đóng góp của chính mình', () => {
  const mai = buildDashboard(user(U.mai), src, '2026-09-14')
  assert.deepEqual(
    mai.projects.map((p) => [p.name, p.role]),
    [
      ['Dọn vệ sinh bờ kênh khu phố 6', 'coordinator'],
      ['100 phần cơm cho mái ấm Hoa Mai', 'treasurer'],
    ],
  )
  assert.equal(mai.contributions.length, 2)
})

test('hồ sơ công khai chỉ đếm đóng góp đã được xác nhận ở dự án công khai', () => {
  const khanh = toProfile(user(U.khanh), src)
  assert.deepEqual(khanh.stats, { coordinated: 1, completed: 0, confirmedContributions: 1, projectsHelped: 1 })
  // Dự án bờ kênh của Mai đang chờ xác minh — chưa công khai nên không tính.
  assert.equal(toProfile(user(U.mai), src).stats.coordinated, 0)
  // Hùng có đóng góp nhưng chưa được xác nhận.
  assert.equal(toProfile(user(U.hung), src).stats.confirmedContributions, 0)
})
