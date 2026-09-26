'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { ArrowRight, ClipboardList, Plus, Search, ShieldCheck, Sparkles, X } from 'lucide-react'
import { NEED_KIND_LABEL, NEED_KINDS, STATUS_LABEL, type NeedKind, type ProjectStatus } from '@gomnang/domain/types.ts'
import { listProjects, withDemoMode } from '@/libs/api/index.ts'
import { daysUntil, needCoverage } from '@/libs/utils/project.ts'
import { useLoad } from '@/presentation/hooks/use-load.ts'
import { ApiErrorState, DemoSwitch, EmptyState, LoadingState, SectionHeading } from '@/presentation/components/index.ts'
import { Button } from '@/presentation/components/ui/button.tsx'
import { Input } from '@/presentation/components/ui/input.tsx'
import { NativeSelect, NativeSelectOption } from '@/presentation/components/ui/native-select.tsx'
import { cn } from '@/libs/utils/cn.ts'
import { ProjectCard } from '../components/ProjectCard.tsx'

type Sort = 'soon' | 'needed' | 'newest'
const SORT_LABEL: Record<Sort, string> = { soon: 'Sắp diễn ra', needed: 'Còn thiếu nhiều nhất', newest: 'Mới đăng' }
const PUBLIC_STATUSES: ProjectStatus[] = ['published', 'in_progress', 'completed']

const STEPS = [
  { Icon: ClipboardList, title: 'Nhu cầu có số lượng', text: 'Mỗi dự án ghi rõ cần bao nhiêu phần cơm, bao nhiêu người, bao nhiêu tiền — ai muốn giúp cũng biết đúng chỗ còn thiếu.' },
  { Icon: ShieldCheck, title: 'Xác minh trước khi kêu gọi', text: 'Người xác minh độc lập đọc hồ sơ, người gác cổng tự động soát thông tin thiếu và dự án trùng.' },
  { Icon: Sparkles, title: 'Theo dõi tới từng bàn giao', text: 'Cam kết → bàn giao → người nhận xác nhận. Mọi thay đổi ghi vào sổ ghi vết không sửa được.' },
]

/** Bộ lọc nằm trên URL (?q=&kind=&status=&sort=) để quay lại trang vẫn giữ nguyên, và gửi link được cho người khác. */
function readFilters() {
  const q = new URLSearchParams(window.location.search)
  const kind = q.get('kind')
  const status = q.get('status')
  const sort = q.get('sort')
  return {
    query: q.get('q') ?? '',
    kind: (NEED_KINDS as readonly string[]).includes(kind ?? '') ? (kind as NeedKind) : null,
    status: PUBLIC_STATUSES.includes(status as ProjectStatus) ? (status as ProjectStatus) : null,
    sort: (sort && sort in SORT_LABEL ? sort : 'soon') as Sort,
  }
}

