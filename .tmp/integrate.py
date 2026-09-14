from pathlib import Path
import json
root=Path(__file__).resolve().parents[1]; fe=root/'fe'; src=fe/'src'
def read(p): return p.read_text(encoding='utf-8')
def write(p,s):
    p.parent.mkdir(parents=True,exist_ok=True); p.write_text(s.strip()+'\n',encoding='utf-8')
write(src/'libs/config/env.ts',read(src/'libs/config/env.ts').replace("?? 'mock'","?? 'http'"))
write(src/'libs/session/index.ts',"""
import type { Member } from '@gomnang/domain/types.ts'
import { isMockMode } from '../config/env.ts'
import { DEMO_ACCOUNTS, getSessionUser as getMockUser, setSessionUser as setMockUser } from '../api/mock/session.ts'
export { DEMO_ACCOUNTS }
export type SessionUser = Pick<Member, 'id' | 'name' | 'isVerifier'>
export type SessionSnapshot = { user: SessionUser | null; token: string | null; ready: boolean; revision: number }
export const serverSnapshot: SessionSnapshot = { user: null, token: null, ready: false, revision: 0 }
const KEY = 'gomnang.httpSession.v1'
let snapshot = serverSnapshot
const listeners = new Set<() => void>()
export const getSessionSnapshot = () => snapshot
export const getSessionUser = () => snapshot.user
export const subscribeSession = (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener) } }

function publish(user: SessionUser | null, token: string | null) {
  snapshot = { user, token, ready: true, revision: snapshot.revision + 1 }
  for (const listener of listeners) listener()
}
export function initializeSession() {
  if (snapshot.ready) return
  if (isMockMode) { publish(getMockUser(), null); return }
  try {
    const raw = globalThis.sessionStorage?.getItem(KEY)
    const saved = raw ? JSON.parse(raw) : null
    if (typeof saved?.token === 'string' && typeof saved?.user?.id === 'string' && typeof saved?.user?.name === 'string' && typeof saved?.user?.isVerifier === 'boolean') {
      publish(saved.user, saved.token)
      return
    }
  } catch { /* Storage blocked or invalid: start as guest. */ }
  publish(null, null)
}
export function saveSession(user: SessionUser | null, token: string | null = null) {
  if (isMockMode) setMockUser(user?.id ?? null)
  else {
    try {
      if (user && token) globalThis.sessionStorage?.setItem(KEY, JSON.stringify({ user, token }))
      else globalThis.sessionStorage?.removeItem(KEY)
    } catch { /* In-memory session remains usable until reload. */ }
  }
  publish(user, token)
}
export function selectMockUser(id: string | null) { setMockUser(id); publish(getMockUser(), null) }
export function expireSession(revision: number) {
  if (snapshot.revision === revision) saveSession(null)
}
""")
write(src/'libs/api/client.ts',"""
import { ApiError } from './errors.ts'
import { expireSession, getSessionSnapshot } from '../session/index.ts'
export type RequestOptions = { method?: 'GET' | 'POST' | 'PUT'; body?: unknown; anonymous?: boolean }
export type RequestClient = <T>(path: string, options?: RequestOptions) => Promise<T>
type Options = {
  baseUrl?: string
  timeoutMs?: number
  fetchImpl?: typeof fetch
  session?: { read: () => { token: string | null; revision: number }; expire: (revision: number) => void }
}

/** No automatic retry: a failed write may already have reached the server. */
export function createHttpClient(options: Options = {}): RequestClient {
  const fetchImpl = options.fetchImpl ?? globalThis.fetch
  const timeoutMs = options.timeoutMs ?? 15_000
  const session = options.session ?? { read: getSessionSnapshot, expire: expireSession }
  return async <T>(path: string, request: RequestOptions = {}): Promise<T> => {
    const started = session.read()
    const abort = new AbortController()
    const timer = setTimeout(() => abort.abort(), timeoutMs)
    const assertCurrent = () => {
      if (session.read().revision !== started.revision) throw new ApiError(409, 'SESSION_CHANGED', 'Phiên đã thay đổi. Vui lòng thử lại với tài khoản hiện tại.')
    }
    try {
      const response = await fetchImpl((options.baseUrl ?? '') + path, {
        method: request.method ?? 'GET',
        headers: {
          accept: 'application/json',
          ...(request.body === undefined ? {} : { 'content-type': 'application/json' }),
          ...(!request.anonymous && started.token ? { authorization: `Bearer ${started.token}` } : {}),
        },
        body: request.body === undefined ? undefined : JSON.stringify(request.body),
        cache: 'no-store',
        signal: abort.signal,
      })
      const text = await response.text()
      assertCurrent()
      let data: unknown
      try { data = text ? JSON.parse(text) : null } catch {
        if (response.status === 401) session.expire(started.revision)
        throw new ApiError(response.ok ? 502 : response.status, 'INVALID_RESPONSE', 'Máy chủ không trả dữ liệu JSON hợp lệ. Vui lòng thử lại.')
      }
      if (!response.ok) {
        if (response.status === 401) session.expire(started.revision)
        const payload = data as { error?: { code?: string; message?: string; details?: Record<string, string> } } | null
        throw new ApiError(response.status, payload?.error?.code ?? 'HTTP_ERROR', payload?.error?.message ?? 'Không kết nối được dịch vụ. Vui lòng thử lại.', payload?.error?.details)
      }
      return data as T
    } catch (err) {
      if (err instanceof ApiError) throw err
      assertCurrent()
      if (abort.signal.aborted) throw new ApiError(504, 'TIMEOUT', 'Máy chủ phản hồi quá lâu. Kiểm tra kết quả trước khi gửi lại.')
      throw new ApiError(503, 'NETWORK_ERROR', 'Không kết nối được máy chủ. Kiểm tra mạng rồi thử lại.')
    } finally { clearTimeout(timer) }
  }
}
export const request = createHttpClient()
""")
groups={
'projects':{'listProjects':"(_mode) => client('/api/projects')",'getProject':"(id, _mode) => client(`/api/projects/${encodeURIComponent(id)}`)",'createProject':"(input, _mode) => client('/api/projects', { method: 'POST', body: input })",'updateProject':"(id, input, _mode) => client(`/api/projects/${encodeURIComponent(id)}`, { method: 'PUT', body: input })"},
'users':{'listMembers':"(_mode) => client('/api/users')"},
'verification':{'getVerificationQueue':"(_mode) => client('/api/verification-queue')",'submitProject':"(id, _mode) => client(`/api/projects/${encodeURIComponent(id)}/submit`, { method: 'POST' })",'reviewProject':"(id, input, _mode) => client(`/api/projects/${encodeURIComponent(id)}/review`, { method: 'POST', body: input })"},
'contributions':{'commitContribution':"(id, input, _mode) => client(`/api/projects/${encodeURIComponent(id)}/contributions`, { method: 'POST', body: input })",'transitionContribution':"(id, to, _mode) => client(`/api/contributions/${encodeURIComponent(id)}/transition`, { method: 'POST', body: { to } })"}}
index="import type { ApiAdapter } from '../contracts.ts'\nimport { request, type RequestClient } from '../client.ts'\n"
for group,methods in groups.items():
    factory=group+'Http'
    write(src/f'libs/api/http/{group}.ts',"import type { ApiAdapter } from '../contracts.ts'\nimport type { RequestClient } from '../client.ts'\n"+f"export function {factory}(client: RequestClient): Pick<ApiAdapter, "+' | '.join("'"+m+"'" for m in methods)+"> {\n  return {\n"+',\n'.join('    '+name+': '+impl for name,impl in methods.items())+'\n  }\n}')
    index+=f"import {{ {factory} }} from './{group}.ts'\n"
