import { buildDashboard, toProfile, type Dashboard, type Profile } from '@gomnang/domain/dashboard.ts'
import { ApiError } from '../errors.ts'
import type { DemoMode } from '../demo.ts'
import { network, readStore, requireUser, today } from './store.ts'

export async function getMyDashboard(mode: DemoMode = 'normal'): Promise<Dashboard> {
  await network(mode)
  const store = readStore()
  const user = requireUser(store)
  if (mode === 'empty') return { tasks: [], projects: [], contributions: [] }
  return buildDashboard(user, store, today())
}

export async function getProfile(id: string, mode: DemoMode = 'normal'): Promise<Profile> {
  await network(mode)
  const store = readStore()
  const user = store.users.find((u) => u.id === id)
  if (!user || mode === 'empty') throw new ApiError(404, 'USER_NOT_FOUND', 'Không tìm thấy người dùng.')
  return toProfile(user, store)
}
