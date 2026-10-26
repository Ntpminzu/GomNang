'use client'
import { useEffect, useState } from 'react'
import { MessagesSquare, ShieldCheck } from 'lucide-react'
import type { AiUsage } from '@gomnang/domain/ai-usage.ts'
import { request } from '@/libs/api/client.ts'
import { refreshSession } from '@/libs/api/http/auth.ts'
import { toApiError, type ApiError } from '@/libs/api/errors.ts'
import { useSession } from '@/presentation/providers/SessionProvider.tsx'
import { EmptyState, ErrorAlert, Field, LoadingState, PageHeader, StatTile } from '@/presentation/components/index.ts'
import { Button } from '@/presentation/components/ui/button.tsx'
import { Input } from '@/presentation/components/ui/input.tsx'
import { NativeSelect, NativeSelectOption } from '@/presentation/components/ui/native-select.tsx'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/presentation/components/ui/tabs.tsx'
import { AssessmentUsageView } from '../components/AssessmentUsageView.tsx'
import { dateTime, number, percent, seconds } from '../components/usage-format.ts'

const statusLabel = (value: string) => ({ answered: 'Đã trả lời', refused: 'Từ chối', failed: 'Lỗi' })[value] ?? value

export default function AiUsagePage() {
  const { user, ready } = useSession()
  if (!ready) return <LoadingState label="Đang kiểm tra phiên…" />
  if (user?.role !== 'admin') return <EmptyState title="Không có quyền xem trang này"><p>Chỉ quản trị viên được xem mức sử dụng AI.</p></EmptyState>
  return <UsageDashboard key={user.id} />
}

