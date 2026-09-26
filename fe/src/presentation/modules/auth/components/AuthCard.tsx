import { Eye, EyeOff, Sun } from 'lucide-react'

/** Khung chung của trang đăng nhập / đăng ký: một thẻ giữa màn hình, một việc duy nhất. */
export function AuthCard({ title, description, children, footer }: { title: string; description: string; children: React.ReactNode; footer: React.ReactNode }) {
  return (
    <div className="mx-auto w-full max-w-md py-4 sm:py-8">
      <div className="rounded-3xl border bg-card p-6 shadow-sm sm:p-8">
        <div className="mb-6 space-y-3 text-center">
          <span aria-hidden="true" className="mx-auto grid size-12 place-items-center rounded-2xl bg-sun/90 text-foreground">
            <Sun className="size-6" />
          </span>
          <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
        {children}
      </div>
      <p className="mt-5 text-center text-sm text-muted-foreground">{footer}</p>
    </div>
  )
}

/** Ô mật khẩu có nút hiện/ẩn. Nhãn cố định, trạng thái nằm ở aria-pressed — trình đọc màn hình đọc đúng. */
export function PasswordToggle({ shown, onToggle }: { shown: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={shown}
      aria-label="Hiện mật khẩu"
      className="absolute top-1/2 right-1.5 grid size-8 -translate-y-1/2 place-items-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
    >
      {shown ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
    </button>
  )
}
