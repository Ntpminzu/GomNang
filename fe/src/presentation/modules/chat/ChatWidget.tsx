'use client'

import { useEffect, useRef, useState, type FormEvent } from 'react'
import { askChat, listChatModels, type ChatTurn } from '../../../libs/api/chat.ts'
import type { ChatModelOption, ChatProvider, ChatSource } from '@gomnang/domain/types.ts'
import { toApiError } from '../../../libs/api/errors.ts'
import { isMockMode } from '../../../libs/config/env.ts'
import { useSession } from '../../providers/SessionProvider.tsx'

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
      setMessages((current) => [...current, { role: 'assistant', content: answer.reply, modelName: choice.name, sources: answer.sources }])
    } catch (err) {
      setMessages((current) => current.slice(0, -1))
      setDraft(message)
      setError(toApiError(err).message)
    } finally {
      setBusy(false)
    }
  }

  return <div className="chat-widget">
    {open && <section className="chat-panel" id="chat-panel" aria-label="Trợ lý GOM NẮNG">
      <div className="chat-header">
        <div><strong>Trợ lý GOM NẮNG</strong><small>Hỗ trợ thông tin dự án</small></div>
        <button type="button" className="chat-close" onClick={() => { setOpen(false); toggleRef.current?.focus() }} aria-label="Đóng trợ lý">×</button>
      </div>
      <div className="chat-messages" aria-live="polite" aria-relevant="additions text">
        {messages.length === 0 && <p className="chat-intro">Xin chào! Bạn có thể hỏi cách tạo dự án, đóng góp hoặc tìm dự án công khai.</p>}
        {messages.map((item, index) => <div key={index} className={`chat-bubble chat-bubble-${item.role}`}>
          <span className="sr-only">{item.role === 'user' ? 'Bạn: ' : 'Trợ lý: '}</span>
          {item.modelName && <span className="chat-source">{item.modelName}</span>}
          <p className="chat-bubble-text">{item.content}</p>
          {item.sources && item.sources.length > 0 && <div className="chat-citations">
            <strong>Nguồn kiểm tra</strong>
            <ul>{item.sources.map((source) => <li key={source.id}><a href={source.url}>{source.citation} {source.title}</a><small>{source.id}</small></li>)}</ul>
          </div>}
        </div>)}
        {busy && <p className="chat-status" role="status">Trợ lý đang trả lời…</p>}
        <div ref={endRef} />
      </div>
      {isMockMode && <p className="chat-notice">Trợ lý cần backend. Hãy chuyển sang chế độ HTTP để trò chuyện.</p>}
      {modelsError && <p className="chat-error" role="alert">Không tải được danh sách model: {modelsError}</p>}
      {error && <p className="chat-error" role="alert">{error} <button type="button" onClick={() => { setError(null); inputRef.current?.focus() }}>Sửa câu hỏi</button></p>}
      <div className="chat-model-field">
        <label htmlFor="chat-model">Model</label>
        <select id="chat-model" value={selectedModel} onChange={(event) => setSelectedModel(event.target.value as ChatProvider)} disabled={busy || isMockMode || models.length === 0}>
          {models.length === 0 && <option value="ollama">Đang tải model…</option>}
          {models.map((option) => <option key={option.id} value={option.id} disabled={!option.available || (option.id === 'gemini' && !user)}>{option.id === 'ollama' ? 'Ollama' : 'Gemini'} · {option.name}{!option.available ? ' (chưa cấu hình)' : option.id === 'gemini' && !user ? ' (cần đăng nhập)' : ''}</option>)}
        </select>
      </div>
      <form className="chat-form" onSubmit={send}>
        <label htmlFor="chat-question" className="sr-only">Câu hỏi cho trợ lý</label>
        <textarea id="chat-question" ref={inputRef} value={draft} onChange={(event) => setDraft(event.target.value)} maxLength={1000} rows={2} placeholder="Bạn muốn hỏi gì?" disabled={busy || isMockMode} onKeyDown={(event) => {
          if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); event.currentTarget.form?.requestSubmit() }
        }} />
        <button type="submit" className="btn btn-primary" disabled={busy || isMockMode || !canUseChoice || !draft.trim()}>Gửi</button>
      </form>
      <p className="chat-footnote">Câu trả lời do AI tạo. Hãy kiểm tra thông tin trên trang dự án.</p>
    </section>}
    <button type="button" ref={toggleRef} className="chat-toggle" onClick={() => setOpen((value) => !value)} aria-expanded={open} aria-controls="chat-panel" aria-label={open ? 'Đóng trợ lý GOM NẮNG' : 'Mở trợ lý GOM NẮNG'}>
      {open ? '×' : 'Hỏi trợ lý'}
    </button>
  </div>
}
