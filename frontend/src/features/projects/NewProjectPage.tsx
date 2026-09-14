'use client'

import { useRouter } from 'next/navigation'
import { ProjectForm } from './ProjectForm.tsx'
import { createProject } from './projects.api.ts'

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
        submitLabel="Tạo bản nháp dự án"
        submittingLabel="Đang tạo…"
        onSubmit={async (input) => {
          const project = await createProject(input)
          router.push(`/projects/${project.id}`)
        }}
      />
    </>
  )
}
