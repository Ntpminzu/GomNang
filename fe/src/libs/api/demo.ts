import { isMockMode } from '../config/env.ts'
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
  if (!isMockMode || typeof window === 'undefined') return 'normal'
  return parseDemoMode(new URLSearchParams(window.location.search).get('state'))
}

export function withDemoMode(href: string, mode: DemoMode): string {
  return !isMockMode || mode === 'normal' ? href : `${href}${href.includes('?') ? '&' : '?'}state=${mode}`
}
