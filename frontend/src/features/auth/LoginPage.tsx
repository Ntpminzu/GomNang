'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Eye, EyeOff } from 'lucide-react'
import { validateLogin, type LoginInput } from '@gomnang/shared/validate-auth.ts'
import type { FieldErrors } from '@gomnang/shared/validate-project.ts'
import { toApiError, type ApiError } from '@/lib/api-client.ts'
import { getSessionUser, type SessionUser } from '@/lib/session.ts'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Separator } from '@/components/ui/separator'
import { ErrorAlert, FormField, a11yProps, linkClass } from '@/components/states.tsx'
import { devLogin, login } from './auth.api.ts'
import { finishLogin, readNext, withNext } from './auth-redirect.ts'
import { DEMO_ACCOUNTS } from './demo-accounts.ts'

type DemoAccount = (typeof DEMO_ACCOUNTS)[number]

/**
 * Đăng nhập bằng email + mật khẩu, kèm khu đăng nhập nhanh bằng tài khoản mẫu.
 * ?next đọc thẳng từ window.location, không dùng useSearchParams — hook đó bắt cả trang phải bọc Suspense.
 */
export default function LoginPage() {
  const [form, setForm] = useState<LoginInput>({ email: '', password: '' })
  const [showPassword, setShowPassword] = useState(false)
  const [errors, setErrors] = useState<FieldErrors>({})
  const [error, setError] = useState<ApiError | null>(null)
  const [demoError, setDemoError] = useState<string | null>(null)
  /** 'form' hoặc id tài khoản mẫu đang đăng nhập. Thành công thì trang tải lại, nên chỉ trả về null khi lỗi. */
  const [busy, setBusy] = useState<string | null>(null)
  const [current, setCurrent] = useState<SessionUser | null>(null)
  /** Chỉ để giữ ?next trên link sang trang đăng ký. */
  const [next, setNext] = useState<string | null>(null)

  useEffect(() => {
    setCurrent(getSessionUser())
    setNext(readNext())
  }, [])

  function showErrors(found: FieldErrors) {
    setErrors(found)
    const first = Object.keys(found)[0]
    if (first) document.getElementById(first)?.focus()
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    const found = validateLogin(form)
    showErrors(found)
    if (Object.keys(found).length > 0) return

    setBusy('form')
    try {
      finishLogin(await login(form), readNext())
    } catch (err) {
      const apiError = toApiError(err)
      if (apiError.status === 422 && apiError.details) showErrors(apiError.details)
      else setError(apiError)
      setBusy(null)
    }
  }

  async function quickLogin(account: DemoAccount) {
    setDemoError(null)
    setBusy(account.id)
    try {
      finishLogin(await devLogin(account.email), readNext())
    } catch (err) {
      const apiError = toApiError(err)
      // Máy chủ tắt dev-login thì trả 404 như endpoint không tồn tại. USER_NOT_FOUND là chuyện khác: database thiếu dữ liệu mẫu.
      setDemoError(
        apiError.status === 404 && apiError.code !== 'USER_NOT_FOUND'
          ? 'Đăng nhập nhanh đang tắt trên máy chủ này.'
          : apiError.message,
      )
      setBusy(null)
    }
  }

  return (
    <div className="mx-auto w-full max-w-md">
      <Card>
        <CardContent className="grid gap-6">
          <div className="space-y-1.5">
            <h1 className="font-heading text-2xl font-semibold tracking-tight">Đăng nhập</h1>
            <p className="text-muted-foreground">Dùng email và mật khẩu bạn đã đăng ký.</p>
          </div>

          {current && (
            <p className="rounded-lg bg-muted px-3 py-2 text-sm text-muted-foreground">
              Bạn đang đăng nhập với tên <strong className="font-medium text-foreground">{current.name}</strong>. Đăng
              nhập tài khoản khác sẽ thay phiên này.
            </p>
          )}

          <ErrorAlert error={error} />

          <form onSubmit={handleSubmit} noValidate className="grid gap-5">
            <FormField id="email" label="Email" error={errors.email}>
              <Input
                {...a11yProps('email', errors.email)}
                type="email"
                autoComplete="email"
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                placeholder="ten@gmail.com"
              />
            </FormField>

            <FormField id="password" label="Mật khẩu" error={errors.password}>
              <div className="relative">
                <Input
                  {...a11yProps('password', errors.password)}
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  className="pr-9"
                  value={form.password}
                  onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  className="absolute top-0.5 right-0.5 text-muted-foreground"
                  aria-label="Hiện mật khẩu"
                  aria-pressed={showPassword}
                  onClick={() => setShowPassword((shown) => !shown)}
                >
                  {showPassword ? <EyeOff aria-hidden="true" /> : <Eye aria-hidden="true" />}
                </Button>
              </div>
            </FormField>

            <Button type="submit" size="lg" className="w-full" disabled={busy !== null}>
              {busy === 'form' ? 'Đang đăng nhập…' : 'Đăng nhập'}
            </Button>
          </form>

          <p className="text-center text-sm text-muted-foreground">
            Chưa có tài khoản?{' '}
            <Link href={withNext('/register', next)} className={linkClass}>
              Tạo tài khoản
            </Link>
          </p>

          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <Separator className="flex-1" />
            hoặc
            <Separator className="flex-1" />
          </div>

          <section aria-labelledby="demo-accounts-title" className="grid gap-3">
            <div className="space-y-1">
              <h2 id="demo-accounts-title" className="font-heading text-base font-semibold">
                Dùng tài khoản mẫu
              </h2>
              <p className="text-sm text-muted-foreground">Vào ngay, không cần mật khẩu, để thử từng vai trò.</p>
            </div>

            {demoError && (
              <p className="text-sm text-destructive" role="alert">
                {demoError}
              </p>
            )}

            <ul className="grid gap-2">
              {DEMO_ACCOUNTS.map((account) => (
                <li key={account.id}>
                  <Button
                    type="button"
                    variant="outline"
                    className="h-auto w-full flex-col items-start gap-0.5 py-2 text-left whitespace-normal"
                    disabled={busy !== null}
                    onClick={() => quickLogin(account)}
                  >
                    <span>{account.name}</span>
                    <span className="text-xs font-normal text-muted-foreground">
                      {busy === account.id ? 'Đang đăng nhập…' : account.hint}
                    </span>
                  </Button>
                </li>
              ))}
            </ul>
          </section>
        </CardContent>
      </Card>
    </div>
  )
}
