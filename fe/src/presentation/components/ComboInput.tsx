'use client'

import { ChevronDown } from 'lucide-react'
import { cn } from '@/libs/utils/cn.ts'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from './ui/dropdown-menu.tsx'
import { Input } from './ui/input.tsx'

/**
 * Ô nhập tự do kèm danh sách gợi ý. Thay <datalist> vì trình duyệt vẽ datalist bằng hộp thoại hệ điều hành
 * (nền đen trên Chrome Windows), không theo màu và font của app.
 */
export function ComboInput({
  suggestions,
  value,
  onValueChange,
  menuLabel,
  className,
  ...props
}: Omit<React.ComponentProps<typeof Input>, 'value' | 'onChange'> & {
  suggestions: readonly string[]
  value: string
  onValueChange: (value: string) => void
  /** Tên đọc cho nút mở danh sách, ví dụ "Chọn đơn vị gợi ý". */
  menuLabel: string
}) {
  return (
    <div className="relative">
      <Input {...props} value={value} onChange={(e) => onValueChange(e.target.value)} className={cn('pr-10', className)} />
      <DropdownMenu>
        <DropdownMenuTrigger
          aria-label={menuLabel}
          className="absolute inset-y-1 right-1 grid w-8 cursor-pointer place-items-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
        >
          <ChevronDown className="size-4" aria-hidden="true" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          {suggestions.map((s) => (
            <DropdownMenuItem key={s} onSelect={() => onValueChange(s)} className={cn('min-h-9 cursor-pointer', s === value && 'font-medium text-primary')}>
              {s}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}
