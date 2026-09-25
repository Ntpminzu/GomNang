'use client'

import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { canEditProject } from '@gomnang/domain/rules.ts'
import { getProject, updateProject, withDemoMode } from '@/libs/api/index.ts'
import { useLoad } from '@/presentation/hooks/use-load.ts'
import { ProjectForm, detailToInput } from '../index.ts'
import { projectRef } from '@/libs/utils/project.ts'
import { ApiErrorState, EmptyState, LoadingState } from '@/presentation/components/index.ts'

export default function EditProjectPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const { mode, user, state, reload } = useLoad((m) => getProject(id, m), [id])

  const check = state.status === 'ok' && user ? canEditProject(projectRef(state.data), user) : null

  return (
    <>
      <p style={{ marginBottom: '.75rem' }}>
        <Link href={withDemoMode(`/projects/${id}`, mode)}>← Về trang dự án</Link>
      </p>
      <div className="page-head">
        <h1>Sửa dự án</h1>
        <p className="lead">Chỉ sửa được khi dự án còn là bản nháp.</p>
      </div>

      {state.status === 'loading' && <LoadingState label="Đang tải dự án…" />}
      {state.status === 'error' && <ApiErrorState error={state.error} onRetry={reload} />}

      {state.status === 'ok' && !check?.ok && (
        <EmptyState title="Không sửa được dự án này">
          <p>{check && !check.ok ? check.message : 'Chọn tài khoản người điều phối của dự án ở góc trên bên phải.'}</p>
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
    </>
  )
}