index+="export function createHttpApi(client: RequestClient = request): ApiAdapter {\n  return { "+', '.join('...'+g+'Http(client)' for g in groups)+' }\n}\nexport const httpApi = createHttpApi()'
write(src/'libs/api/http/index.ts',index)
write(src/'libs/api/http/auth.ts',"""
import type { Member } from '@gomnang/domain/types.ts'
import { request } from '../client.ts'
export type LoginResult = { token: string; user: Member & { email: string } }
export function loginByEmail(email: string) {
  return request<LoginResult>('/api/auth/dev-login', { method: 'POST', body: { email }, anonymous: true })
}
""")
names=[n for methods in groups.values() for n in methods]
index="import { isMockMode } from '../config/env.ts'\nimport type { ApiAdapter } from './contracts.ts'\nimport { httpApi } from './http/index.ts'\nexport * from './errors.ts'\nexport * from './demo.ts'\nconst mock: ApiAdapter = {\n"
index+=',\n'.join(f"  {n}: (...args) => import('./mock/index.ts').then((m) => m.mockApi.{n}(...args))" for n in names)+'\n}\n'
index+="const api = isMockMode ? mock : httpApi\nexport const { "+', '.join(names)+" } = api\nexport async function resetMockData() { if (isMockMode) (await import('./mock/index.ts')).resetMockData() }\n"
write(src/'libs/api/index.ts',index)
p=src/'libs/api/demo.ts'; s=read(p); s="import { isMockMode } from '../config/env.ts'\n"+s;s=s.replace("if (typeof window === 'undefined')", "if (!isMockMode || typeof window === 'undefined')");s=s.replace("return mode === 'normal' ? href", "return !isMockMode || mode === 'normal' ? href");write(p,s)
write(src/'presentation/providers/SessionProvider.tsx',"""
'use client'
import { createContext, Fragment, useContext, useEffect, useSyncExternalStore } from 'react'
import { getSessionSnapshot, initializeSession, serverSnapshot, subscribeSession, type SessionSnapshot } from '../../libs/session/index.ts'
const SessionContext = createContext<SessionSnapshot>(serverSnapshot)
export function SessionProvider({ children }: { children: React.ReactNode }) {
  const session = useSyncExternalStore(subscribeSession, getSessionSnapshot, () => serverSnapshot)
  useEffect(() => { initializeSession() }, [])
  return <SessionContext.Provider value={session}>{children}</SessionContext.Provider>
}
export const useSession = () => useContext(SessionContext)
/** Changing identity immediately unmounts private views and their in-flight state. */
export function SessionBoundary({ children }: { children: React.ReactNode }) {
  const { revision, ready } = useSession()
  if (!ready) return <p role="status">Đang tải phiên làm việc…</p>
  return <Fragment key={revision}>{children}</Fragment>
}
""")
write(src/'presentation/hooks/use-load.ts',"""
'use client'
import { useEffect, useState } from 'react'
import { readDemoModeFromUrl, type DemoMode } from '../../libs/api/demo.ts'
import { toApiError, type ApiError } from '../../libs/api/errors.ts'
import { useSession } from '../providers/SessionProvider.tsx'
export type Load<T> = { status: 'loading' } | { status: 'ok'; data: T } | { status: 'error'; error: ApiError }
export function useLoad<T>(fetcher: (mode: DemoMode) => Promise<T>, deps: readonly unknown[] = []) {
  const [mode, setMode] = useState<DemoMode>('normal')
  const [state, setState] = useState<Load<T>>({ status: 'loading' })
  const [attempt, setAttempt] = useState(0)
  const { user, revision, ready } = useSession()
  useEffect(() => {
    if (!ready) return
    const current = readDemoModeFromUrl()
    setMode(current)
    setState({ status: 'loading' })
    let cancelled = false
    fetcher(current).then(
      (data) => { if (!cancelled) setState({ status: 'ok', data }) },
      (err: unknown) => { if (!cancelled) setState({ status: 'error', error: toApiError(err) }) },
    )
    return () => { cancelled = true }
    // Callers supply data dependencies explicitly; inline fetcher changes every render.
  }, [attempt, revision, ready, ...deps])
  return { mode, user, state, reload: () => setAttempt((n) => n + 1) }
}
""")
write(src/'presentation/modules/auth/components/UserSwitcher.tsx',"""
'use client'
import { useState } from 'react'
import { DEMO_USERS } from '@gomnang/domain/demo-data.ts'
import { resetMockData } from '../../../../libs/api/index.ts'
import { loginByEmail } from '../../../../libs/api/http/auth.ts'
import { toApiError } from '../../../../libs/api/errors.ts'
import { isMockMode } from '../../../../libs/config/env.ts'
import { DEMO_ACCOUNTS, saveSession, selectMockUser } from '../../../../libs/session/index.ts'
import { useSession } from '../../../providers/SessionProvider.tsx'

export function UserSwitcher() {
  const { user, ready } = useSession()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  async function switchUser(id: string) {
    setBusy(true)
    setError('')
    try {
      if (isMockMode) selectMockUser(id === 'guest' ? null : id)
      else {
        saveSession(null)
        if (id !== 'guest') {
          const account = DEMO_USERS.find((u) => u.id === id)
          if (!account) throw new Error('Không tìm thấy tài khoản mẫu.')
          const session = await loginByEmail(account.email)
          saveSession(session.user, session.token)
        }
      }
    } catch (err) { setError(toApiError(err).message) }
    finally { setBusy(false) }
  }
  return (
    <div className="user-switcher">
      <label htmlFor="as-user" className="sr-only">Đang dùng với tài khoản</label>
      <select id="as-user" value={user?.id ?? 'guest'} disabled={!ready || busy} onChange={(e) => void switchUser(e.target.value)}>
        <option value="guest">Khách (chưa đăng nhập)</option>
        {DEMO_ACCOUNTS.map((account) => <option key={account.id} value={account.id}>{account.name} — {account.hint}</option>)}
      </select>
      {busy && <span role="status">Đang đăng nhập…</span>}
      {error && <span role="alert">{error}</span>}
      {isMockMode && <button type="button" className="btn btn-sm" onClick={async () => {
        if (window.confirm('Xoá mọi thay đổi đã làm và nạp lại dữ liệu mẫu?')) {
          await resetMockData()
          window.location.reload()
        }
      }}>Đặt lại dữ liệu</button>}
    </div>
  )
}
""")
p=src/'presentation/layouts/AppShell.tsx';s=read(p)
s="import { SessionBoundary } from '../providers/SessionProvider.tsx'\n"+s
s=s.replace('{children}</main>','<SessionBoundary>{children}</SessionBoundary></main>').replace('{children}\n','<SessionBoundary>{children}</SessionBoundary>\n')
s=s.replace('Bản prototype: dữ liệu giả, lưu ngay\n          trong trình duyệt của bạn.',"{isMockMode ? 'Chế độ mock: dữ liệu giả lưu trong trình duyệt.' : 'Dữ liệu được lưu trên máy chủ.'}")
write(p,s)
p=src/'app/layout.tsx';s=read(p);s="import { SessionProvider } from '@/presentation/providers/SessionProvider.tsx'\n"+s;s=s.replace('<AppShell>{children}</AppShell>','<SessionProvider><AppShell>{children}</AppShell></SessionProvider>');write(p,s)

