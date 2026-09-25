import { CHAT_GUIDES } from '@gomnang/domain/chat-knowledge.ts'

export default function HelpPage() {
  return <div className="help-page">
    <h1>Hướng dẫn GOM NẮNG</h1>
    <p>Các mục dưới đây là nguồn hướng dẫn mà trợ lý có thể dẫn lại khi trả lời.</p>
    {CHAT_GUIDES.map((guide) => <section className="panel" id={guide.anchor} key={guide.id}>
      <h2>{guide.title}</h2>
      <p>{guide.text}</p>
    </section>)}
  </div>
}
