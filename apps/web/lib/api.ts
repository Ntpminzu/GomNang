import { MOCK_MEMBERS, MOCK_PROJECTS } from './mock-data.ts'
import type { Member, ProjectDetail, ProjectSummary } from './types.ts'

/**
 * Lớp truy cập dữ liệu. Tuần 3 trả dữ liệu giả; tuần 4 thay thân hàm bằng fetch()
 * tới backend thật. Chữ ký hàm giữ nguyên nên các màn hình không phải sửa.
 */

/** Chế độ demo để trình bày đủ 4 trạng thái trước lớp mà không cần tắt mạng. */
export type DemoMode = 'normal' | 'slow' | 'empty' | 'error'

export const DEMO_MODES: { value: DemoMode; label: string }[] = [
  { value: 'normal', label: 'Bình thường' },
  { value: 'slow', label: 'Mạng chậm' },
  { value: 'empty', label: 'Không có dữ liệu' },
  { value: 'error', label: 'Máy chủ lỗi' },
]

export function parseDemoMode(value: string | null | undefined): DemoMode {
  return value === 'slow' || value === 'empty' || value === 'error' ? value : 'normal'
}

/** Đọc chế độ demo từ query string. Chỉ gọi được ở phía trình duyệt. */
export function readDemoModeFromUrl(): DemoMode {
  if (typeof window === 'undefined') return 'normal'
  return parseDemoMode(new URLSearchParams(window.location.search).get('state'))
}

export function withDemoMode(href: string, mode: DemoMode): string {
  return mode === 'normal' ? href : `${href}${href.includes('?') ? '&' : '?'}state=${mode}`
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

async function simulateNetwork(mode: DemoMode): Promise<void> {
  await sleep(mode === 'slow' ? 3000 : 600)
  if (mode === 'error') {
    throw new Error('Không kết nối được máy chủ. Kiểm tra mạng rồi thử lại.')
  }
}

export async function fetchProjects(mode: DemoMode): Promise<ProjectSummary[]> {
  await simulateNetwork(mode)
  if (mode === 'empty') return []
  return MOCK_PROJECTS
}

export async function fetchProject(id: string, mode: DemoMode): Promise<ProjectDetail | null> {
  await simulateNetwork(mode)
  if (mode === 'empty') return null
  return MOCK_PROJECTS.find((p) => p.id === id) ?? null
}

export async function fetchMembers(mode: DemoMode): Promise<Member[]> {
  await simulateNetwork(mode === 'empty' ? 'normal' : mode)
  return MOCK_MEMBERS
}

/** Tuần 3 chưa ghi dữ liệu thật — chỉ trả về mã dự án giả để hiện trạng thái thành công. */
export async function createProject(mode: DemoMode): Promise<{ id: string }> {
  await simulateNetwork(mode === 'empty' ? 'normal' : mode)
  return { id: 'p-new' }
}
