'use client'

import { useRouter } from 'next/navigation'
import { createProject, withDemoMode } from '@/libs/api/index.ts'
import { PageHeader } from '@/presentation/components/index.ts'
import { ProjectForm } from '../index.ts'

export default function NewProjectPage() {
  const router = useRouter()

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        eyebrow="Khởi xướng điều tốt"
        title="Tạo dự án thiện nguyện"
        description="Khai báo nhu cầu theo từng hạng mục có số lượng cụ thể, để người muốn giúp biết chính xác còn thiếu bao nhiêu. Dự án lưu thành bản nháp, gửi xác minh khi sẵn sàng."
      />
      <ProjectForm
        demoBasePath="/projects/new"
        submitLabel="Tạo bản nháp dự án"
        submittingLabel="Đang tạo…"
        onSubmit={async (input, mode) => {
          const project = await createProject(input, mode)
          router.push(withDemoMode(`/projects/${project.id}`, mode))
        }}
      />
    </div>
  )
}
