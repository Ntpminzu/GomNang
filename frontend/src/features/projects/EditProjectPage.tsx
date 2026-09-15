'use client'

import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { canEditProject } from '@gomnang/shared/rules.ts'
import { useLoad } from '@/lib/use-load.ts'
import { ApiErrorState, BackLink, EmptyState, LoadingState, PageHeader } from '@/components/states.tsx'
import { Button } from '@/components/ui/button'
import { withNext } from '@/features/auth/auth-redirect.ts'
import { ProjectForm, detailToInput } from './ProjectForm.tsx'
import { projectRef } from './project-ref.ts'
import { getProject, updateProject } from './projects.api.ts'

export default function EditProjectPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const { user, state, reload } = useLoad(() => getProject(id), [id])

  const check = state.status === 'ok' && user ? canEditProject(projectRef(state.data), user) : null

  return (
    <>
      <BackLink href={`/projects/${id}`}>Về trang dự án</BackLink>
      <PageHeader title="Sửa dự án" description="Chỉ sửa được khi dự án còn là bản nháp." />

      {state.status === 'loading' && <LoadingState label="Đang tải dự án…" />}
      {state.status === 'error' && <ApiErrorState error={state.error} onRetry={reload} />}

      {state.status === 'ok' && !check?.ok && (
        <EmptyState title="Không sửa được dự án này">
          {check && !check.ok ? (
            <p>{check.message}</p>
          ) : (
            <>
              <p>Đăng nhập bằng tài khoản người điều phối của dự án để sửa.</p>
              <Button asChild>
                <Link href={withNext('/login', `/projects/${id}/edit`)}>Đăng nhập</Link>
              </Button>
            </>
          )}
        </EmptyState>
      )}

      {state.status === 'ok' && check?.ok && (
        <ProjectForm
          initial={detailToInput(state.data)}
          submitLabel="Lưu thay đổi"
          submittingLabel="Đang lưu…"
          onSubmit={async (input) => {
            await updateProject(id, input)
            router.push(`/projects/${id}`)
          }}
        />
      )}
    </>
  )
}
