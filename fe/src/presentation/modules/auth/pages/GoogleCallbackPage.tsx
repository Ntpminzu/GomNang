'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { completeGoogleOnce, confirmGoogleLink } from '@/libs/api/http/auth.ts'
import { toApiError, type ApiError } from '@/libs/api/errors.ts'
import { safeNext } from '@/libs/utils/redirect.ts'
import { initializeSession, getSessionSnapshot } from '@/libs/session/index.ts'
import { ErrorAlert, Field, a11yProps } from '@/presentation/components/index.ts'
import { Input } from '@/presentation/components/ui/input.tsx'
import { Button } from '@/presentation/components/ui/button.tsx'
import { AuthCard, PasswordToggle } from '../components/AuthCard.tsx'

export default function GoogleCallbackPage() {
  const router = useRouter()
  const [linkRequired, setLinkRequired] = useState(false)
  const [password, setPassword] = useState('')
  const [confirmed, setConfirmed] = useState(false)
  const [shown, setShown] = useState(false)
  const [busy, setBusy] = useState(true)
  const [error, setError] = useState<ApiError | null>(null)
  useEffect(() => {
    let cancelled = false
    const status = new URLSearchParams(window.location.search).get('status')
    if (status === 'completed') {
      void initializeSession().then(() => {
        if (cancelled) return
        let saved: { userId?: string; next?: string } = {}
        try { saved = JSON.parse(sessionStorage.getItem('gomnang.oauthReturn.v1') || '{}') } catch {}
        const current = getSessionSnapshot()
        if (current.user && current.user.id === saved.userId) router.replace(safeNext(saved.next || '/'))
        else { setError(toApiError(new Error('Phiên đã thay đổi hoặc chưa kiểm tra được. Vui lòng đăng nhập lại.'))); setBusy(false) }
      })
      return () => { cancelled = true }
    }
    if (status !== 'ready') {
      setError(toApiError(new Error(status === 'cancelled' ? 'Bạn đã hủy đăng nhập Google.' : 'Không hoàn tất được đăng nhập Google. Hãy bắt đầu lại.'))); setBusy(false)
      return
    }
    completeGoogleOnce().then((result) => {
      if (cancelled) return
      if (result.status === 'authenticated') router.replace(safeNext(result.next))
      else { setLinkRequired(true); setBusy(false) }
    }, (err) => { if (!cancelled) { setError(toApiError(err)); setBusy(false) } })
    return () => { cancelled = true }
  }, [router])
  async function link(event: React.FormEvent) {
    event.preventDefault()
    if (!confirmed) return
    setBusy(true); setError(null)
    try { const result = await confirmGoogleLink(password); router.replace(safeNext(result.next)) }
    catch (err) { setError(toApiError(err)); setBusy(false) }
  }
  return <AuthCard title={linkRequired ? 'Xác nhận liên kết tài khoản' : 'Đăng nhập Google'} description={linkRequired ? 'Email này đã có tài khoản GomNang. Nhập mật khẩu cũ để giữ đúng tài khoản và dữ liệu của bạn.' : 'Đang hoàn tất đăng nhập của bạn.'} footer={<Link href="/login" className="underline">Về trang đăng nhập</Link>}>
    <ErrorAlert error={error} />
    {busy && <p role="status" className="mb-4">Đang xử lý…</p>}
    {linkRequired && <form onSubmit={(e) => void link(e)} className="space-y-4">
      <Field id="link-password" label="Mật khẩu tài khoản cũ" required><div className="relative"><Input {...a11yProps('link-password')} className="pr-11" type={shown ? 'text' : 'password'} autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} /><PasswordToggle shown={shown} onToggle={() => setShown(!shown)} /></div></Field>
      <label className="flex items-start gap-2 text-sm"><input className="mt-1 size-4" type="checkbox" checked={confirmed} onChange={(e) => setConfirmed(e.target.checked)} />Tôi xác nhận liên kết Google với tài khoản cũ.</label>
      <Button type="submit" disabled={busy || !confirmed} className="w-full">Xác nhận liên kết</Button>
    </form>}
    {error && <Button asChild variant="outline" className="mt-4 w-full"><a href="/api/auth/google/start">Bắt đầu đăng nhập Google lại</a></Button>}
  </AuthCard>
}