export default function ProjectListPage() {
  const { mode, state, reload } = useLoad(listProjects)
  const [query, setQuery] = useState('')
  const [kind, setKind] = useState<NeedKind | null>(null)
  const [status, setStatus] = useState<ProjectStatus | null>(null)
  const [sort, setSort] = useState<Sort>('soon')

  useEffect(() => {
    const f = readFilters()
    setQuery(f.query)
    setKind(f.kind)
    setStatus(f.status)
    setSort(f.sort)
  }, [])

  useEffect(() => {
    const q = new URLSearchParams(window.location.search)
    const put = (key: string, value: string | null, fallback?: string) =>
      value && value !== fallback ? q.set(key, value) : q.delete(key)
    put('q', query.trim() || null)
    put('kind', kind)
    put('status', status)
    put('sort', sort, 'soon')
    const search = q.toString()
    window.history.replaceState(null, '', `${window.location.pathname}${search ? `?${search}` : ''}${window.location.hash}`)
  }, [query, kind, status, sort])

  const projects = state.status === 'ok' ? state.data : []

  const impact = useMemo(() => {
    const open = projects.filter((p) => p.status === 'published' || p.status === 'in_progress')
    const needs = projects.flatMap((p) => p.needs)
    return {
      open: open.length,
      coverage: needCoverage(open.flatMap((p) => p.needs)).committedPct,
      confirmedUnits: needs.reduce((sum, n) => sum + n.confirmedQty, 0),
      missingNeeds: needs.filter((n) => n.committedQty < n.targetQty).length,
    }
  }, [projects])

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase()
    const list = projects.filter(
      (p) =>
        (!needle || [p.name, p.location, p.beneficiaryGroup].some((field) => field.toLowerCase().includes(needle))) &&
        (!kind || p.needs.some((n) => n.kind === kind)) &&
        (!status || p.status === status),
    )
    const byPriority = (p: (typeof list)[number]) => (p.status === 'completed' ? 1 : 0)
    return [...list].sort((a, b) => {
      if (byPriority(a) !== byPriority(b)) return byPriority(a) - byPriority(b)
      if (sort === 'needed') return needCoverage(a.needs).committedPct - needCoverage(b.needs).committedPct
      if (sort === 'newest') return b.startDate.localeCompare(a.startDate)
      return Math.abs(daysUntil(a.startDate)) - Math.abs(daysUntil(b.startDate))
    })
  }, [projects, query, kind, status, sort])

  const filtered = Boolean(query.trim() || kind || status)
  const clearFilters = () => {
    setQuery('')
    setKind(null)
    setStatus(null)
  }

  return (
    <>
      <section aria-labelledby="hero-title" className="grid items-center gap-8 pb-12 lg:grid-cols-[1.15fr_1fr]">
        <div className="space-y-5">
          <p className="text-sm font-semibold tracking-wide text-primary uppercase">Nền tảng thiện nguyện cộng đồng</p>
          <h1 id="hero-title" className="text-4xl leading-tight font-semibold tracking-tight text-balance sm:text-5xl">
            Gom những điều nhỏ,{' '}
            <span className="font-display text-primary italic">thành một ngày nắng.</span>
          </h1>
          <p className="max-w-xl text-lg text-pretty text-muted-foreground">
            Một bữa cơm, một buổi sáng rảnh, vài trăm nghìn đồng. GOM NẮNG biến từng đóng góp nhỏ thành dự án có nhu cầu rõ ràng,
            được xác minh, và minh bạch tới từng bàn giao.
          </p>
          <div className="flex flex-wrap gap-3">
            <Button asChild variant="cta" size="xl">
              <a href="#projects">
                Góp sức cho một dự án
                <ArrowRight data-icon="inline-end" aria-hidden="true" />
              </a>
            </Button>
            <Button asChild variant="outline" size="xl">
              <Link href={withDemoMode('/projects/new', mode)}>
                <Plus data-icon="inline-start" aria-hidden="true" />
                Khởi xướng dự án
              </Link>
            </Button>
          </div>
        </div>

        <div className="rounded-3xl border bg-card p-6 shadow-sm" aria-labelledby="impact-title">
          <h2 id="impact-title" className="mb-4 text-sm font-semibold text-muted-foreground">
            Số liệu trực tiếp từ các dự án công khai
          </h2>
          {state.status === 'ok' ? (
            <dl className="grid grid-cols-2 gap-4">
              {[
                ['Dự án đang cần giúp', impact.open],
                ['Nhu cầu đã có người nhận', `${impact.coverage}%`],
                ['Đơn vị đã được xác nhận nhận', impact.confirmedUnits.toLocaleString('vi-VN')],
                ['Hạng mục còn thiếu', impact.missingNeeds],
              ].map(([label, value]) => (
                <div key={label} className="rounded-2xl bg-muted/60 p-4">
                  <dt className="text-xs text-muted-foreground">{label}</dt>
                  <dd className="mt-1 text-2xl font-semibold tabular-nums">{value}</dd>
                </div>
              ))}
            </dl>
          ) : (
            <p className="text-sm text-muted-foreground" role="status">
              {state.status === 'error' ? 'Chưa tải được số liệu.' : 'Đang tính số liệu…'}
            </p>
          )}
          <p className="mt-4 text-xs text-muted-foreground">
            "Đã xác nhận" là số lượng người nhận hoặc người điều phối đã xác nhận có thật — không phải lời hứa.
          </p>
        </div>
      </section>

      <section aria-labelledby="how-title" className="mb-14">
        <h2 id="how-title" className="sr-only">
          Cách GOM NẮNG hoạt động
        </h2>
        <ol className="grid gap-4 md:grid-cols-3">
          {STEPS.map(({ Icon, title, text }, i) => (
            <li key={title} className="flex gap-4 rounded-2xl border bg-card p-5">
              <span aria-hidden="true" className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
                <Icon className="size-5" />
              </span>
              <div className="space-y-1">
                <p className="font-semibold">
                  <span className="text-muted-foreground tabular-nums">{String(i + 1).padStart(2, '0')} · </span>
                  {title}
                </p>
                <p className="text-sm text-muted-foreground">{text}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section aria-labelledby="projects-title" id="projects" className="scroll-mt-24">
        <SectionHeading
          id="projects-title"
          description="Chọn một dự án, xem còn thiếu gì và nhận đúng phần bạn lo được."
          action={
            state.status === 'ok' ? (
              <span className="text-sm text-muted-foreground" role="status">
                {visible.length} dự án
              </span>
            ) : undefined
          }
        >
          Dự án đang kêu gọi
        </SectionHeading>

        <DemoSwitch mode={mode} basePath="/" />

        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <label htmlFor="search" className="sr-only">
              Tìm theo tên dự án, địa điểm hoặc nhóm thụ hưởng
            </label>
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
            <Input
              id="search"
              type="search"
              className="h-11 pl-9 text-base"
              placeholder="Tìm theo tên, phường, nhóm thụ hưởng…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              disabled={state.status !== 'ok'}
            />
          </div>
          <div className="flex gap-2">
            <label htmlFor="status-filter" className="sr-only">
              Lọc theo trạng thái
            </label>
            <NativeSelect id="status-filter" className="h-11 w-full sm:w-44" value={status ?? ''} onChange={(e) => setStatus((e.target.value || null) as ProjectStatus | null)}>
              <NativeSelectOption value="">Mọi trạng thái</NativeSelectOption>
              {PUBLIC_STATUSES.map((s) => (
                <NativeSelectOption key={s} value={s}>
                  {STATUS_LABEL[s]}
                </NativeSelectOption>
              ))}
            </NativeSelect>
            <label htmlFor="sort" className="sr-only">
              Sắp xếp
            </label>
            <NativeSelect id="sort" className="h-11 w-full sm:w-48" value={sort} onChange={(e) => setSort(e.target.value as Sort)}>
              {(Object.keys(SORT_LABEL) as Sort[]).map((s) => (
                <NativeSelectOption key={s} value={s}>
                  {SORT_LABEL[s]}
                </NativeSelectOption>
              ))}
            </NativeSelect>
          </div>
        </div>

        <div role="group" aria-label="Lọc theo loại nhu cầu" className="mb-6 flex flex-wrap items-center gap-2">
          {[null, ...NEED_KINDS].map((k) => (
            <button
              key={k ?? 'all'}
              type="button"
              aria-pressed={kind === k}
              onClick={() => setKind(k)}
              className={cn(
                'min-h-9 rounded-full border px-3.5 text-sm transition-colors',
                kind === k ? 'border-primary bg-primary text-primary-foreground' : 'bg-card hover:bg-muted',
              )}
            >
              {k ? NEED_KIND_LABEL[k] : 'Tất cả nhu cầu'}
            </button>
          ))}
          {filtered && (
            <Button variant="ghost" size="sm" onClick={clearFilters}>
              <X aria-hidden="true" />
              Xoá bộ lọc
            </Button>
          )}
        </div>

        {state.status === 'loading' && <LoadingState label="Đang tải danh sách dự án…" />}
        {state.status === 'error' && <ApiErrorState error={state.error} onRetry={reload} />}

        {state.status === 'ok' && projects.length === 0 && (
          <EmptyState title="Chưa có dự án nào">
            <p>Khu vực của bạn chưa có hoạt động nào đang kêu gọi. Bạn có thể là người khởi xướng đầu tiên.</p>
            <Button asChild variant="cta">
              <Link href={withDemoMode('/projects/new', mode)}>Tạo dự án đầu tiên</Link>
            </Button>
          </EmptyState>
        )}

        {state.status === 'ok' && projects.length > 0 && visible.length === 0 && (
          <EmptyState title="Không có dự án nào khớp bộ lọc">
            <p>Thử từ khoá ngắn hơn, tìm theo tên phường, hoặc bỏ bớt điều kiện lọc.</p>
            <Button variant="outline" onClick={clearFilters}>
              Xoá bộ lọc
            </Button>
          </EmptyState>
        )}

        {state.status === 'ok' && visible.length > 0 && (
          <>
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {visible.map((p) => (
                <ProjectCard key={p.id} project={p} mode={mode} />
              ))}
            </div>
          </>
        )}
      </section>
    </>
  )
}
