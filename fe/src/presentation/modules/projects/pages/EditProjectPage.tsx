'use client'

import { useParams, useRouter } from 'next/navigation'
import { canEditProject } from '@gomnang/domain/rules.ts'
import { getProject, updateProject, withDemoMode } from '@/libs/api/index.ts'
import { projectRef } from '@/libs/utils/project.ts'
import { ApiErrorState, BackLink, EmptyState, LoadingState, PageHeader } from '@/presentation/components/index.ts'
import { useLoad } from '@/presentation/hooks/use-load.ts'
import { ProjectForm, detailToInput } from '../index.ts'

export default function EditProjectPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const { mode, user, state, reload } = useLoad((m) => getProject(id, m), [id])

  const check = state.status === 'ok' && user ? canEditProject(projectRef(state.data), user) : null

  return (
    <div className="mx-auto max-w-3xl">
      <BackLink href={withDemoMode(`/projects/${id}`, mode)}>Về trang dự án</BackLink>
      <PageHeader title="Sửa dự án" description="Chỉ sửa được khi dự án còn là bản nháp." />

      {state.status === 'loading' && <LoadingState label="Đang tải dự án…" />}
      {state.status === 'error' && <ApiErrorState error={state.error} onRetry={reload} />}

      {state.status === 'ok' && !check?.ok && (
        <EmptyState title="Không sửa được dự án này">
          <p>{check && !check.ok ? check.message : 'Đăng nhập bằng tài khoản người điều phối của dự án để sửa.'}</p>
        </EmptyState>
      )}

      {state.status === 'ok' && check?.ok && (
        <ProjectForm
          initial={detailToInput(state.data)}
          demoBasePath={`/projects/${id}/edit`}
          submitLabel="Lưu thay đổi"
          submittingLabel="Đang lưu…"
          onSubmit={async (input, m) => {
            await updateProject(id, input, m)
            router.push(withDemoMode(`/projects/${id}`, m))
          }}
        />
      )}
    </div>
  )
}
