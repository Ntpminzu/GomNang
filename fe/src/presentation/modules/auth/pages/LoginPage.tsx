'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { UserRound } from 'lucide-react'
import { DEMO_USERS } from '@gomnang/domain/demo-data.ts'
import { authOptions, loginByEmail, loginWithPassword } from '@/libs/api/http/auth.ts'
import { isMockMode } from '@/libs/config/env.ts'
import { toApiError, type ApiError } from '@/libs/api/errors.ts'
import { DEMO_ACCOUNTS, beginAuthentication, saveSessionIfCurrent } from '@/libs/session/index.ts'
import { readNext, safeNext, roleHome } from '@/libs/utils/redirect.ts'
import { useSession } from '@/presentation/providers/SessionProvider.tsx'
import { ErrorAlert, Field, a11yProps, linkClass } from '@/presentation/components/index.ts'
import { Button } from '@/presentation/components/ui/button.tsx'
import { Input } from '@/presentation/components/ui/input.tsx'
import { useNextQuery } from '@/presentation/hooks/use-next-query.ts'
import { AuthCard, PasswordToggle } from '../components/AuthCard.tsx'

/** Bản chạy thử không có máy chủ (mock): đăng nhập tài khoản mẫu ngay trên trình duyệt. */
function demoLogin(email: string): ReturnType<typeof loginByEmail> {
  if (!isMockMode) return loginByEmail(email)
  const user = DEMO_USERS.find((u) => u.email === email)!
  return Promise.resolve({
    user: { id: user.id, name: user.displayName, identityVerified: user.identityVerified, role: user.role, email: user.email },
    token: '',
  })
}

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState<ApiError | null>(null)
  const nextQuery = useNextQuery()
  const { notice } = useSession()
  const [options, setOptions] = useState({ googleEnabled: false, devLoginEnabled: false })
  useEffect(() => {
    if (isMockMode) return
    let cancelled = false
    authOptions().then((value) => { if (!cancelled) setOptions(value) }, () => { /* Password login remains available. */ })
    return () => { cancelled = true }
  }, [])

  async function signIn(key: string, action: () => ReturnType<typeof loginWithPassword>) {
    setBusy(key)
    setError(null)
    const revision = beginAuthentication()
    try {
      const result = await action()
      saveSessionIfCurrent(revision, result.user, result.token)
      router.push(readNext() ? safeNext(readNext()) : roleHome(result.user.role))
    } catch (err) {
      setError(toApiError(err))
      setBusy(null)
    }
  }

  return (
    <AuthCard
      title="Đăng nhập"
      description="Theo dõi đóng góp của bạn và điều phối dự án của nhóm."
      footer={
        <>
          Chưa có tài khoản?{' '}
          <Link className={linkClass} href={`/register${nextQuery}`}>
            Đăng ký miễn phí
          </Link>
        </>
      }
    >
      <ErrorAlert error={error} />
      {notice && <p role="status" className="mb-4 text-sm text-muted-foreground">{notice}</p>}
      {options.googleEnabled && <Button asChild variant="outline" size="xl" className="mb-5 w-full"><a href={`/api/auth/google/start${nextQuery}`}>Đăng nhập bằng Google</a></Button>}
      {/* Bản chạy thử không có máy chủ nên không có đăng nhập bằng mật khẩu — chỉ còn tài khoản mẫu. */}
      {!isMockMode && (
      <>
      <form
        noValidate
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault()
          void signIn('password', () => loginWithPassword(email, password))
        }}
      >
        <Field id="email" label="Email" required>
          <Input {...a11yProps('email')} type="email" autoComplete="email" className="h-11 text-base" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="ban@example.com" />
        </Field>
        <Field id="password" label="Mật khẩu" required>
          <div className="relative">
            <Input
              {...a11yProps('password')}
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              className="h-11 pr-11 text-base"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <PasswordToggle shown={showPassword} onToggle={() => setShowPassword((v) => !v)} />
          </div>
        </Field>
        <Button type="submit" size="xl" className="w-full" disabled={busy !== null}>
          {busy === 'password' ? 'Đang đăng nhập…' : 'Đăng nhập'}
        </Button>
      </form>

      {(isMockMode || options.devLoginEnabled) && <div className="my-6 flex items-center gap-3 text-xs text-muted-foreground">
        <span className="h-px flex-1 bg-border" />
        hoặc thử nhanh
        <span className="h-px flex-1 bg-border" />
      </div>}
      </>
      )}

      {(isMockMode || options.devLoginEnabled) && <section aria-labelledby="demo-title" className="space-y-2">
        <h2 id="demo-title" className="text-sm font-semibold">
          Dùng tài khoản mẫu
        </h2>
        <p className="text-xs text-muted-foreground">Vào ngay không cần mật khẩu để thử từng vai. Máy chủ bản công khai có thể tắt tính năng này.</p>
        <ul className="grid gap-2">
          {DEMO_ACCOUNTS.map((account) => {
            const email = DEMO_USERS.find((u) => u.id === account.id)?.email
            return (
              <li key={account.id}>
                <Button
                  type="button"
                  variant="outline"
                  className="h-auto w-full justify-start gap-3 py-2.5 text-left"
                  disabled={busy !== null || !email}
                  onClick={() => email && void signIn(account.id, () => demoLogin(email))}
                >
                  <UserRound className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                  <span className="min-w-0">
                    <span className="block truncate font-medium">{busy === account.id ? 'Đang vào…' : account.name}</span>
                    <span className="block truncate text-xs font-normal text-muted-foreground">{account.hint}</span>
                  </span>
                </Button>
              </li>
            )
          })}
        </ul>
      </section>}
    </AuthCard>
  )
}
