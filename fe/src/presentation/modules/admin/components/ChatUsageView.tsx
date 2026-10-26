import type { AiUsage } from '@gomnang/domain/ai-usage.ts'
import { EmptyState, StatTile, type Tone } from '@/presentation/components/index.ts'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/presentation/components/ui/table.tsx'
import { dateTime, number, seconds } from './usage-format.ts'
import { ListPanel, ListRow, MethodNote, StatusBadge, TableFrame } from './UsageParts.tsx'

const STATUS: Record<string, { label: string; tone: Tone }> = {
  answered: { label: 'Đã trả lời', tone: 'success' },
  refused: { label: 'Từ chối', tone: 'warning' },
  failed: { label: 'Lỗi', tone: 'danger' },
}
const Status = ({ status }: { status: string }) => <StatusBadge {...(STATUS[status] ?? { label: status, tone: 'neutral' })} />
const avg = (value: number | null) => number(value === null ? null : Math.round(value))

/** Tab "Trợ lý hỏi đáp": số liệu chat_requests (US-9 của An), cùng bố cục với tab người gác cổng, giữ đủ mọi số đo và mẫu số. */
export function ChatUsageView({ data }: { data: AiUsage }) {
  const { totals, latency, tokens } = data
  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile label="Request đã ghi nhận" value={number(totals.requests)} hint="Gồm trả lời, từ chối và lỗi" />
        <StatTile label="Đã trả lời" value={number(totals.answered)} hint={`Từ chối ${number(totals.refused)} · lỗi ${number(totals.failed)}`} />
        <StatTile label="Thời gian trung bình" value={seconds(latency.avgMs)} hint={`Tổng latency / ${latency.denominator} request, gồm mọi trạng thái`} />
        <StatTile label="Token generation mỗi lượt" value={avg(tokens.avgTotalPerMeasuredRequest)}
          hint={`Tổng ${number(tokens.total)} · có số đo ${tokens.totalDenominator}/${totals.requests} request`} />
      </div>

      {totals.requests === 0 && <EmptyState title="Chưa có request trong khoảng đã chọn" />}
      {totals.requests > 0 && (
        <>
          <div className="grid gap-4 lg:grid-cols-2">
            <ListPanel id="chat-calls" title="Nguồn xử lý và lần gọi">
              <ListRow label="Model trả lời (gồm lần gọi thất bại)" value={`${number(totals.modelOrigin)} request`} />
              <ListRow label="Quy tắc trả lời" value={`${number(totals.ruleOrigin)} request`} />
              <ListRow label="Chưa xác định nguồn" value={`${number(totals.unknownOrigin)} request`} />
              <ListRow label="Lần thử gọi model" value={number(totals.llmCalls)} />
              <ListRow label="Lần gọi embedding" value={number(totals.embeddingCalls)} />
              <ListRow label="Embedding tokens đã đo được"
                value={`${number(tokens.embedding)} · ${tokens.embeddingDenominator}/${totals.requests} request · TB ${avg(tokens.avgEmbeddingPerMeasuredRequest)}`} />
            </ListPanel>
            <ListPanel id="usage-reasons" title="Lỗi và lý do xử lý">
              {data.byReason.map((row) => (
                <ListRow key={`${row.status}:${row.reasonCode}:${row.httpStatus}`} value={`${number(row.count)} request`}
                  label={<><Status status={row.status} /><code className="break-all text-xs">{row.reasonCode} · HTTP {row.httpStatus}</code></>} />
              ))}
            </ListPanel>
          </div>

          <TableFrame id="usage-recent" title="Request gần nhất (tối đa 50)" note="Bảng có 12 cột: kéo ngang trong khung để xem hết.">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Thời điểm</TableHead>
                  <TableHead>Request</TableHead>
                  <TableHead>Kết cục</TableHead>
                  <TableHead>Lý do · HTTP</TableHead>
                  <TableHead>Nguồn</TableHead>
                  <TableHead>Model yêu cầu / thực tế</TableHead>
                  <TableHead>Embedding model</TableHead>
                  <TableHead>Prompt / query prompt</TableHead>
                  <TableHead className="text-right">Gọi model / embedding</TableHead>
                  <TableHead className="text-right">Tokens input / output / thinking</TableHead>
                  <TableHead className="text-right">Tokens generation / embedding</TableHead>
                  <TableHead className="text-right">Thời gian</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.recent.map((r) => (
                  <TableRow key={r.requestId}>
                    <TableCell className="whitespace-nowrap"><time dateTime={r.startedAt}>{dateTime(r.startedAt)}</time></TableCell>
                    <TableCell className="tabular-nums">#{r.requestId}</TableCell>
                    <TableCell><Status status={r.status} /></TableCell>
                    <TableCell className="whitespace-nowrap"><code className="text-xs">{r.reasonCode} · HTTP {r.httpStatus}</code></TableCell>
                    <TableCell>{r.origin ?? '—'}</TableCell>
                    <TableCell className="whitespace-nowrap">{r.requestedModel ?? '—'} / {r.actualModel ?? '—'}</TableCell>
                    <TableCell className="whitespace-nowrap">{r.embeddingModel}</TableCell>
                    <TableCell className="whitespace-nowrap">{r.promptVersion} / {r.queryPromptVersion}</TableCell>
                    <TableCell className="text-right tabular-nums">{r.modelCalls} / {r.embeddingCalls}</TableCell>
                    <TableCell className="text-right tabular-nums whitespace-nowrap">{number(r.inputTokens)} / {number(r.outputTokens)} / {number(r.thinkingTokens)}</TableCell>
                    <TableCell className="text-right tabular-nums whitespace-nowrap">{number(r.totalTokens)} / {number(r.embeddingTokens)}</TableCell>
                    <TableCell className="text-right tabular-nums whitespace-nowrap">{seconds(r.latencyMs)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableFrame>
        </>
      )}

      <MethodNote label="Cách tính số liệu trợ lý hỏi đáp">
        <p>Chi phí API: không áp dụng (local). Chi phí TB/request: không áp dụng (local). Chưa đo chi phí phần cứng/điện.</p>
        <p>Token trung bình = tổng token đã đo / số request có số đo; generation không gồm embedding. Không có số đo hiện “—”. Số 0 chỉ là số đo thực hoặc tổng của khoảng không có request.</p>
        <p>Latency là thời gian cả request; phản hồi quy tắc và lỗi nhanh cũng được tính. Log có thể thiếu khi tiến trình hoặc DB lỗi. Chỉ tính embedding câu hỏi, không gồm lệnh index tài liệu.</p>
        <p>Pipeline RAG hiện tại không gọi tools LLM.</p>
      </MethodNote>
    </div>
  )
}
