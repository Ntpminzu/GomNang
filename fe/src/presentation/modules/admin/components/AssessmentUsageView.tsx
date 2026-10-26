import Link from 'next/link'
import type { AssessmentOutcome, AssessmentUsage } from '@gomnang/domain/ai-usage.ts'
import { EmptyState, StatTile, linkClass, type Tone } from '@/presentation/components/index.ts'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/presentation/components/ui/table.tsx'
import { dateTime, number, seconds } from './usage-format.ts'
import { ListPanel, ListRow, MethodNote, StatusBadge, TableFrame } from './UsageParts.tsx'

const OUTCOME: Record<AssessmentOutcome, { label: string; tone: Tone }> = {
  ok: { label: 'Thành công', tone: 'success' },
  invalid_output: { label: 'Sai khuôn JSON', tone: 'warning' },
  error: { label: 'Lỗi model', tone: 'danger' },
}
const Outcome = ({ outcome }: { outcome: AssessmentOutcome }) => <StatusBadge {...OUTCOME[outcome]} />

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
            <ListPanel id="assess-versions" title="Theo model và prompt">
              {data.byVersion.map((v) => (
                <ListRow key={v.model + v.promptVersion} label={`${v.model} · ${v.promptVersion}`} value={`${number(v.requests)} lượt · TB ${seconds(v.avgMs)}`} />
              ))}
            </ListPanel>
            <ListPanel id="assess-outcomes" title="Kết cục và mã lỗi">
              {data.byOutcome.map((o) => (
                <ListRow key={o.outcome + (o.errorCode ?? '')} value={`${number(o.count)} lượt`}
                  label={<><Outcome outcome={o.outcome} />{o.errorCode && <code className="break-all text-xs">{o.errorCode}</code>}</>} />
              ))}
            </ListPanel>
          </div>

          <TableFrame id="assess-recent" title="Lượt đánh giá gần nhất (tối đa 50)">
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
                    <TableCell><span className="flex items-center gap-2"><Outcome outcome={r.outcome} />{r.errorCode && <code className="text-xs">{r.errorCode}</code>}</span></TableCell>
                    <TableCell className="whitespace-nowrap">{r.model} · {r.promptVersion}</TableCell>
                    <TableCell className="text-right tabular-nums">{r.attempts}</TableCell>
                    <TableCell className="text-right tabular-nums whitespace-nowrap">{number(r.inputTokens)} / {number(r.outputTokens)}</TableCell>
                    <TableCell className="text-right tabular-nums whitespace-nowrap">{seconds(r.latencyMs)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableFrame>
        </>
      )}

      <MethodNote label="Cách tính số liệu người gác cổng">
        <p>Thời gian là cả lượt đánh giá, gồm lần hỏi lại khi model trả sai khuôn. Token lấy từ Ollama, cộng mọi lần gọi trong lượt. Lượt lỗi vẫn được tính.</p>
        <p>Chi phí API: không áp dụng (model chạy trên máy). Chưa đo điện và phần cứng. Năng lực này không gọi tool.</p>
        <p>Lần chạy eval (<code>npm run eval:assessment -- --record</code>) ghi riêng nhãn <code>assessment_eval</code>, chỉ hiện ở ô đếm, không cộng vào số liệu trên.</p>
      </MethodNote>
    </div>
  )
}
