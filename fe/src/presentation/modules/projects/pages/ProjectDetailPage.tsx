'use client'

import { useRef, useState } from 'react'
import { useParams } from 'next/navigation'
import { CalendarDays, MapPin, Users } from 'lucide-react'
import { getProject, withDemoMode } from '@/libs/api/index.ts'
import { formatDate } from '@/libs/utils/project.ts'
import { useLoad } from '@/presentation/hooks/use-load.ts'
import { ApiErrorState, BackLink, DemoSwitch, LoadingState } from '@/presentation/components/index.ts'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/presentation/components/ui/tabs.tsx'
import { ContributionsTable } from '@/presentation/modules/contributions/index.ts'
import { AssessmentPanel, ReviewPanel } from '@/presentation/modules/verification/index.ts'
import type { PanelProps } from '@/presentation/types/project-panels.ts'
import { AuditTable } from '../components/AuditTable.tsx'
import { DraftPanel } from '../components/DraftPanel.tsx'
import { LifecycleStepper } from '../components/LifecycleStepper.tsx'
import { NeedsList } from '../components/NeedsList.tsx'
import { ProjectSidebar } from '../components/ProjectSidebar.tsx'
import { StatusBadge } from '../components/status.tsx'

export default function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { mode, user, state, reload } = useLoad((m) => getProject(id, m), [id])

  return (
    <>
      <BackLink href={withDemoMode('/', mode)}>Về danh sách dự án</BackLink>
      <DemoSwitch mode={mode} basePath={`/projects/${id}`} />
      {state.status === 'loading' && <LoadingState label="Đang tải thông tin dự án…" />}
      {state.status === 'error' && <ApiErrorState error={state.error} onRetry={reload} />}
      {state.status === 'ok' && <ProjectView project={state.data} user={user} mode={mode} onChanged={reload} />}
    </>
  )
}

type Tab = 'needs' | 'contributions' | 'history'

function ProjectView(props: PanelProps) {
  const { project, user, mode } = props
  const [tab, setTab] = useState<Tab>('needs')
  const tabsRef = useRef<HTMLDivElement>(null)
  const isInsider = !!user && (user.isVerifier || user.id === project.coordinator.id || user.id === project.treasurer?.id)
  const showAssessment =
    isInsider && project.latestAssessment && (project.status === 'draft' || project.status === 'pending_verification')

  const join = () => {
    setTab('needs')
    tabsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_320px]">
      <div className="min-w-0 space-y-6">
        <header className="space-y-4">
          <StatusBadge status={project.status} />
          <h1 className="text-2xl leading-tight font-semibold tracking-tight text-balance sm:text-3xl">{project.name}</h1>
          <p className="text-lg text-pretty text-muted-foreground">{project.goal}</p>
          <ul className="flex flex-wrap gap-x-5 gap-y-2 text-sm text-muted-foreground">
            <li className="flex items-center gap-1.5">
              <Users className="size-4" aria-hidden="true" />
              {project.beneficiaryGroup}
            </li>
            <li className="flex items-center gap-1.5">
              <MapPin className="size-4" aria-hidden="true" />
              {project.location}
            </li>
            <li className="flex items-center gap-1.5">
              <CalendarDays className="size-4" aria-hidden="true" />
              {formatDate(project.startDate)}
              {project.endDate !== project.startDate && ` → ${formatDate(project.endDate)}`}
            </li>
          </ul>
          <div className="rounded-xl border bg-card p-4">
            <LifecycleStepper status={project.status} auditLog={project.auditLog} />
          </div>
        </header>

        <DraftPanel {...props} />
        {showAssessment && <AssessmentPanel assessment={project.latestAssessment!} mode={mode} />}
        <ReviewPanel {...props} />

        <div ref={tabsRef} className="scroll-mt-24">
          <Tabs value={tab} onValueChange={(v) => setTab(v as Tab)}>
            <TabsList className="mb-4">
              <TabsTrigger value="needs">Nhu cầu ({project.needs.length})</TabsTrigger>
              <TabsTrigger value="contributions">Đóng góp ({project.contributions.length})</TabsTrigger>
              <TabsTrigger value="history">Sổ ghi vết</TabsTrigger>
            </TabsList>
            <TabsContent value="needs">
              <NeedsList {...props} />
            </TabsContent>
            <TabsContent value="contributions">
              <ContributionsTable {...props} />
            </TabsContent>
            <TabsContent value="history" className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Mọi thay đổi trạng thái đều được ghi lại và không sửa được. Đây là cách hệ thống chứng minh tính minh bạch.
              </p>
              <AuditTable entries={project.auditLog} />
            </TabsContent>
          </Tabs>
        </div>
      </div>

      <ProjectSidebar project={project} onJoin={join} />
    </div>
  )
}