function UsageDashboard() {
  const [mode, setMode] = useState('7d')
  const [from, setFrom] = useState(''), [to, setTo] = useState('')
  const [query, setQuery] = useState('period=7d'), [attempt, setAttempt] = useState(0)
  const [data, setData] = useState<AiUsage | null>(null)
  const [loading, setLoading] = useState(true), [error, setError] = useState<ApiError | null>(null)
  useEffect(() => {
    let active = true
    setLoading(true); setError(null); setData(null)
    void request<AiUsage>('/api/admin/ai-usage?' + query).then((result) => {
      if (active) setData(result)
    }).catch((err) => {
      if (!active) return
      const failure = toApiError(err); setError(failure)
      if (failure.status === 403) void refreshSession().catch(() => {})
    }).finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [query, attempt])
  function submit(event: React.FormEvent) {
    event.preventDefault()
    setQuery(mode === 'custom' ? new URLSearchParams({ from, to }).toString() : 'period=' + mode)
    setAttempt((value) => value + 1)
  }
  return <div className="space-y-6">
    <PageHeader eyebrow="Quản trị" title="Mức sử dụng AI"
      description="GomNang dùng AI ở hai vai: trợ lý hỏi đáp cho mọi người và người gác cổng hỗ trợ người xác minh. Số liệu lấy từ log từng lượt gọi, không lưu nội dung câu hỏi hay hồ sơ." />
    <form onSubmit={submit} className="flex flex-wrap items-end gap-4 rounded-xl border bg-card p-4">
      <Field id="usage-period" label="Khoảng đo" className="w-full sm:w-48"><NativeSelect id="usage-period" className="h-10 w-full" value={mode} onChange={(e) => setMode(e.target.value)}>
        <NativeSelectOption value="24h">24 giờ qua</NativeSelectOption><NativeSelectOption value="7d">7 ngày qua</NativeSelectOption>
        <NativeSelectOption value="30d">30 ngày qua</NativeSelectOption><NativeSelectOption value="custom">Tự chọn ngày</NativeSelectOption>
      </NativeSelect></Field>
      {mode === 'custom' && <>
        <Field id="usage-from" label="Từ ngày" className="w-full sm:w-44"><Input id="usage-from" type="date" required value={from} onChange={(e) => setFrom(e.target.value)} /></Field>
        <Field id="usage-to" label="Đến ngày" className="w-full sm:w-44"><Input id="usage-to" type="date" required value={to} onChange={(e) => setTo(e.target.value)} /></Field>
      </>}
      <Button type="submit" size="lg">Áp dụng</Button>
      <p className="w-full text-sm text-muted-foreground">Ngày tự chọn theo giờ Việt Nam, tối đa 92 ngày, gồm cả ngày đầu và cuối.</p>
    </form>
    {error && <div className="space-y-3"><ErrorAlert error={error} /><Button variant="outline" onClick={() => setAttempt((value) => value + 1)}>Thử lại</Button></div>}
    {loading && <LoadingState label="Đang tải mức sử dụng AI…" />}
    {!loading && data && <>
      <p className="text-sm text-muted-foreground" role="status">Khoảng đã áp dụng: {dateTime(data.period.from)} đến trước {dateTime(data.period.to)} (giờ Việt Nam).</p>
      <RoleCards data={data} />
      <Tabs defaultValue="chat">
        <div className="-mx-4 mb-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
          <TabsList className="w-max">
            <TabsTrigger value="chat">Trợ lý hỏi đáp ({number(data.totals.requests)})</TabsTrigger>
            <TabsTrigger value="assessment">Người gác cổng ({number(data.assessment.totals.requests)})</TabsTrigger>
          </TabsList>
        </div>
        <TabsContent value="chat"><ChatUsageView data={data} /></TabsContent>
        <TabsContent value="assessment"><AssessmentUsageView data={data.assessment} /></TabsContent>
      </Tabs>
    </>}
  </div>
}

/** Hai vai AI cạnh nhau để so nhanh: lượt gọi, tỷ lệ thành công, thời gian, token. */
function RoleCards({ data }: { data: AiUsage }) {
  const chat = data.totals, a = data.assessment
  const roles = [
    { key: 'chat', icon: MessagesSquare, title: 'Trợ lý hỏi đáp', subtitle: 'RAG trả lời câu hỏi về dự án, có trích nguồn',
      requests: chat.requests, ok: chat.answered, okLabel: 'trả lời được', failed: chat.failed,
      avgMs: data.latency.avgMs, tokens: data.tokens.avgTotalPerMeasuredRequest },
    { key: 'assessment', icon: ShieldCheck, title: 'Người gác cổng', subtitle: 'Structured output gợi ý điểm cần hỏi lại cho người xác minh',
      requests: a.totals.requests, ok: a.totals.ok, okLabel: 'đúng khuôn', failed: a.totals.failed + a.totals.invalidOutput,
      avgMs: a.latency.avgMs, tokens: a.tokens.avgPerRequest },
  ]
  return <section className="grid gap-4 md:grid-cols-2" aria-label="Hai vai AI">
    {roles.map(({ key, icon: Icon, ...r }) => (
      <article key={key} className="rounded-xl border bg-card p-5">
        <div className="flex items-start gap-3">
          <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-primary/12 text-primary"><Icon className="size-5" aria-hidden="true" /></span>
          <div className="min-w-0">
            <h2 className="font-semibold">{r.title}</h2>
            <p className="text-sm text-muted-foreground">{r.subtitle}</p>
          </div>
        </div>
        <p className="mt-4 text-3xl font-semibold tabular-nums">{number(r.requests)} <span className="text-base font-normal text-muted-foreground">lượt</span></p>
        <dl className="mt-3 grid grid-cols-3 gap-3 text-sm">
          <div><dt className="text-muted-foreground">Thành công</dt><dd className="font-medium tabular-nums">{percent(r.ok, r.requests)} <span className="sr-only">{r.okLabel}</span></dd></div>
          <div><dt className="text-muted-foreground">Thời gian TB</dt><dd className="font-medium tabular-nums">{seconds(r.avgMs)}</dd></div>
          <div><dt className="text-muted-foreground">Token/lượt</dt><dd className="font-medium tabular-nums">{number(r.tokens === null ? null : Math.round(r.tokens))}</dd></div>
        </dl>
        <p className="mt-3 text-xs text-muted-foreground">Lỗi: {number(r.failed)} · Model chạy trên máy, không tính phí API.</p>
      </article>
    ))}
  </section>
}

/** Tab "Trợ lý hỏi đáp": số liệu của chat_requests (US-9 của An), giữ nguyên cách tính. */
function ChatUsageView({ data }: { data: AiUsage }) {
  return <div className="space-y-6">
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <StatTile label="Request đã ghi nhận" value={number(data.totals.requests)} hint="Gồm trả lời, từ chối và lỗi" />
      <StatTile label="Đã trả lời" value={number(data.totals.answered)} />
      <StatTile label="Từ chối" value={number(data.totals.refused)} />
      <StatTile label="Lỗi" value={number(data.totals.failed)} />
      <StatTile label="Latency trung bình" value={number(data.latency.avgMs) + ' ms'} hint={`Tổng latency / ${data.latency.denominator} request, gồm mọi trạng thái`} />
      <StatTile label="Generation tokens đã đo được" value={number(data.tokens.total)} hint={`Có số đo: ${data.tokens.totalDenominator}/${data.totals.requests} request. TB: ${number(data.tokens.avgTotalPerMeasuredRequest)} token/request đo được.`} />
      <StatTile label="Embedding tokens đã đo được" value={number(data.tokens.embedding)} hint={`Có số đo: ${data.tokens.embeddingDenominator}/${data.totals.requests} request. TB: ${number(data.tokens.avgEmbeddingPerMeasuredRequest)} token/request đo được.`} />
      <StatTile label="Chi phí API" value="Không áp dụng (local)" hint="Chi phí TB/request: không áp dụng (local). Chưa đo chi phí phần cứng/điện." />
    </div>
    {data.totals.requests === 0 && <EmptyState title="Chưa có request trong khoảng đã chọn" />}
    {data.byReason.length > 0 && <section className="space-y-3" aria-labelledby="usage-reasons">
      <h3 id="usage-reasons" className="font-semibold">Lỗi và lý do xử lý</h3>
      <ul className="grid gap-3 sm:grid-cols-2">{data.byReason.map((row) => <li key={`${row.status}:${row.reasonCode}:${row.httpStatus}`} className="min-w-0 rounded-xl border bg-card p-4">
        <p className="font-medium">{statusLabel(row.status)} · {number(row.count)} request</p><p className="break-words text-sm text-muted-foreground">{row.reasonCode} · HTTP {row.httpStatus}</p>
      </li>)}</ul>
    </section>}
    {data.recent.length > 0 && <section className="space-y-3" aria-labelledby="usage-recent">
      <h3 id="usage-recent" className="font-semibold">Request gần nhất (tối đa 50)</h3>
      <ul className="space-y-3">{data.recent.map((row) => <li key={row.requestId} className="min-w-0 rounded-xl border bg-card p-4">
        <div className="flex flex-wrap justify-between gap-2"><p className="font-medium">#{row.requestId} · {statusLabel(row.status)}</p><time dateTime={row.startedAt} className="text-sm text-muted-foreground">{dateTime(row.startedAt)}</time></div>
        <p className="break-words text-sm">{row.reasonCode} · HTTP {row.httpStatus} · {number(row.latencyMs)} ms</p>
        <details className="mt-2 text-sm"><summary className="cursor-pointer text-primary">Metadata request #{row.requestId}</summary>
          <dl className="mt-3 grid gap-2 break-words sm:grid-cols-2">
            <div><dt className="text-muted-foreground">Model yêu cầu / thực tế</dt><dd>{row.requestedModel ?? '—'} / {row.actualModel ?? '—'}</dd></div>
            <div><dt className="text-muted-foreground">Embedding model</dt><dd>{row.embeddingModel}</dd></div>
            <div><dt className="text-muted-foreground">Prompt / query prompt</dt><dd>{row.promptVersion} / {row.queryPromptVersion}</dd></div>
            <div><dt className="text-muted-foreground">Nguồn / lần gọi model / embedding</dt><dd>{row.origin ?? '—'} / {row.modelCalls} / {row.embeddingCalls}</dd></div>
            <div><dt className="text-muted-foreground">Tokens input / output / thinking</dt><dd>{number(row.inputTokens)} / {number(row.outputTokens)} / {number(row.thinkingTokens)}</dd></div>
            <div><dt className="text-muted-foreground">Tokens generation / embedding</dt><dd>{number(row.totalTokens)} / {number(row.embeddingTokens)}</dd></div>
          </dl>
        </details>
      </li>)}</ul>
    </section>}
    <section className="space-y-2 rounded-xl border bg-card p-4 text-sm text-muted-foreground" aria-label="Cách tính số liệu">
      <h3 className="font-semibold text-foreground">Cách tính và giới hạn</h3>
      <p>Lần thử gọi model: {number(data.totals.llmCalls)} · Embedding: {number(data.totals.embeddingCalls)}. Nguồn xử lý: model {number(data.totals.modelOrigin)}, quy tắc {number(data.totals.ruleOrigin)}, chưa xác định {number(data.totals.unknownOrigin)}; nguồn model gồm cả lần gọi thất bại.</p>
      <p>Token trung bình = tổng token đã đo / số request có số đo; generation không gồm embedding. Không có số đo hiện “—”. Số 0 chỉ là số đo thực hoặc tổng của khoảng không có request.</p>
      <p>Latency là thời gian cả request; phản hồi quy tắc và lỗi nhanh cũng được tính. Log có thể thiếu khi tiến trình hoặc DB lỗi. Chỉ tính embedding câu hỏi, không gồm lệnh index tài liệu. Pipeline RAG hiện tại không gọi tools LLM.</p>
    </section>
  </div>
}
