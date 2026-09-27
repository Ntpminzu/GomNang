'use client'

import { useEffect, useRef, useState, type FormEvent } from 'react'
import { askChat, listChatModels, type ChatTurn } from '../../../libs/api/chat.ts'
import type { ChatModelOption, ChatProvider, ChatSource } from '@gomnang/domain/types.ts'
import { toApiError } from '../../../libs/api/errors.ts'
import { isMockMode } from '../../../libs/config/env.ts'
import { useSession } from '../../providers/SessionProvider.tsx'
import { MessageCircle, Send, X } from 'lucide-react'
import { Button } from '../../components/ui/button.tsx'
import { NativeSelect, NativeSelectOption } from '../../components/ui/native-select.tsx'
import { Textarea } from '../../components/ui/textarea.tsx'
import { cn } from '../../../libs/utils/cn.ts'

export function ChatWidget() {
  const { user } = useSession()
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState('')
  const [messages, setMessages] = useState<(ChatTurn & { modelName?: string; sources?: ChatSource[] })[]>([])
  const [models, setModels] = useState<ChatModelOption[]>([])
  const [selectedModel, setSelectedModel] = useState<ChatProvider>('ollama')
  const [modelsError, setModelsError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const toggleRef = useRef<HTMLButtonElement>(null)
  const endRef = useRef<HTMLDivElement>(null)

  useEffect(() => { if (open) inputRef.current?.focus() }, [open])
  useEffect(() => { if (open) endRef.current?.scrollIntoView({ block: 'end' }) }, [messages, busy, open])
  useEffect(() => {
    if (!open || isMockMode) return
    let active = true
    listChatModels().then((options) => { if (active) { setModels(options); setModelsError(null) } })
      .catch((err) => { if (active) setModelsError(toApiError(err).message) })
    return () => { active = false }
  }, [open])

  const choice = models.find((option) => option.id === selectedModel)
  const canUseChoice = choice?.available && (selectedModel !== 'gemini' || user !== null)

  async function send(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const message = draft.trim()
    if (!message || busy || isMockMode || !canUseChoice) return
    const history = messages.slice(-8).map(({ role, content }) => ({ role, content }))
    setDraft('')
    setError(null)
    setMessages((current) => [...current, { role: 'user', content: message }])
    setBusy(true)
    try {
      const answer = await askChat(message, history, selectedModel)
      setMessages((current) => [...current, { role: 'assistant', content: answer.reply, modelName: answer.generatedByModel ? choice.name : undefined, sources: answer.sources }])
    } catch (err) {
      setMessages((current) => current.slice(0, -1))
      setDraft(message)
      setError(toApiError(err).message)
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
      {modelsError && <p className="border-t px-4 py-2 text-xs text-destructive" role="alert">Không tải được danh sách model: {modelsError}</p>}
      {error && <p className="border-t px-4 py-2 text-xs text-destructive" role="alert">{error} <button type="button" className="font-medium underline" onClick={() => { setError(null); inputRef.current?.focus() }}>Sửa câu hỏi</button></p>}
      <div className="flex items-center gap-2 border-t px-4 pt-3 text-xs">
        <label htmlFor="chat-model" className="text-muted-foreground">Model</label>
        <NativeSelect id="chat-model" size="sm" className="flex-1" value={selectedModel} onChange={(event) => setSelectedModel(event.target.value as ChatProvider)} disabled={busy || isMockMode || models.length === 0}>
          {models.length === 0 && <NativeSelectOption value="ollama">Đang tải model…</NativeSelectOption>}
          {models.map((option) => <NativeSelectOption key={option.id} value={option.id} disabled={!option.available || (option.id === 'gemini' && !user)}>{option.id === 'ollama' ? 'Ollama' : 'Gemini'} · {option.name}{!option.available ? ' (chưa cấu hình)' : option.id === 'gemini' && !user ? ' (cần đăng nhập)' : ''}</NativeSelectOption>)}
        </NativeSelect>
      </div>
      <form className="flex items-end gap-2 p-3" onSubmit={send}>
        <label htmlFor="chat-question" className="sr-only">Câu hỏi cho trợ lý</label>
        <Textarea id="chat-question" className="max-h-32 min-h-11 flex-1 resize-none text-sm" ref={inputRef} value={draft} onChange={(event) => setDraft(event.target.value)} maxLength={1000} rows={2} placeholder="Bạn muốn hỏi gì?" disabled={busy || isMockMode} onKeyDown={(event) => {
          if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); event.currentTarget.form?.requestSubmit() }
        }} />
        <Button type="submit" size="icon-lg" aria-label="Gửi câu hỏi" disabled={busy || isMockMode || !canUseChoice || !draft.trim()}><Send /></Button>
      </form>
      <p className="px-4 pb-3 text-[11px] text-muted-foreground">Hãy kiểm tra thông tin theo nguồn và trang dự án.</p>
    </section>}
    <Button type="button" ref={toggleRef} variant="cta" size="xl" className="rounded-full shadow-lg" onClick={() => setOpen((value) => !value)} aria-expanded={open} aria-controls="chat-panel" aria-label={open ? 'Đóng trợ lý GOM NẮNG' : 'Mở trợ lý GOM NẮNG'}>
      {open ? <X /> : <><MessageCircle />Hỏi trợ lý</>}
    </Button>
  </div>
}
