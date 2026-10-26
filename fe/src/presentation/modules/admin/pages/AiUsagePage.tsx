'use client'
import { useEffect, useState } from 'react'
import type { AiUsage } from '@gomnang/domain/ai-usage.ts'
import { request } from '@/libs/api/client.ts'
import { refreshSession } from '@/libs/api/http/auth.ts'
import { toApiError, type ApiError } from '@/libs/api/errors.ts'
import { useSession } from '@/presentation/providers/SessionProvider.tsx'
import { EmptyState, ErrorAlert, Field, LoadingState, PageHeader, StatTile } from '@/presentation/components/index.ts'
import { Button } from '@/presentation/components/ui/button.tsx'
import { Input } from '@/presentation/components/ui/input.tsx'

const number = (value: number | null) => value === null ? '—' : value.toLocaleString('vi-VN', { maximumFractionDigits: 2 })
const dateTime = (value: string) => new Date(value).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })
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
    <PageHeader eyebrow="Quản trị" title="Mức sử dụng AI" description="Request, token và thời gian phản hồi đã ghi nhận của trợ lý GomNang." />
    <form onSubmit={submit} className="flex flex-wrap items-end gap-4 rounded-xl border bg-card p-4">
      <Field id="usage-period" label="Khoảng đo"><select id="usage-period" value={mode} onChange={(e) => setMode(e.target.value)} className="h-11 w-full rounded-md border bg-background px-3 text-base">
        <option value="24h">24 giờ qua</option><option value="7d">7 ngày qua</option><option value="30d">30 ngày qua</option><option value="custom">Tự chọn ngày</option>
      </select></Field>
      {mode === 'custom' && <>
        <Field id="usage-from" label="Từ ngày"><Input id="usage-from" type="date" required value={from} onChange={(e) => setFrom(e.target.value)} /></Field>
        <Field id="usage-to" label="Đến ngày"><Input id="usage-to" type="date" required value={to} onChange={(e) => setTo(e.target.value)} /></Field>
      </>}
      <Button type="submit">Áp dụng</Button>
      <p className="w-full text-sm text-muted-foreground">Ngày tự chọn theo giờ Việt Nam, tối đa 92 ngày, gồm cả ngày đầu và cuối.</p>
    </form>
    {error && <div className="space-y-3"><ErrorAlert error={error} /><Button variant="outline" onClick={() => setAttempt((value) => value + 1)}>Thử lại</Button></div>}
    {loading && <LoadingState label="Đang tải mức sử dụng AI…" />}
    {!loading && data && <>
      <p className="text-sm text-muted-foreground" role="status">Khoảng đã áp dụng: {dateTime(data.period.from)} đến trước {dateTime(data.period.to)} (giờ Việt Nam).</p>
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
      <section className="space-y-2 rounded-xl border bg-card p-4" aria-label="Cách tính số liệu">
        <h2 className="text-lg font-semibold">Cách tính và giới hạn</h2>
        <p>Lần thử gọi model: {number(data.totals.llmCalls)} · Embedding: {number(data.totals.embeddingCalls)}.</p>
        <p>Nguồn xử lý: model {number(data.totals.modelOrigin)}, quy tắc {number(data.totals.ruleOrigin)}, chưa xác định {number(data.totals.unknownOrigin)}. Nguồn model bao gồm lần gọi thất bại.</p>
        <p className="text-sm text-muted-foreground">Token trung bình = tổng token đã đo / số request có số đo; generation không gồm embedding. Không có số đo hiện “—”. Số 0 chỉ là số đo thực hoặc tổng của khoảng không có request.</p>
        <p className="text-sm text-muted-foreground">Latency là thời gian cả request; phản hồi quy tắc và lỗi nhanh cũng được tính. Log có thể thiếu khi tiến trình hoặc DB lỗi. Chỉ tính embedding câu hỏi, không gồm lệnh index tài liệu.</p>
        <p className="text-sm text-muted-foreground">Pipeline RAG hiện tại không gọi tools LLM.</p>
      </section>
      {data.totals.requests === 0 && <EmptyState title="Chưa có request trong khoảng đã chọn" />}
      <section className="space-y-3" aria-labelledby="usage-reasons">
        <h2 id="usage-reasons" className="text-lg font-semibold">Lỗi và lý do xử lý</h2>
        <ul className="grid gap-3 sm:grid-cols-2">{data.byReason.map((row) => <li key={`${row.status}:${row.reasonCode}:${row.httpStatus}`} className="min-w-0 rounded-xl border bg-card p-4">
          <p className="font-medium">{statusLabel(row.status)} · {number(row.count)} request</p><p className="break-words text-sm text-muted-foreground">{row.reasonCode} · HTTP {row.httpStatus}</p>
        </li>)}</ul>
      </section>
      <section className="space-y-3" aria-labelledby="usage-recent">
        <h2 id="usage-recent" className="text-lg font-semibold">Request gần nhất (tối đa 50)</h2>
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
      </section>
    </>}
  </div>
}
