'use client'

import { useEffect, useRef, useState, type FormEvent } from 'react'
import { askChat, getChatModel, type ChatTurn } from '../../../libs/api/chat.ts'
import type { ChatModelInfo, ChatSource, ChatReply } from '@gomnang/domain/types.ts'
import { toApiError, type ApiError } from '../../../libs/api/errors.ts'
import { isMockMode } from '../../../libs/config/env.ts'
import { MessageCircle, Send, X } from 'lucide-react'
import { Button } from '../../components/ui/button.tsx'
import { Textarea } from '../../components/ui/textarea.tsx'
import { cn } from '../../../libs/utils/cn.ts'

export function ChatWidget() {
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState('')
  const [messages, setMessages] = useState<(ChatTurn & { modelName?: string; sources?: ChatSource[]; status?: ChatReply['status'] })[]>([])
  const [model, setModel] = useState<ChatModelInfo | null>(null)
  const [modelError, setModelError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<ApiError | null>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const toggleRef = useRef<HTMLButtonElement>(null)
  const endRef = useRef<HTMLDivElement>(null)
  const formRef = useRef<HTMLFormElement>(null)

  useEffect(() => { if (open) inputRef.current?.focus() }, [open])
  useEffect(() => { if (open) endRef.current?.scrollIntoView({ block: 'end' }) }, [messages, busy, open])
  useEffect(() => {
    if (!open || isMockMode) return
    let active = true
    getChatModel().then((info) => { if (active) { setModel(info); setModelError(null) } })
      .catch((err) => { if (active) setModelError(toApiError(err).message) })
    return () => { active = false }
  }, [open])

  const canChat = model?.available

  async function send(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const message = draft.trim()
    if (!message || busy || isMockMode || !canChat) return
    const history = messages.flatMap<ChatTurn>((turn, index) => {
      const previous = messages[index - 1]
      return turn.role === 'assistant' && turn.status === 'answered' && previous?.role === 'user'
        ? [{ role: previous.role, content: previous.content }, { role: turn.role, content: turn.content }] : []
    }).slice(-8)
    setDraft('')
    setError(null)
    setMessages((current) => [...current, { role: 'user', content: message }])
    setBusy(true)
    try {
      const answer = await askChat(message, history)
      setMessages((current) => [...current, { role: 'assistant', content: answer.reply, modelName: answer.generatedByModel ? model?.name : undefined, sources: answer.sources, status: answer.status }])
    } catch (err) {
      setMessages((current) => current.slice(0, -1))
      setDraft(message)
      setError(toApiError(err))
    } finally {
      setBusy(false)
    }
  }

  return <div className="fixed right-4 bottom-4 z-50 flex flex-col items-end gap-3">
    {open && <section className="flex max-h-[min(640px,calc(100dvh-6rem))] w-[min(380px,calc(100vw-2rem))] flex-col overflow-hidden rounded-2xl border bg-card shadow-xl" id="chat-panel" aria-label="Trợ lý GOM NẮNG">
      <div className="flex items-center justify-between gap-2 border-b bg-primary px-4 py-3 text-primary-foreground">
        <div><strong className="block text-sm">Trợ lý GOM NẮNG</strong><small className="text-xs opacity-85">Hỗ trợ thông tin dự án</small></div>
        <Button type="button" variant="ghost" size="icon" className="text-primary-foreground hover:bg-white/15 hover:text-primary-foreground" onClick={() => { setOpen(false); toggleRef.current?.focus() }} aria-label="Đóng trợ lý"><X /></Button>
      </div>
      <div className="flex-1 space-y-3 overflow-y-auto p-4" aria-live="polite" aria-relevant="additions text">
        {messages.length === 0 && <p className="rounded-xl bg-muted p-3 text-sm text-muted-foreground">Xin chào! Bạn có thể hỏi cách tạo dự án, đóng góp hoặc tìm dự án công khai.</p>}
        {messages.map((item, index) => <div key={index} className={cn('max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm', item.role === 'user' ? 'ml-auto bg-primary text-primary-foreground' : 'bg-muted')}>
          <span className="sr-only">{item.role === 'user' ? 'Bạn: ' : 'Trợ lý: '}</span>
          {item.modelName && <span className="mb-1 block text-[11px] text-muted-foreground">{item.modelName}</span>}
          {item.status && <span className="mb-1 block text-[11px] font-medium text-muted-foreground">{item.status === 'answered' ? 'Trả lời có nguồn' : 'Chưa thể trả lời'}</span>}
          <p className="whitespace-pre-wrap">{item.content}</p>
          {item.sources && item.sources.length > 0 && <div className="mt-2 border-t pt-2 text-xs">
            <strong>Nguồn kiểm tra</strong>
            <ul>{item.sources.map((source) => <li key={source.id}><a className="font-medium text-primary underline-offset-2 hover:underline" href={source.url}>{source.citation} {source.title}</a></li>)}</ul>
          </div>}
        </div>)}
        {busy && <p className="text-sm text-muted-foreground" role="status">Trợ lý đang trả lời…</p>}
        <div ref={endRef} />
      </div>
      {isMockMode && <p className="border-t px-4 py-2 text-xs text-muted-foreground">Trợ lý cần backend. Hãy chuyển sang chế độ HTTP để trò chuyện.</p>}
      {modelError && <p className="border-t px-4 py-2 text-xs text-destructive" role="alert">Không tải được thông tin model: {modelError}</p>}
      {error && <div className="border-t px-4 py-2 text-xs text-destructive" role="alert"><p>Không hoàn tất câu trả lời: {error.message}</p><button type="button" className="mr-3 font-medium underline" disabled={busy || !canChat || !draft.trim()} onClick={() => formRef.current?.requestSubmit()}>Thử lại</button><button type="button" className="font-medium underline" onClick={() => { setError(null); inputRef.current?.focus() }}>Sửa câu hỏi</button></div>}
      <div className="flex items-center gap-2 border-t px-4 pt-3 text-xs">
        <span className="text-muted-foreground">Model</span>
        <span>{model ? `${model.name} · Ollama${model.available ? '' : ' (chưa cấu hình)'}` : 'Đang tải model…'}</span>
      </div>
      <form ref={formRef} className="flex items-end gap-2 p-3" onSubmit={send}>
        <label htmlFor="chat-question" className="sr-only">Câu hỏi cho trợ lý</label>
        <Textarea id="chat-question" className="max-h-32 min-h-11 flex-1 resize-none text-sm" ref={inputRef} value={draft} onChange={(event) => setDraft(event.target.value)} maxLength={1000} rows={2} placeholder="Bạn muốn hỏi gì?" disabled={busy || isMockMode} onKeyDown={(event) => {
          if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); event.currentTarget.form?.requestSubmit() }
        }} />
        <Button type="submit" size="icon-lg" aria-label="Gửi câu hỏi" disabled={busy || isMockMode || !canChat || !draft.trim()}><Send /></Button>
      </form>
      <p className="px-4 pb-3 text-[11px] text-muted-foreground">Hãy kiểm tra trang dự án; kết quả tìm được có thể chỉ là một phần danh sách.</p>
    </section>}
    <Button type="button" ref={toggleRef} variant="cta" size="xl" className="rounded-full shadow-lg" onClick={() => setOpen((value) => !value)} aria-expanded={open} aria-controls="chat-panel" aria-label={open ? 'Đóng trợ lý GOM NẮNG' : 'Mở trợ lý GOM NẮNG'}>
      {open ? <X /> : <><MessageCircle />Hỏi trợ lý</>}
    </Button>
  </div>
}
