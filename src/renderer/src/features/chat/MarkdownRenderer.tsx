import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { CodeBlock } from './CodeBlock'
import { MermaidBlock } from './MermaidBlock'

interface Props {
  content: string
  theme: 'light' | 'dark'
}

export function MarkdownRenderer({ content, theme }: Props) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        code({ className, children, ...props }) {
          const match = /language-(\w+)/.exec(className || '')
          const code = String(children).replace(/\n$/, '')
          if (match) {
            const lang = match[1]
            if (lang === 'mermaid') return <MermaidBlock code={code} theme={theme} />
            return <CodeBlock code={code} language={lang} theme={theme} />
          }
          return (
            <code
              className="px-1.5 py-0.5 rounded bg-muted text-[13px] font-mono"
              {...props}
            >
              {children}
            </code>
          )
        },
        p: ({ children }) => <p className="mb-3 last:mb-0">{children}</p>,
        h1: ({ children }) => <h1 className="text-xl font-bold mb-3 mt-4">{children}</h1>,
        h2: ({ children }) => <h2 className="text-lg font-bold mb-2 mt-3">{children}</h2>,
        h3: ({ children }) => (
          <h3 className="text-base font-semibold mb-2 mt-3">{children}</h3>
        ),
        ul: ({ children }) => <ul className="list-disc pl-6 mb-3">{children}</ul>,
        ol: ({ children }) => <ol className="list-decimal pl-6 mb-3">{children}</ol>,
        li: ({ children }) => <li className="mb-1">{children}</li>,
        a: ({ href, children }) => (
          <a
            href={href}
            className="text-blue-600 dark:text-blue-400 underline"
            target="_blank"
            rel="noopener noreferrer"
          >
            {children}
          </a>
        ),
        blockquote: ({ children }) => (
          <blockquote className="border-l-2 border-border pl-4 italic text-muted-foreground my-3">
            {children}
          </blockquote>
        ),
        table: ({ children }) => (
          <div className="overflow-x-auto my-3">
            <table className="min-w-full border border-border text-[13px]">{children}</table>
          </div>
        ),
        th: ({ children }) => (
          <th className="border border-border px-3 py-1.5 bg-muted font-semibold text-left">
            {children}
          </th>
        ),
        td: ({ children }) => (
          <td className="border border-border px-3 py-1.5">{children}</td>
        )
      }}
    >
      {content}
    </ReactMarkdown>
  )
}
