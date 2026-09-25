'use client'
import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { loginWithPassword } from '@/libs/api/http/auth.ts'
import { toApiError } from '@/libs/api/errors.ts'
import { saveSession } from '@/libs/session/index.ts'
import { ErrorAlert, Field, a11yProps } from '@/presentation/components/index.ts'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<import('@/libs/api/errors.ts').ApiError | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    try {
      const result = await loginWithPassword(email, password)
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
        <h1>Đăng nhập</h1>
      </div>

      <div className="auth-form-wrap">
        <ErrorAlert error={error} />

        <form onSubmit={handleSubmit} noValidate>
          <div className="card">
            <Field id="email" label="Email" required>
              <input
                {...a11yProps('email')}
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
              />
            </Field>

            <Field id="password" label="Mật khẩu" required>
              <input
                {...a11yProps('password')}
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </Field>
          </div>

          <div className="actions">
            <button type="submit" className="btn btn-primary" disabled={busy}>
              {busy ? 'Đang đăng nhập…' : 'Đăng nhập'}
            </button>
          </div>
        </form>

        <p style={{ marginTop: '1.5rem' }}>
          Chưa có tài khoản? <Link href="/register">Đăng ký</Link>
        </p>
      </div>
    </>
  )
}
