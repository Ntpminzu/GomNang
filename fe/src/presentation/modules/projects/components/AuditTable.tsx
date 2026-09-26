import { FileClock, FolderKanban, HandHeart } from 'lucide-react'
import { stateLabel, type AuditEntry } from '@gomnang/domain/types.ts'
import { formatTime } from '@/libs/utils/date.ts'

/** Sổ ghi vết dạng dòng thời gian, mới nhất ở trên. Dữ liệu chỉ ghi thêm — database chặn sửa và xoá. */
export function AuditTable({ entries }: { entries: AuditEntry[] }) {
  if (entries.length === 0) return <p className="text-sm text-muted-foreground">Chưa có thay đổi nào.</p>
  return (
    <ol aria-label="Lịch sử thay đổi của dự án" className="relative space-y-4 border-l pl-6">
      {[...entries].reverse().map((entry) => {
        const Icon = entry.entityType === 'project' ? FolderKanban : HandHeart
        return (
          <li key={entry.id} className="relative">
            <span aria-hidden="true" className="absolute top-0.5 -left-[35px] grid size-6 place-items-center rounded-full border bg-card text-primary">
              <Icon className="size-3.5" />
            </span>
            <p className="text-sm">
              <span className="font-medium">{entry.actor.name}</span>
              <span className="text-muted-foreground"> · {entry.entityType === 'project' ? 'dự án' : 'đóng góp'}: </span>
              {entry.fromState ? stateLabel(entry.entityType, entry.fromState) : 'tạo mới'} → <strong>{stateLabel(entry.entityType, entry.toState)}</strong>
            </p>
            {entry.reason && (
              <p className="mt-0.5 text-sm text-muted-foreground">
                {entry.entityType === 'project' ? 'Lý do' : 'Ghi chú'}: {entry.reason}
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
