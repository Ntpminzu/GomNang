'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Plus, Search } from 'lucide-react'
import { useLoad } from '@/lib/use-load.ts'
import { ApiErrorState, EmptyState, LoadingState, PageHeader } from '@/components/states.tsx'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { NeedProgress, ProgressLegend, StatusBadge } from './ProjectDisplay.tsx'
import { listProjects } from './projects.api.ts'

export default function ProjectListPage() {
  const { state, reload } = useLoad(listProjects)
  const [query, setQuery] = useState('')

  const needle = query.trim().toLowerCase()
  const projects = state.status === 'ok' ? state.data : []
  const visible = projects.filter((p) =>
    [p.name, p.location, p.beneficiaryGroup].some((field) => field.toLowerCase().includes(needle)),
  )

  return (
    <>
      <PageHeader
        title="Dự án đang kêu gọi"
        description="Chọn một dự án để xem còn thiếu gì và cam kết phần bạn lo được."
      />

      <div className="mb-6 flex flex-wrap items-center gap-3">
        <div className="relative min-w-48 flex-1">
          <label htmlFor="search" className="sr-only">
            Tìm theo tên dự án, địa điểm hoặc nhóm thụ hưởng
          </label>
          <Search
            className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <Input
            id="search"
            type="search"
            className="h-9 bg-card pl-9"
            placeholder="Tìm theo tên, địa điểm, nhóm thụ hưởng…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            disabled={state.status !== 'ok'}
          />
        </div>
        <Button asChild size="lg">
          <Link href="/projects/new">
            <Plus />
            Tạo dự án
          </Link>
        </Button>
      </div>

      {state.status === 'loading' && <LoadingState label="Đang tải danh sách dự án…" />}

      {state.status === 'error' && <ApiErrorState error={state.error} onRetry={reload} />}

      {state.status === 'ok' && projects.length === 0 && (
        <EmptyState title="Chưa có dự án nào">
          <p>Khu vực của bạn chưa có hoạt động nào đang kêu gọi. Bạn có thể là người khởi xướng đầu tiên.</p>
          <Button asChild className="mt-2">
            <Link href="/projects/new">
              <Plus />
              Tạo dự án đầu tiên
            </Link>
          </Button>
        </EmptyState>
      )}

      {state.status === 'ok' && projects.length > 0 && visible.length === 0 && (
        <EmptyState title={`Không có dự án nào khớp với “${query.trim()}”`}>
          <p>Thử từ khoá ngắn hơn, hoặc tìm theo tên phường.</p>
          <Button variant="outline" className="mt-2" onClick={() => setQuery('')}>
            Xoá bộ lọc
          </Button>
        </EmptyState>
      )}

      {state.status === 'ok' && visible.length > 0 && (
        <>
          <p className="sr-only" role="status">{`Tìm thấy ${visible.length} dự án.`}</p>
          <ProgressLegend />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {visible.map((p) => (
              <Link
                key={p.id}
                href={`/projects/${p.id}`}
                className="group rounded-xl outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
              >
                <Card className="h-full transition-all hover:shadow-md hover:ring-primary/40">
                  <CardContent className="flex flex-col gap-3">
                    <StatusBadge status={p.status} />
                    <div className="space-y-1">
                      <h2 className="font-heading text-base leading-snug font-semibold text-pretty transition-colors group-hover:text-primary">
                        {p.name}
                      </h2>
                      <p className="text-sm text-muted-foreground">
                        {p.beneficiaryGroup} · {p.location}
                      </p>
                    </div>
                    {p.needs.slice(0, 2).map((need) => (
                      <NeedProgress key={need.id} need={need} />
                    ))}
                    {p.needs.length > 2 && (
                      <p className="text-xs text-muted-foreground">và {p.needs.length - 2} hạng mục khác</p>
                    )}
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </>
      )}
    </>
  )
}