# Form obtains identity from the provider. Lookup failure is visible and retryable.
p=src/'presentation/modules/projects/components/ProjectForm.tsx';s=read(p)
s=s.replace("import { getSessionUser, type SessionUser } from '@/libs/session/index.ts'", "import { useSession } from '../../../providers/SessionProvider.tsx'")
s=s.replace("  const [user, setUser] = useState<SessionUser | null | undefined>(undefined)","  const { user, ready, revision } = useSession()\n  const [membersError, setMembersError] = useState<ApiError | null>(null)\n  const [lookupAttempt, setLookupAttempt] = useState(0)")
start=s.index('  useEffect(() => {');end=s.index('  if (user === undefined)',start)
s=s[:start]+"""
  useEffect(() => {
    setMode(readDemoModeFromUrl())
    if (!ready || !user) return
    let cancelled = false
    setMembers(null)
    setMembersError(null)
    listMembers('normal').then(
      (result) => { if (!cancelled) setMembers(result) },
      (err) => { if (!cancelled) setMembersError(toApiError(err)) },
    )
    return () => { cancelled = true }
  }, [ready, revision, lookupAttempt])

"""+s[end:]
s=s.replace('if (user === undefined)','if (!ready)')
s=s.replace('    const input = toInput(form)',"    if (!members) return\n    const input = toInput(form)")
# Inject immediately after final main return, before existing form children.
pos=s.index('  const errorList =')
head=s[:pos];tail=s[pos:]
tail=tail.replace('    <>','''    <>
      <ErrorAlert error={membersError} />
      {membersError && <button type="button" className="btn" onClick={() => setLookupAttempt((n) => n + 1)}>Tải lại danh sách thành viên</button>}
      {!members && !membersError && <p role="status">Đang tải danh sách thành viên…</p>}''',1)
tail=tail.replace('disabled={submitting}', 'disabled={submitting || !members}')
write(p,head+tail)

write(fe/'.env.example',"""
# http: backend/database thật; mock: prototype tuần 3.
NEXT_PUBLIC_API_MODE=http
# Chỉ Next.js server dùng; không đưa origin này vào bundle client.
API_ORIGIN=http://localhost:4000
""")
write(fe/'next.config.mjs',"""
/** @type {import('next').NextConfig} */
export default {
  transpilePackages: ['@gomnang/domain'],
  async rewrites() {
    const origin = (process.env.API_ORIGIN ?? 'http://localhost:4000').replace(/\/$/, '')
    return [{ source: '/api/:path*', destination: `${origin}/api/:path*` }]
  },
}
""")
p=fe/'package.json';pkg=json.loads(read(p));pkg['type']='module';pkg['scripts']['typecheck']='next typegen && tsc --noEmit';write(p,json.dumps(pkg,indent=2))
print('HTTP adapter and session integration written')
