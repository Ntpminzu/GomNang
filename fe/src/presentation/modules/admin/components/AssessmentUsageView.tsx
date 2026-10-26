import Link from 'next/link'
import type { AssessmentOutcome, AssessmentUsage } from '@gomnang/domain/ai-usage.ts'
import { EmptyState, StatTile, linkClass, toneClass, type Tone } from '@/presentation/components/index.ts'
import { Badge } from '@/presentation/components/ui/badge.tsx'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/presentation/components/ui/table.tsx'
import { dateTime, number, seconds } from './usage-format.ts'

const OUTCOME: Record<AssessmentOutcome, { label: string; tone: Tone }> = {
  ok: { label: 'Thành công', tone: 'success' },
  invalid_output: { label: 'Sai khuôn JSON', tone: 'warning' },
  error: { label: 'Lỗi model', tone: 'danger' },
}

function OutcomeBadge({ outcome }: { outcome: AssessmentOutcome }) {
  return <Badge className={toneClass[OUTCOME[outcome].tone]}>{OUTCOME[outcome].label}</Badge>
}

/** Tab "Người gác cổng": mỗi lần người xác minh bấm "Đánh giá bằng AI" là một dòng ai_requests. */
export function AssessmentUsageView({ data }: { data: AssessmentUsage }) {
  const { totals, latency, tokens } = data
  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile label="Lượt đánh giá" value={number(totals.requests)} hint={`Gồm cả lượt lỗi. Lần chạy eval không tính: ${number(totals.evalRuns)}`} />
        <StatTile label="Thành công" value={number(totals.ok)} hint={`Sai khuôn JSON ${number(totals.invalidOutput)} · lỗi model ${number(totals.failed)}`} />
        <StatTile label="Thời gian trung bình" value={seconds(latency.avgMs)} hint={`95% lượt xong trong ${seconds(latency.p95Ms)}`} />
        <StatTile label="Token mỗi lượt" value={number(tokens.avgPerRequest === null ? null : Math.round(tokens.avgPerRequest))}
          hint={`Tổng ${number(tokens.input)} vào · ${number(tokens.output)} ra · ${number(totals.modelCalls)} lần gọi model`} />
      </div>

      {totals.requests === 0 ? (
        <EmptyState title="Chưa có lượt đánh giá trong khoảng đã chọn">
          <p>Lượt đánh giá được ghi khi người xác minh bấm "Đánh giá bằng AI" trên hồ sơ chờ xác minh.</p>
        </EmptyState>
      ) : (
        <>
          <div className="grid gap-4 lg:grid-cols-2">
            <section className="rounded-xl border bg-card p-4" aria-labelledby="assess-versions">
              <h3 id="assess-versions" className="font-semibold">Theo model và prompt</h3>
              <ul className="mt-3 divide-y">
                {data.byVersion.map((v) => (
                  <li key={v.model + v.promptVersion} className="flex flex-wrap items-baseline justify-between gap-2 py-2 text-sm">
                    <span className="min-w-0 break-words">{v.model} · {v.promptVersion}</span>
                    <span className="tabular-nums text-muted-foreground">{number(v.requests)} lượt · TB {seconds(v.avgMs)}</span>
                  </li>
                ))}
              </ul>
            </section>
            <section className="rounded-xl border bg-card p-4" aria-labelledby="assess-outcomes">
              <h3 id="assess-outcomes" className="font-semibold">Kết cục và mã lỗi</h3>
              <ul className="mt-3 divide-y">
                {data.byOutcome.map((o) => (
                  <li key={o.outcome + (o.errorCode ?? '')} className="flex flex-wrap items-center justify-between gap-2 py-2 text-sm">
                    <span className="flex min-w-0 flex-wrap items-center gap-2"><OutcomeBadge outcome={o.outcome} />{o.errorCode && <code className="break-all text-xs">{o.errorCode}</code>}</span>
                    <span className="tabular-nums text-muted-foreground">{number(o.count)} lượt</span>
                  </li>
                ))}
              </ul>
            </section>
          </div>

          <section className="space-y-3" aria-labelledby="assess-recent">
            <h3 id="assess-recent" className="font-semibold">Lượt đánh giá gần nhất (tối đa 50)</h3>
            {/* Bảng rộng hơn màn điện thoại: cuộn ngang trong khung, trang không cuộn ngang. */}
            <div className="overflow-x-auto rounded-xl border bg-card">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Thời điểm</TableHead>
                    <TableHead>Dự án</TableHead>
                    <TableHead>Kết cục</TableHead>
                    <TableHead>Model · prompt</TableHead>
                    <TableHead className="text-right">Lần gọi</TableHead>
                    <TableHead className="text-right">Token vào / ra</TableHead>
                    <TableHead className="text-right">Thời gian</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.recent.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell className="whitespace-nowrap"><time dateTime={r.createdAt}>{dateTime(r.createdAt)}</time></TableCell>
                      <TableCell className="max-w-56 truncate" title={r.projectName ?? undefined}>
                        {r.projectId && r.projectName ? <Link href={`/projects/${r.projectId}`} className={linkClass}>{r.projectName}</Link> : '—'}
                      </TableCell>
                      <TableCell><span className="flex items-center gap-2"><OutcomeBadge outcome={r.outcome} />{r.errorCode && <code className="text-xs">{r.errorCode}</code>}</span></TableCell>
                      <TableCell className="whitespace-nowrap">{r.model} · {r.promptVersion}</TableCell>
                      <TableCell className="text-right tabular-nums">{r.attempts}</TableCell>
                      <TableCell className="text-right tabular-nums whitespace-nowrap">{number(r.inputTokens)} / {number(r.outputTokens)}</TableCell>
                      <TableCell className="text-right tabular-nums whitespace-nowrap">{seconds(r.latencyMs)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </section>
        </>
      )}

      <section className="space-y-2 rounded-xl border bg-card p-4 text-sm text-muted-foreground" aria-label="Cách tính số liệu người gác cổng">
        <h3 className="font-semibold text-foreground">Cách tính</h3>
        <p>Thời gian là cả lượt đánh giá, gồm lần hỏi lại khi model trả sai khuôn. Token lấy từ Ollama, cộng mọi lần gọi trong lượt. Lượt lỗi vẫn được tính.</p>
        <p>Chi phí API: không áp dụng (model chạy trên máy). Chưa đo điện và phần cứng. Năng lực này không gọi tool.</p>
        <p>Lần chạy eval (<code>npm run eval:assessment -- --record</code>) ghi riêng nhãn <code>assessment_eval</code>, chỉ hiện ở ô đếm, không cộng vào số liệu trên.</p>
      </section>
    </div>
  )
}
