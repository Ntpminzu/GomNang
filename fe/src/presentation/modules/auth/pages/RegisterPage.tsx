'use client'
import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { register, type RegisterBody } from '@/libs/api/http/auth.ts'
import { toApiError } from '@/libs/api/errors.ts'
import { saveSession } from '@/libs/session/index.ts'
import { ErrorAlert, Field, a11yProps } from '@/presentation/components/index.ts'

export default function RegisterPage() {
  const router = useRouter()
  const [form, setForm] = useState<RegisterBody>({ name: '', phone: '', email: '', password: '', confirmPassword: '' })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<import('@/libs/api/errors.ts').ApiError | null>(null)
  const [clientErrors, setClientErrors] = useState<Record<string, string>>({})

  function update(patch: Partial<RegisterBody>) {
    setForm((f) => ({ ...f, ...patch }))
  }

  function validate(): Record<string, string> {
    const errs: Record<string, string> = {}
    if (form.name.trim().length < 2) errs.name = 'Tên tối thiểu 2 ký tự'
    if (!/^0\d{9}$/.test(form.phone.trim())) errs.phone = 'Số điện thoại gồm 10 chữ số, bắt đầu bằng 0'
    if (!form.email.includes('@')) errs.email = 'Email không hợp lệ'
    if (form.password.length < 8) errs.password = 'Mật khẩu tối thiểu 8 ký tự'
    if (form.password !== form.confirmPassword) errs.confirmPassword = 'Mật khẩu xác nhận không khớp'
    return errs
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const errs = validate()
    setClientErrors(errs)
    if (Object.keys(errs).length > 0) return

    setBusy(true)
    setError(null)
    try {
      const result = await register(form)
      saveSession(result.user, result.token)
      router.push('/')
    } catch (err) {
      setError(toApiError(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <div className="page-head">
        <h1>Đăng ký tài khoản</h1>
      </div>

      <div className="auth-form-wrap">
        <ErrorAlert error={error} />

        <form onSubmit={handleSubmit} noValidate>
          <div className="card">
            <Field id="name" label="Họ và tên" required error={clientErrors.name}>
              <input
                {...a11yProps('name', clientErrors.name)}
                type="text"
                autoComplete="name"
                maxLength={100}
                value={form.name}
                onChange={(e) => update({ name: e.target.value })}
                placeholder="Nguyễn Văn A"
              />
            </Field>

            <Field id="phone" label="Số điện thoại" required error={clientErrors.phone}>
              <input
                {...a11yProps('phone', clientErrors.phone)}
                type="tel"
                autoComplete="tel"
                maxLength={10}
                value={form.phone}
                onChange={(e) => update({ phone: e.target.value })}
                placeholder="0901234567"
              />
            </Field>

            <Field id="email" label="Email" required error={clientErrors.email}>
              <input
                {...a11yProps('email', clientErrors.email)}
                type="email"
                autoComplete="email"
                value={form.email}
                onChange={(e) => update({ email: e.target.value })}
                placeholder="you@example.com"
              />
            </Field>

            <Field id="password" label="Mật khẩu" required error={clientErrors.password} hint="Tối thiểu 8 ký tự">
              <input
                {...a11yProps('password', clientErrors.password, true)}
                type="password"
                autoComplete="new-password"
                value={form.password}
                onChange={(e) => update({ password: e.target.value })}
              />
            </Field>

            <Field id="confirmPassword" label="Xác nhận mật khẩu" required error={clientErrors.confirmPassword}>
              <input
                {...a11yProps('confirmPassword', clientErrors.confirmPassword)}
                type="password"
                autoComplete="new-password"
                value={form.confirmPassword}
                onChange={(e) => update({ confirmPassword: e.target.value })}
              />
            </Field>
          </div>

          <div className="actions">
            <button type="submit" className="btn btn-primary" disabled={busy}>
              {busy ? 'Đang đăng ký…' : 'Đăng ký'}
            </button>
          </div>
        </form>

        <p style={{ marginTop: '1.5rem' }}>
          Đã có tài khoản? <Link href="/login">Đăng nhập</Link>
        </p>
      </div>
    </>
  )
}
