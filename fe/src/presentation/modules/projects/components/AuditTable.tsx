import { FileClock, FolderKanban, HandHeart, ReceiptText, type LucideIcon } from 'lucide-react'
import { stateLabel, type AuditEntityType, type AuditEntry } from '@gomnang/domain/types.ts'
import { formatTime } from '@/libs/utils/date.ts'

const ENTITY: Record<AuditEntityType, { Icon: LucideIcon; label: string }> = {
  project: { Icon: FolderKanban, label: 'dự án' },
  contribution: { Icon: HandHeart, label: 'đóng góp' },
  expense: { Icon: ReceiptText, label: 'khoản chi' },
}

/** Sổ ghi vết dạng dòng thời gian, mới nhất ở trên. Dữ liệu chỉ ghi thêm — database chặn sửa và xoá. */
export function AuditTable({ entries }: { entries: AuditEntry[] }) {
  if (entries.length === 0) return <p className="text-sm text-muted-foreground">Chưa có thay đổi nào.</p>
  return (
    <ol aria-label="Lịch sử thay đổi của dự án" className="relative space-y-4 border-l pl-6">
      {[...entries].reverse().map((entry) => {
        const { Icon, label } = ENTITY[entry.entityType]
        return (
          <li key={entry.id} className="relative">
            <span aria-hidden="true" className="absolute top-0.5 -left-[35px] grid size-6 place-items-center rounded-full border bg-card text-primary">
              <Icon className="size-3.5" />
            </span>
            <p className="text-sm">
              <span className="font-medium">{entry.actor.name}</span>
              <span className="text-muted-foreground"> · {label}: </span>
              {entry.fromState ? stateLabel(entry.entityType, entry.fromState) : 'tạo mới'} → <strong>{stateLabel(entry.entityType, entry.toState)}</strong>
            </p>
            {entry.reason && (
              <p className="mt-0.5 text-sm text-muted-foreground">
                {entry.entityType === 'contribution' ? 'Ghi chú' : 'Lý do'}: {entry.reason}
              </p>
            )}
            <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
              <FileClock className="size-3" aria-hidden="true" />
              {formatTime(entry.at)}
            </p>
          </li>
        )
      })}
    </ol>
  )
}
