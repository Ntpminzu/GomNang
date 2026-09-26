'use client'
import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Info } from 'lucide-react'
import { register, type RegisterBody } from '@/libs/api/http/auth.ts'
import { toApiError, type ApiError } from '@/libs/api/errors.ts'
import { saveSession } from '@/libs/session/index.ts'
import { readNext, safeNext } from '@/libs/utils/redirect.ts'
import { ErrorAlert, Field, a11yProps, linkClass } from '@/presentation/components/index.ts'
import { Alert, AlertDescription } from '@/presentation/components/ui/alert.tsx'
import { Button } from '@/presentation/components/ui/button.tsx'
import { Input } from '@/presentation/components/ui/input.tsx'
import { AuthCard, PasswordToggle } from '../components/AuthCard.tsx'

export default function RegisterPage() {
  const router = useRouter()
  const [form, setForm] = useState<RegisterBody>({ name: '', phone: '', email: '', password: '', confirmPassword: '' })
  const [showPassword, setShowPassword] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<ApiError | null>(null)
  const [errors, setErrors] = useState<Record<string, string>>({})

  const update = (patch: Partial<RegisterBody>) => setForm((f) => ({ ...f, ...patch }))

  function validate(): Record<string, string> {
    const errs: Record<string, string> = {}
    if (form.name.trim().length < 2) errs.name = 'Họ và tên cần ít nhất 2 ký tự.'
    if (!/^0\d{9}$/.test(form.phone.trim())) errs.phone = 'Số điện thoại gồm 10 chữ số, bắt đầu bằng 0.'
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) errs.email = 'Email chưa đúng dạng, ví dụ ten@gmail.com.'
    if (form.password.length < 8) errs.password = 'Mật khẩu cần ít nhất 8 ký tự.'
    if (form.password !== form.confirmPassword) errs.confirmPassword = 'Mật khẩu nhập lại không khớp.'
    return errs
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const found = validate()
    setErrors(found)
    const first = Object.keys(found)[0]
    if (first) {
      document.getElementById(first)?.focus()
      return
    }
    setBusy(true)
    setError(null)
    try {
      const result = await register(form)
      saveSession(result.user, result.token)
      router.push(safeNext(readNext()))
    } catch (err) {
      const apiError = toApiError(err)
      // Lỗi theo từng ô (422, email trùng) hiện ngay dưới ô đó; khung lỗi chung vẫn hiện để không lỗi nào bị lọt.
      setErrors(apiError.details ?? {})
      setError(apiError)
      setBusy(false)
    }
  }

  return (
    <AuthCard
      title="Tạo tài khoản"
      description="Miễn phí. Dùng để nhận góp sức, khởi xướng dự án và theo dõi đóng góp của bạn."
      footer={
        <>
          Đã có tài khoản?{' '}
          <Link className={linkClass} href="/login">
            Đăng nhập
          </Link>
        </>
      }
    >
      <Alert className="mb-5 border-primary/30 bg-primary/5">
        <Info aria-hidden="true" />
        <AlertDescription>
          Tài khoản mới chưa được xác minh danh tính: bạn vẫn tạo dự án và nhận góp sức được, nhưng chưa làm người phụ trách tài chính.
        </AlertDescription>
      </Alert>
      <ErrorAlert error={error} />
      <form onSubmit={handleSubmit} noValidate className="space-y-4">
        <Field id="name" label="Họ và tên" required error={errors.name}>
          <Input {...a11yProps('name', errors.name)} autoComplete="name" maxLength={100} className="h-11 text-base" value={form.name} onChange={(e) => update({ name: e.target.value })} placeholder="Nguyễn Văn A" />
        </Field>
        <Field id="phone" label="Số điện thoại" required error={errors.phone}>
          <Input
            {...a11yProps('phone', errors.phone)}
            type="tel"
            inputMode="numeric"
            autoComplete="tel"
            maxLength={10}
            className="h-11 text-base tabular-nums"
            value={form.phone}
            onChange={(e) => update({ phone: e.target.value.replace(/\D/g, '') })}
            placeholder="0901234567"
          />
        </Field>
        <Field id="email" label="Email" required error={errors.email}>
          <Input {...a11yProps('email', errors.email)} type="email" autoComplete="email" className="h-11 text-base" value={form.email} onChange={(e) => update({ email: e.target.value })} placeholder="ban@example.com" />
        </Field>
        <Field id="password" label="Mật khẩu" required error={errors.password} hint="Ít nhất 8 ký tự.">
          <div className="relative">
            <Input
              {...a11yProps('password', errors.password, true)}
              type={showPassword ? 'text' : 'password'}
              autoComplete="new-password"
              className="h-11 pr-11 text-base"
              value={form.password}
              onChange={(e) => update({ password: e.target.value })}
            />
            <PasswordToggle shown={showPassword} onToggle={() => setShowPassword((v) => !v)} />
          </div>
        </Field>
        <Field id="confirmPassword" label="Nhập lại mật khẩu" required error={errors.confirmPassword}>
          <Input
            {...a11yProps('confirmPassword', errors.confirmPassword)}
            type={showPassword ? 'text' : 'password'}
            autoComplete="new-password"
            className="h-11 text-base"
            value={form.confirmPassword}
            onChange={(e) => update({ confirmPassword: e.target.value })}
          />
        </Field>
        <Button type="submit" variant="cta" size="xl" className="w-full" disabled={busy}>
          {busy ? 'Đang tạo tài khoản…' : 'Tạo tài khoản'}
        </Button>
      </form>
    </AuthCard>
  )
}
