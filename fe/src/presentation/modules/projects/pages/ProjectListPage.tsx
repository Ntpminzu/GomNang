'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowRight, ChevronLeft, ChevronRight, ClipboardList, Plus, Search, ShieldCheck, Sparkles, X } from 'lucide-react'
import { PROJECT_SORTS, SORT_LABEL, type ProjectPage, type ProjectSort } from '@gomnang/domain/catalog.ts'
import { NEED_KIND_LABEL, NEED_KINDS, PUBLIC_PROJECT_STATUSES, STATUS_LABEL, type NeedKind, type ProjectStatus } from '@gomnang/domain/types.ts'
import { listProjects, withDemoMode } from '@/libs/api/index.ts'
import { useLoad } from '@/presentation/hooks/use-load.ts'
import { ApiErrorState, DemoSwitch, EmptyState, LoadingState, SectionHeading } from '@/presentation/components/index.ts'
import { Button } from '@/presentation/components/ui/button.tsx'
import { Input } from '@/presentation/components/ui/input.tsx'
import { NativeSelect, NativeSelectOption } from '@/presentation/components/ui/native-select.tsx'
import { cn } from '@/libs/utils/cn.ts'
import { ProjectCard } from '../components/ProjectCard.tsx'

const STEPS = [
  { Icon: ClipboardList, title: 'Nhu cầu có số lượng', text: 'Mỗi dự án ghi rõ cần bao nhiêu phần cơm, bao nhiêu người, bao nhiêu tiền — ai muốn giúp cũng biết đúng chỗ còn thiếu.' },
  { Icon: ShieldCheck, title: 'Xác minh trước khi kêu gọi', text: 'Người xác minh độc lập đọc hồ sơ, người gác cổng tự động soát thông tin thiếu và dự án trùng.' },
  { Icon: Sparkles, title: 'Theo dõi tới từng bàn giao', text: 'Cam kết → bàn giao → người nhận xác nhận. Mọi thay đổi ghi vào sổ ghi vết không sửa được.' },
]

type Filters = { query: string; kind: NeedKind | null; status: ProjectStatus | null; sort: ProjectSort; page: number }
const DEFAULT_FILTERS: Filters = { query: '', kind: null, status: null, sort: 'soon', page: 1 }

/** Bộ lọc và trang nằm trên URL (?q=&kind=&status=&sort=&page=) để quay lại vẫn giữ nguyên, và gửi link được cho người khác. */
function readFilters(): Filters {
  const q = new URLSearchParams(window.location.search)
  const kind = q.get('kind')
  const status = q.get('status')
  const sort = q.get('sort')
  const page = Number(q.get('page'))
  return {
    query: q.get('q') ?? '',
    kind: (NEED_KINDS as readonly string[]).includes(kind ?? '') ? (kind as NeedKind) : null,
    status: PUBLIC_PROJECT_STATUSES.includes(status as ProjectStatus) ? (status as ProjectStatus) : null,
    sort: (PROJECT_SORTS as readonly string[]).includes(sort ?? '') ? (sort as ProjectSort) : 'soon',
    page: Number.isInteger(page) && page > 1 ? page : 1,
  }
}

