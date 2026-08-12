import DOMPurify from 'dompurify'

interface Props {
  content: string
}

export default function RichContent({ content }: Props) {
  const html = (content || '')
    .split('\n\n')
    .map((block) => {
      const trimmed = block.trim()
      if (!trimmed) return ''

      // Unordered list
      if (trimmed.startsWith('- ')) {
        const items = trimmed
          .split('\n')
          .filter((l) => l.trim().startsWith('- '))
          .map((l) => l.trim().slice(2))
          .map((item) => `<li class="flex items-start gap-2 text-[var(--text-secondary)] leading-relaxed mb-1"><span class="w-1.5 h-1.5 rounded-full bg-[var(--accent)] flex-shrink-0 mt-2.5"></span>${escapeHtml(item)}</li>`)
          .join('')
        return `<ul class="space-y-1 my-4">${items}</ul>`
      }

      // Ordered list
      if (/^\d+\.\s/.test(trimmed)) {
        const items = trimmed
          .split('\n')
          .filter((l) => /^\d+\.\s/.test(l.trim()))
          .map((l) => l.trim().replace(/^\d+\.\s/, ''))
          .map((item) => `<li class="flex items-start gap-2 text-[var(--text-secondary)] leading-relaxed mb-1"><span class="w-5 h-5 rounded-full bg-[var(--accent-subtle)] text-[var(--accent)] text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">${item.match(/^\d+/)?.[0] || '•'}</span>${escapeHtml(item.replace(/^\d+/, '').replace(/^\.\s/, ''))}</li>`)
          .join('')
        return `<ol class="space-y-1 my-4">${items}</ol>`
      }

      // Bold headings (lines ending with :)
      if (trimmed.endsWith(':')) {
        return `<h4 class="font-[var(--font-heading)] text-sm font-bold text-[var(--accent)] mt-6 mb-2">${escapeHtml(trimmed)}</h4>`
      }

      // Regular paragraph
      return `<p class="text-[var(--text-secondary)] leading-relaxed mb-5 text-base md:text-lg">${escapeHtml(trimmed)}</p>`
    })
    .join('')

  return (
    <div
      className="rich-content"
      dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(html) }}
    />
  )
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
    .replace(/\*\*(.+?)\*\*/g, '<strong class="font-bold text-[var(--text)]">$1</strong>')
    .replace(/\*(.+?)\*/g, '<em class="italic">$1</em>')
    .replace(/`(.+?)`/g, '<code class="px-1.5 py-0.5 rounded bg-[var(--accent-subtle)] text-[var(--accent)] text-sm font-mono">$1</code>')
}
