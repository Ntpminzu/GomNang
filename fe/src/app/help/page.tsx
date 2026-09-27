import { CHAT_GUIDES } from '@gomnang/domain/chat-knowledge.ts'
import { PageHeader } from '@/presentation/components/index.ts'

export default function HelpPage() {
  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        eyebrow="Trợ giúp"
        title="Hướng dẫn GOM NẮNG"
        description="Các mục dưới đây cũng là nguồn mà trợ lý dẫn lại khi trả lời — bấm vào nguồn trong câu trả lời sẽ mở đúng mục."
      />
      <nav aria-label="Mục lục hướng dẫn" className="mb-6 flex flex-wrap gap-2">
        {CHAT_GUIDES.map((guide) => (
          <a key={guide.id} href={`#${guide.anchor}`} className="rounded-full border bg-card px-3 py-1.5 text-sm hover:bg-muted">
            {guide.title}
          </a>
        ))}
      </nav>
      <div className="space-y-4">
        {CHAT_GUIDES.map((guide) => (
          <section key={guide.id} id={guide.anchor} className="scroll-mt-24 rounded-2xl border bg-card p-5" aria-labelledby={`${guide.anchor}-title`}>
            <h2 id={`${guide.anchor}-title`} className="mb-2 font-semibold">
              {guide.title}
            </h2>
            <p className="text-pretty text-muted-foreground">{guide.text}</p>
          </section>
        ))}
      </div>
    </div>
  )
}
