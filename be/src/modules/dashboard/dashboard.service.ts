import { buildDashboard, toProfile } from '@gomnang/domain/dashboard.ts'
import type { UserRow } from '@gomnang/domain/types.ts'
import { todayInVietnam } from '@gomnang/domain/validate-project.ts'
import { HttpError } from '../../common/errors/http-error.ts'
import type { DashboardDeps } from './dashboard.types.ts'

export async function myDashboard(deps: DashboardDeps, user: UserRow) {
  return buildDashboard(user, await deps.dashboard.sourceFor(deps.db, user), todayInVietnam())
}

export async function profile(deps: DashboardDeps, id: string) {
  const user = await deps.users.findUser(deps.db, id)
  if (!user) throw new HttpError(404, 'USER_NOT_FOUND', 'Không tìm thấy người dùng.')
  // Hồ sơ công khai: chỉ lấy phần của chính người đó, không kèm hàng chờ xác minh dù họ là người xác minh.
  return toProfile(user, await deps.dashboard.sourceFor(deps.db, { id: user.id, isVerifier: false }))
}
