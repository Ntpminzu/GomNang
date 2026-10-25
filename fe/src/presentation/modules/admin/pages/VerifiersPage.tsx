'use client'
import { useEffect, useState } from 'react'
import type { VerifierAccount } from '@gomnang/domain/types.ts'
import { request } from '@/libs/api/client.ts'
import { refreshSession } from '@/libs/api/http/auth.ts'
import { toApiError, type ApiError } from '@/libs/api/errors.ts'
import { useSession } from '@/presentation/providers/SessionProvider.tsx'
import { ErrorAlert, Field, EmptyState, LoadingState, PageHeader, a11yProps } from '@/presentation/components/index.ts'
import { Button } from '@/presentation/components/ui/button.tsx'
import { Input } from '@/presentation/components/ui/input.tsx'
import { PasswordToggle } from '@/presentation/modules/auth/components/AuthCard.tsx'

const emptyForm = { name: '', email: '', password: '', confirmPassword: '' }
export default function VerifiersPage() {
  const { user, ready } = useSession()
  if (!ready) return <LoadingState label="Đang kiểm tra phiên…" />
  if (user?.role !== 'admin') return <EmptyState title="Không có quyền xem trang này"><p>Chỉ quản trị viên được cấp tài khoản kiểm duyệt.</p></EmptyState>
  return <VerifierManagement />
}
function VerifierManagement() {
  const [accounts, setAccounts] = useState<VerifierAccount[] | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [shown, setShown] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<ApiError | null>(null)
  const [success, setSuccess] = useState('')
  const [uncertain, setUncertain] = useState(false)
  async function load() {
    try { setAccounts(await request<VerifierAccount[]>('/api/admin/verifiers')) }
    catch (err) {
      const e = toApiError(err); setError(e)
      if (e.status === 403) void refreshSession().catch(() => {})
    }
  }
  useEffect(() => { void load() }, [])
  async function submit(event: React.FormEvent) {
    event.preventDefault(); setBusy(true); setError(null); setSuccess(''); setUncertain(false)
    try {
      const created = await request<VerifierAccount>('/api/admin/verifiers', { method: 'POST', body: form })
      setSuccess('Đã tạo tài khoản ' + created.email + '. Cung cấp mật khẩu riêng cho người kiểm duyệt.')
      setForm(emptyForm)
      await load()
    } catch (err) {
      const e = toApiError(err); setError(e)
      setUncertain(e.status >= 500)
      if (e.status === 403) void refreshSession().catch(() => {})
    } finally { setBusy(false) }
  }
  const update = (key: keyof typeof form, value: string) => setForm((old) => ({ ...old, [key]: value }))
  return <div className="space-y-8">
    <PageHeader eyebrow="Quản trị" title="Tài khoản kiểm duyệt" description="Cấp tài khoản và mật khẩu cho người xác minh dự án. Người nhận có thể tự đổi mật khẩu khi muốn." />
    <section className="max-w-xl rounded-2xl border bg-card p-5 sm:p-6" aria-labelledby="create-verifier-title">
      <h2 id="create-verifier-title" className="mb-4 text-lg font-semibold">Tạo người kiểm duyệt</h2>
      <ErrorAlert error={error} />
      {success && <p role="status" className="mb-4 text-sm text-primary">{success}</p>}
      {uncertain && <div className="mb-4 space-y-2" role="alert"><p>Kết quả có thể đã được lưu. Kiểm tra danh sách trước khi thử lại; email xuất hiện chưa chứng minh mật khẩu vừa nhập đã được áp dụng.</p><Button type="button" variant="outline" onClick={() => void load()}>Kiểm tra danh sách</Button></div>}
      <form onSubmit={(e) => void submit(e)} noValidate className="space-y-4">
        <Field id="verifier-name" label="Họ và tên" required error={error?.details?.name}><Input {...a11yProps('verifier-name')} autoComplete="off" value={form.name} onChange={(e) => update('name', e.target.value)} /></Field>
        <Field id="verifier-email" label="Email người kiểm duyệt" required error={error?.details?.email}><Input {...a11yProps('verifier-email')} type="email" autoComplete="off" value={form.email} onChange={(e) => update('email', e.target.value)} /></Field>
        <Field id="verifier-password" label="Mật khẩu" required hint="Ít nhất 8 ký tự. Lưu lại để cung cấp riêng; danh sách không hiển thị mật khẩu." error={error?.details?.password}>
          <div className="relative"><Input {...a11yProps('verifier-password')} className="pr-11" type={shown ? 'text' : 'password'} autoComplete="new-password" value={form.password} onChange={(e) => update('password', e.target.value)} /><PasswordToggle shown={shown} onToggle={() => setShown(!shown)} /></div>
        </Field>
        <Field id="verifier-confirm" label="Xác nhận mật khẩu" required error={error?.details?.confirmPassword}><Input {...a11yProps('verifier-confirm')} type={shown ? 'text' : 'password'} autoComplete="new-password" value={form.confirmPassword} onChange={(e) => update('confirmPassword', e.target.value)} /></Field>
        <Button type="submit" disabled={busy}>{busy ? 'Đang tạo…' : 'Tạo tài khoản kiểm duyệt'}</Button>
      </form>
    </section>
    <section aria-labelledby="verifiers-list-title" className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3"><h2 id="verifiers-list-title" className="text-lg font-semibold">Danh sách người kiểm duyệt</h2><Button variant="outline" onClick={() => void load()}>Tải lại danh sách</Button></div>
      {accounts === null ? <LoadingState label="Đang tải tài khoản…" /> : accounts.length === 0 ? <EmptyState title="Chưa có tài khoản kiểm duyệt" /> :
        <ul className="grid gap-3 sm:grid-cols-2">{accounts.map((account) => <li key={account.id} className="min-w-0 rounded-xl border bg-card p-4"><p className="font-medium">{account.name}</p><p className="break-all text-sm text-muted-foreground">{account.email}</p></li>)}</ul>}
    </section>
  </div>
}
