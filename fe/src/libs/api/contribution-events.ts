import { ApiError } from './errors.ts'
import { getSessionSnapshot } from '../session/index.ts'

/** SSE frames can span network chunks, including UTF-8 characters and CRLF boundaries. */
export async function readContributionEvents(
  response: Response, projectId: string, onEvent: (event: string) => void,
) {
  if (!response.ok) throw new ApiError(response.status, 'EVENTS_UNAVAILABLE', 'Không kết nối được cập nhật đóng góp.')
  if (!response.headers.get('content-type')?.startsWith('text/event-stream') || !response.body) {
    throw new ApiError(502, 'INVALID_EVENT_STREAM', 'Luồng cập nhật không hợp lệ.')
  }
  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  try {
    while (true) {
      const { value, done } = await reader.read()
      if (done) return
      buffer += decoder.decode(value, { stream: true })
      let boundary: RegExpExecArray | null
      while ((boundary = /\r?\n\r?\n/.exec(buffer))) {
        const frame = buffer.slice(0, boundary.index)
        buffer = buffer.slice(boundary.index + boundary[0].length)
        const lines = frame.split(/\r?\n/)
        const event = lines.find((line) => line.startsWith('event:'))?.slice(6).trim()
        if (!event) continue
        const raw = lines.filter((line) => line.startsWith('data:')).map((line) => line.slice(5).trimStart()).join('\n')
        if (!raw || JSON.parse(raw).projectId !== projectId) throw new ApiError(502, 'INVALID_EVENT', 'Sự kiện cập nhật không hợp lệ.')
        if (event === 'auth-required') throw new ApiError(401, 'AUTH_REQUIRED', 'Phiên đã hết hạn. Vui lòng đăng nhập lại.')
        if (event === 'access-lost') throw new ApiError(404, 'PROJECT_NOT_FOUND', 'Không còn quyền xem dự án.')
        if (event === 'reconnect') return 'reconnect' as const
        if (event === 'ready' || event === 'contributions-changed' || event === 'heartbeat') onEvent(event)
      }
      if (buffer.length > 65_536) throw new ApiError(502, 'INVALID_EVENT', 'Sự kiện cập nhật quá lớn.')
    }
  } finally { await reader.cancel().catch(() => {}); reader.releaseLock() }
}

export async function connectContributionEvents(projectId: string, signal: AbortSignal, onEvent: (event: string) => void) {
  const abort = new AbortController()
  const cancel = () => abort.abort(signal.reason)
  if (signal.aborted) cancel()
  else signal.addEventListener('abort', cancel, { once: true })
  let idle: ReturnType<typeof setTimeout>
  const touch = () => { clearTimeout(idle); idle = setTimeout(() => abort.abort(), 45_000) }
  const { token } = getSessionSnapshot()
  touch()
  try {
    const response = await fetch(`/api/projects/${encodeURIComponent(projectId)}/contributions/events`, {
      headers: { accept: 'text/event-stream', ...(token ? { authorization: `Bearer ${token}` } : {}) },
      cache: 'no-store', signal: abort.signal,
    })
    return await readContributionEvents(response, projectId, (event) => { touch(); onEvent(event) })
  } finally { clearTimeout(idle!); signal.removeEventListener('abort', cancel); abort.abort() }
}

export function waitForReconnect(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve) => {
    if (signal.aborted) { resolve(); return }
    const done = () => { clearTimeout(timer); signal.removeEventListener('abort', done); resolve() }
    const timer = setTimeout(done, ms)
    signal.addEventListener('abort', done, { once: true })
  })
}
