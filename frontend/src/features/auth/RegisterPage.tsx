'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Info } from 'lucide-react'
import { PASSWORD_MIN, validateRegistration, type RegisterInput } from '@gomnang/shared/validate-auth.ts'
import type { FieldErrors } from '@gomnang/shared/validate-project.ts'
import { toApiError, type ApiError } from '@/lib/api-client.ts'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { ErrorAlert, FormField, a11yProps, linkClass } from '@/components/states.tsx'
import { register } from './auth.api.ts'
import { finishLogin, readNext, withNext } from './auth-redirect.ts'

type FormState = RegisterInput & { confirmPassword: string }

/** Tạo tài khoản bằng tên hiển thị, email, mật khẩu. Thành công là đăng nhập luôn. */
export default function RegisterPage() {
  const [form, setForm] = useState<FormState>({ displayName: '', email: '', password: '', confirmPassword: '' })
  const [errors, setErrors] = useState<FieldErrors>({})
  const [error, setError] = useState<ApiError | null>(null)
  const [busy, setBusy] = useState(false)
  /** Chỉ để giữ ?next trên link sang trang đăng nhập. */
  const [next, setNext] = useState<string | null>(null)

  useEffect(() => setNext(readNext()), [])

  const update = (patch: Partial<FormState>) => setForm((f) => ({ ...f, ...patch }))

  function showErrors(found: FieldErrors) {
    setErrors(found)
    const first = Object.keys(found)[0]
    if (first) document.getElementById(first)?.focus()
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    const input: RegisterInput = { displayName: form.displayName, email: form.email, password: form.password }
    const found = validateRegistration(input)
    // Ô nhập lại chỉ để bắt gõ nhầm, không gửi lên máy chủ.
    if (form.confirmPassword !== form.password) found.confirmPassword = 'Mật khẩu nhập lại không khớp.'
    showErrors(found)
    if (Object.keys(found).length > 0) return

    setBusy(true)
    try {
      finishLogin(await register(input), readNext())
    } catch (err) {
      const apiError = toApiError(err)
      // 409: email đã có tài khoản. 422: máy chủ kiểm lại vẫn thấy sai. Cả hai đều kèm lỗi theo từng ô.
      if ((apiError.status === 409 || apiError.status === 422) && apiError.details) showErrors(apiError.details)
      else setError(apiError)
      setBusy(false)
    }
  }

  return (
    <div className="mx-auto w-full max-w-md">
      <Card>
        <CardContent className="grid gap-6">
          <div className="space-y-1.5">
            <h1 className="font-heading text-2xl font-semibold tracking-tight">Tạo tài khoản</h1>
            <p className="text-muted-foreground">Chỉ cần tên, email và mật khẩu.</p>
          </div>

          <Alert role="note">
            <Info />
            <AlertTitle>Tài khoản mới chưa được xác minh danh tính</AlertTitle>
            <AlertDescription>
              Bạn vẫn tạo được dự án và cam kết đóng góp, nhưng chưa thể làm người phụ trách tài chính cho tới khi được
              xác minh (BR-003).
            </AlertDescription>
          </Alert>

          <ErrorAlert error={error} />

          <form onSubmit={handleSubmit} noValidate className="grid gap-5">
            <FormField id="displayName" label="Tên hiển thị" error={errors.displayName}>
              <Input
                {...a11yProps('displayName', errors.displayName)}
                type="text"
                autoComplete="name"
                value={form.displayName}
                onChange={(e) => update({ displayName: e.target.value })}
                placeholder="Nguyễn Văn A"
              />
            </FormField>

            <FormField id="email" label="Email" error={errors.email}>
              <Input
                {...a11yProps('email', errors.email)}
                type="email"
                autoComplete="email"
                value={form.email}
                onChange={(e) => update({ email: e.target.value })}
                placeholder="ten@gmail.com"
              />
            </FormField>

            <FormField id="password" label="Mật khẩu" error={errors.password} hint={`Ít nhất ${PASSWORD_MIN} ký tự.`}>
              <Input
                {...a11yProps('password', errors.password, true)}
                type="password"
                autoComplete="new-password"
                value={form.password}
                onChange={(e) => update({ password: e.target.value })}
              />
            </FormField>

            <FormField id="confirmPassword" label="Nhập lại mật khẩu" error={errors.confirmPassword}>
              <Input
                {...a11yProps('confirmPassword', errors.confirmPassword)}
                type="password"
                autoComplete="new-password"
                value={form.confirmPassword}
                onChange={(e) => update({ confirmPassword: e.target.value })}
              />
            </FormField>

            <Button type="submit" size="lg" className="w-full" disabled={busy}>
              {busy ? 'Đang tạo tài khoản…' : 'Tạo tài khoản'}
            </Button>
          </form>

          <p className="text-center text-sm text-muted-foreground">
            Đã có tài khoản?{' '}
            <Link href={withNext('/login', next)} className={linkClass}>
              Đăng nhập
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
