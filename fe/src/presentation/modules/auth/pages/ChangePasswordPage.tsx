'use client'
import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { changePassword } from '@/libs/api/http/auth.ts'
import { toApiError, type ApiError } from '@/libs/api/errors.ts'
import { roleHome } from '@/libs/utils/redirect.ts'
import { initializeSession } from '@/libs/session/index.ts'
import { useSession } from '@/presentation/providers/SessionProvider.tsx'
import { ErrorAlert, Field, LoadingState, EmptyState, a11yProps } from '@/presentation/components/index.ts'
import { Button } from '@/presentation/components/ui/button.tsx'
import { Input } from '@/presentation/components/ui/input.tsx'
import { AuthCard, PasswordToggle } from '../components/AuthCard.tsx'

export default function ChangePasswordPage() {
  const { user, ready, error: sessionError } = useSession()
  const router = useRouter()
  const [form, setForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' })
  const [shown, setShown] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<ApiError | null>(null)
  async function submit(event: React.FormEvent) {
    event.preventDefault(); setBusy(true); setError(null)
    try { const result = await changePassword(form); router.replace(roleHome(result.user.role)) }
    catch (err) { setError(toApiError(err)); setBusy(false) }
  }
  if (!ready && sessionError) return <AuthCard title="Chưa kiểm tra được phiên" description="Thử lại khi kết nối sẵn sàng; thông tin đăng nhập đã lưu vẫn được giữ." footer={<Link href="/login" className="underline">Đăng nhập lại</Link>}><ErrorAlert error={sessionError} /><Button onClick={() => void initializeSession()}>Kiểm tra phiên lại</Button></AuthCard>
  if (!ready) return <LoadingState label="Đang kiểm tra phiên…" />
  if (!user) return <AuthCard title="Đăng nhập để tiếp tục" description="Nếu thao tác đổi mật khẩu vừa bị mất phản hồi, mật khẩu mới có thể đã được lưu." footer={<Link href="/login" className="underline">Đăng nhập lại</Link>}><p>Thử đăng nhập bằng mật khẩu mới; nếu chưa được áp dụng, dùng lại mật khẩu hiện tại.</p></AuthCard>
  if (user.role !== 'verifier') return <EmptyState title="Không có quyền xem trang này"><p>Chức năng này dành cho tài khoản kiểm duyệt.</p></EmptyState>
  const fields = [['currentPassword', 'Mật khẩu hiện tại'], ['newPassword', 'Mật khẩu mới'], ['confirmPassword', 'Xác nhận mật khẩu mới']] as const
  return <AuthCard title="Đổi mật khẩu" description="Bạn có thể đổi mật khẩu khi muốn. Sau khi đổi thành công, các phiên đăng nhập khác sẽ bị thu hồi." footer={<Link href="/verify" className="underline">Về hàng chờ xác minh</Link>}>
    <ErrorAlert error={error} />
    {error && error.status >= 500 && <p role="alert" className="mb-4 text-sm">Kết quả có thể đã được lưu. Không gửi lại tự động; bạn có thể đăng nhập lại bằng mật khẩu mới để kiểm tra.</p>}
    <form onSubmit={(e) => void submit(e)} noValidate className="space-y-4">
      {fields.map(([key, label]) => <Field key={key} id={key} label={label} required error={error?.details?.[key]}><div className="relative"><Input {...a11yProps(key)} className="pr-11" type={shown ? 'text' : 'password'} autoComplete={key === 'currentPassword' ? 'current-password' : 'new-password'} value={form[key]} onChange={(e) => setForm({ ...form, [key]: e.target.value })} />{key === 'newPassword' && <PasswordToggle shown={shown} onToggle={() => setShown(!shown)} />}</div></Field>)}
      <Button type="submit" className="w-full" disabled={busy}>{busy ? 'Đang đổi mật khẩu…' : 'Đổi mật khẩu và tiếp tục'}</Button>
    </form>
  </AuthCard>
}
