'use client'

import Link from 'next/link'
import { useParams } from 'next/navigation'
import { AlertCircle, CalendarDays, MapPin, Pencil, Send, UserRound, Users, type LucideIcon } from 'lucide-react'
import { canEditProject } from '@gomnang/shared/rules.ts'
import { stateLabel, type AuditEntry } from '@gomnang/shared/types.ts'
import { formatTime } from '@/lib/format.ts'
import { useAction } from '@/lib/use-action.ts'
import { useLoad } from '@/lib/use-load.ts'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import {
  ApiErrorState,
  BackLink,
  ErrorAlert,
  LoadingState,
  PageHeader,
  Panel,
  SectionHeading,
} from '@/components/states.tsx'
import { CommitPanel, ContributionsTable } from '@/features/contributions/ContributionPanels.tsx'
import { AssessmentPanel, ReviewPanel } from '@/features/verification/VerificationPanels.tsx'
import { submitProject } from '@/features/verification/verification.api.ts'
import { NeedProgress, ProgressLegend, StatusBadge } from './ProjectDisplay.tsx'
import { projectRef, type PanelProps } from './project-ref.ts'
import { getProject } from './projects.api.ts'

export default function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { user, state, reload } = useLoad(() => getProject(id), [id])

  return (
    <>
      <BackLink href="/">Về danh sách dự án</BackLink>

      {state.status === 'loading' && <LoadingState label="Đang tải thông tin dự án…" />}
      {state.status === 'error' && <ApiErrorState error={state.error} onRetry={reload} />}
      {state.status === 'ok' && <ProjectView project={state.data} user={user} onChanged={reload} />}
    </>
  )
}

function ProjectView(props: PanelProps) {
  const { project, user } = props
  const isInsider =
    !!user && (user.isVerifier || user.id === project.coordinator.id || user.id === project.treasurer?.id)
  const showAssessment =
    isInsider && project.latestAssessment && (project.status === 'draft' || project.status === 'pending_verification')
  const totalMissing = project.needs.reduce((sum, n) => sum + Math.max(0, n.targetQty - n.committedQty), 0)

  return (
    <>
      <div className="mb-2">
        <StatusBadge status={project.status} />
      </div>
      <PageHeader title={project.name} description={project.goal} />

      <DraftPanel {...props} />
      {showAssessment && <AssessmentPanel assessment={project.latestAssessment!} />}
      <ReviewPanel {...props} />

      <Card>
        <CardContent className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          <Fact icon={Users} title="Nhóm thụ hưởng">
            {project.beneficiaryGroup}
          </Fact>
          <Fact icon={MapPin} title="Địa điểm">
            {project.location}
          </Fact>
          <Fact icon={CalendarDays} title="Thời gian">
            {project.startDate}
            {project.endDate !== project.startDate && ` → ${project.endDate}`}
          </Fact>
          <Fact icon={UserRound} title="Người phụ trách">
            Điều phối: {project.coordinator.name}
            <br />
            Tài chính: {project.treasurer?.name ?? 'không có hạng mục bằng tiền'}
          </Fact>
        </CardContent>
      </Card>

      <SectionHeading>Nhu cầu {totalMissing > 0 ? `— còn thiếu ${totalMissing} đơn vị` : '— đã đủ cam kết'}</SectionHeading>
      <div className="space-y-3">
        <ProgressLegend />
        <Card>
          <CardContent className="space-y-5">
            {project.needs.map((need) => (
              <NeedProgress key={need.id} need={need} />
            ))}
          </CardContent>
        </Card>
      </div>

      <CommitPanel {...props} />

      <SectionHeading>Đóng góp đã ghi nhận</SectionHeading>
      <ContributionsTable {...props} />

      <SectionHeading description="Mọi thay đổi trạng thái đều được ghi lại và không sửa được. Đây là cách hệ thống chứng minh tính minh bạch.">
        Sổ ghi vết
      </SectionHeading>
      <AuditTable entries={project.auditLog} />
    </>
  )
}

function Fact({ icon: Icon, title, children }: { icon: LucideIcon; title: string; children: React.ReactNode }) {
  return (
    <div className="flex min-w-0 gap-3">
      <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary" aria-hidden="true">
        <Icon className="size-4" />
      </span>
      <div className="min-w-0">
        <h3 className="text-sm font-semibold">{title}</h3>
        <p className="mt-0.5 text-sm break-words text-muted-foreground">{children}</p>
      </div>
    </div>
  )
}

/** Khối cho người điều phối khi dự án còn là bản nháp: sửa, hoặc gửi đi xác minh. */
function DraftPanel({ project, user, onChanged }: PanelProps) {
  const { busy, error, run } = useAction()
  if (!user || !canEditProject(projectRef(project), user).ok) return null

  return (
    <Panel title="Bản nháp — chưa công khai" titleId="draft-panel-title">
      {project.rejectionReason && (
        // role={undefined}: Alert của shadcn tự gắn role="alert"; khối cũ không phải thông báo động nên bỏ đi.
        <Alert variant="destructive" role={undefined} className="my-3 border-destructive/40 bg-destructive/5">
          <AlertCircle />
          <AlertTitle>
            <strong>Người xác minh đã trả lại dự án:</strong>
          </AlertTitle>
          <AlertDescription>
            <p>{project.rejectionReason}</p>
          </AlertDescription>
        </Alert>
      )}
      <p className="text-sm text-muted-foreground">
        Sửa cho đủ thông tin rồi gửi đi xác minh. Dự án chỉ hiện công khai sau khi người xác minh duyệt.
      </p>
      <ErrorAlert error={error} />
      <div className="mt-4 flex flex-wrap gap-2">
        <Button asChild variant="outline">
          <Link href={`/projects/${project.id}/edit`}>
            <Pencil />
            Sửa dự án
          </Link>
        </Button>
        <Button disabled={busy} onClick={() => run(() => submitProject(project.id), onChanged)}>
          <Send />
          {busy ? 'Đang gửi…' : 'Gửi xác minh'}
        </Button>
      </div>
    </Panel>
  )
}

function AuditTable({ entries }: { entries: AuditEntry[] }) {
  return (
    <Card className="py-0">
      <Table>
        <TableCaption className="sr-only">Lịch sử thay đổi của dự án</TableCaption>
        <TableHeader className="bg-muted/50">
          <TableRow className="hover:bg-transparent">
            <TableHead scope="col" className="px-4">
              Thời điểm
            </TableHead>
            <TableHead scope="col" className="px-4">
              Người thực hiện
            </TableHead>
            <TableHead scope="col" className="px-4">
              Đối tượng
            </TableHead>
            <TableHead scope="col" className="px-4">
              Thay đổi
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {entries.map((entry) => (
            <TableRow key={entry.id}>
              <TableCell className="px-4 py-3 align-top text-muted-foreground">{formatTime(entry.at)}</TableCell>
              <TableCell className="min-w-32 px-4 py-3 align-top whitespace-normal">{entry.actor.name}</TableCell>
              <TableCell className="px-4 py-3 align-top">{entry.entityType === 'project' ? 'Dự án' : 'Đóng góp'}</TableCell>
              <TableCell className="min-w-48 px-4 py-3 align-top whitespace-normal">
                {entry.fromState ? stateLabel(entry.entityType, entry.fromState) : 'tạo mới'} →{' '}
                {stateLabel(entry.entityType, entry.toState)}
                {entry.reason && <div className="mt-0.5 text-muted-foreground">Lý do: {entry.reason}</div>}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Card>
  )
}
