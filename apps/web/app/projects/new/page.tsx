'use client'

import { useRouter } from 'next/navigation'
import { createProject, withDemoMode } from '@/lib/api.ts'
import { ProjectForm } from '@/components/ProjectForm.tsx'

export default function NewProjectPage() {
  const router = useRouter()

  return (
    <>
      <div className="page-head">
        <h1>Tạo dự án thiện nguyện</h1>
        <p className="lead">
          Khai báo nhu cầu theo từng hạng mục có số lượng cụ thể, để người muốn giúp biết chính xác còn thiếu bao nhiêu.
        </p>
      </div>

      <ProjectForm
        demoBasePath="/projects/new"
        submitLabel="Tạo bản nháp dự án"
        submittingLabel="Đang tạo…"
        onSubmit={async (input, mode) => {
          const project = await createProject(input, mode)
          router.push(withDemoMode(`/projects/${project.id}`, mode))
        }}
      />
    </>
  )
}