export default function ProjectListPage() {
  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS)
  // Chưa đọc bộ lọc từ URL thì chưa tải và chưa ghi đè URL (React dev chạy effect hai lần sẽ xoá mất link được chia sẻ).
  const [urlRead, setUrlRead] = useState(false)
  // Ô tìm kiếm cập nhật ngay; chỉ gửi máy chủ khi người dùng ngừng gõ 300 ms.
  const [typed, setTyped] = useState('')
  const { query, kind, status, sort, page } = filters
  const { mode, state, reload } = useLoad(
    (m) =>
      urlRead
        ? listProjects({ q: query.trim() || undefined, kind: kind ?? undefined, status: status ?? undefined, sort, page }, m)
        : new Promise<never>(() => {}),
    [urlRead, query, kind, status, sort, page],
  )
  // Đang tải trang mới thì vẫn giữ kết quả cũ trên màn hình, tránh nháy và nhảy bố cục.
  const [lastPage, setLastPage] = useState<ProjectPage | null>(null)
  useEffect(() => {
    if (state.status !== 'ok') return
    setLastPage(state.data)
    // Máy chủ đưa về trang cuối khi link cũ trỏ quá số trang: đồng bộ lại để URL và nút phân trang khớp.
    // Chỉ chạy khi có dữ liệu mới, không chạy khi người dùng vừa bấm sang trang khác.
    setFilters((f) => (f.page === state.data.page ? f : { ...f, page: state.data.page }))
  }, [state])
  const result = state.status === 'ok' ? state.data : lastPage
  const refreshing = state.status === 'loading' && result !== null

  /** Đổi điều kiện lọc thì quay về trang 1. */
  const change = (next: Partial<Omit<Filters, 'page'>>) => setFilters((f) => ({ ...f, ...next, page: 1 }))

  useEffect(() => {
    const f = readFilters()
    setFilters(f)
    setTyped(f.query)
    setUrlRead(true)
  }, [])

  useEffect(() => {
    const timer = setTimeout(() => setFilters((f) => (f.query === typed ? f : { ...f, query: typed, page: 1 })), 300)
    return () => clearTimeout(timer)
  }, [typed])

  useEffect(() => {
    if (!urlRead) return
    const q = new URLSearchParams(window.location.search)
    const put = (key: string, value: string | null, fallback?: string) =>
      value && value !== fallback ? q.set(key, value) : q.delete(key)
    put('q', query.trim() || null)
    put('kind', kind)
    put('status', status)
    put('sort', sort, 'soon')
    put('page', String(page), '1')
    const search = q.toString()
    window.history.replaceState(null, '', `${window.location.pathname}${search ? `?${search}` : ''}${window.location.hash}`)
  }, [urlRead, query, kind, status, sort, page])

  const goTo = (next: number) => {
    setFilters((f) => ({ ...f, page: next }))
    document.getElementById('projects')?.scrollIntoView({ block: 'start' })
  }

  const filtered = Boolean(query.trim() || kind || status)
  const clearFilters = () => {
    setTyped('')
    change({ query: '', kind: null, status: null })
  }
  const stats = result?.stats

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
          {stats ? (
            <dl className="grid grid-cols-2 gap-4">
              {[
                ['Dự án đang cần giúp', stats.open],
                ['Nhu cầu đã có người nhận', `${stats.coveragePct}%`],
                ['Đơn vị đã được xác nhận nhận', stats.confirmedUnits.toLocaleString('vi-VN')],
                ['Hạng mục còn thiếu', stats.missingNeeds],
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
            result ? (
              <span className="text-sm text-muted-foreground" role="status">
                {refreshing ? 'Đang tải…' : `${result.total} dự án`}
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
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
            />
          </div>
          <div className="flex gap-2">
            <label htmlFor="status-filter" className="sr-only">
              Lọc theo trạng thái
            </label>
            <NativeSelect
              id="status-filter"
              className="h-11 w-full sm:w-60"
              value={status ?? ''}
              onChange={(e) => change({ status: (e.target.value || null) as ProjectStatus | null })}
            >
              <NativeSelectOption value="">Mọi trạng thái (trừ đã huỷ)</NativeSelectOption>
              {PUBLIC_PROJECT_STATUSES.map((s) => (
                <NativeSelectOption key={s} value={s}>
                  {STATUS_LABEL[s]}
                </NativeSelectOption>
              ))}
            </NativeSelect>
            <label htmlFor="sort" className="sr-only">
              Sắp xếp
            </label>
            <NativeSelect id="sort" className="h-11 w-full sm:w-48" value={sort} onChange={(e) => change({ sort: e.target.value as ProjectSort })}>
              {PROJECT_SORTS.map((s) => (
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
              onClick={() => change({ kind: k })}
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

        {!result && state.status === 'loading' && <LoadingState label="Đang tải danh sách dự án…" />}
        {state.status === 'error' && <ApiErrorState error={state.error} onRetry={reload} />}

        {state.status !== 'error' && result && result.total === 0 && !filtered && (
          <EmptyState title="Chưa có dự án nào">
            <p>Khu vực của bạn chưa có hoạt động nào đang kêu gọi. Bạn có thể là người khởi xướng đầu tiên.</p>
            <Button asChild variant="cta">
              <Link href={withDemoMode('/projects/new', mode)}>Tạo dự án đầu tiên</Link>
            </Button>
          </EmptyState>
        )}

        {state.status !== 'error' && result && result.total === 0 && filtered && (
          <EmptyState title="Không có dự án nào khớp bộ lọc">
            <p>Thử từ khoá ngắn hơn, tìm theo tên phường, hoặc bỏ bớt điều kiện lọc.</p>
            <Button variant="outline" onClick={clearFilters}>
              Xoá bộ lọc
            </Button>
          </EmptyState>
        )}

        {state.status !== 'error' && result && result.items.length > 0 && (
          <>
            <div aria-busy={refreshing} className={cn('grid gap-5 transition-opacity sm:grid-cols-2 lg:grid-cols-3', refreshing && 'opacity-60')}>
              {result.items.map((p) => (
                <ProjectCard key={p.id} project={p} mode={mode} />
              ))}
            </div>
            {result.totalPages > 1 && (
              <nav aria-label="Phân trang danh sách dự án" className="mt-8 flex items-center justify-between gap-3">
                <Button variant="outline" size="lg" disabled={refreshing || result.page <= 1} onClick={() => goTo(result.page - 1)}>
                  <ChevronLeft aria-hidden="true" />
                  Trang trước
                </Button>
                <p className="text-sm text-muted-foreground tabular-nums">
                  Trang {result.page}/{result.totalPages}
                </p>
                <Button variant="outline" size="lg" disabled={refreshing || result.page >= result.totalPages} onClick={() => goTo(result.page + 1)}>
                  Trang sau
                  <ChevronRight aria-hidden="true" />
                </Button>
              </nav>
            )}
          </>
        )}
      </section>
    </>
  )
}
