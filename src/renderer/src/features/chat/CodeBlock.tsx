import { useState, useEffect } from 'react'
import { Copy, Check } from 'lucide-react'
import { getHighlighter } from '../diff/highlighter'

interface Props {
  code: string
  language: string
  theme: 'light' | 'dark'
}

export function CodeBlock({ code, language, theme }: Props) {
  const [html, setHtml] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const shikiTheme = theme === 'dark' ? 'github-dark' : 'github-light'

  useEffect(() => {
    getHighlighter().then((h) => {
      const loadedLangs = h.getLoadedLanguages()
      if (loadedLangs.includes(language as never)) {
        const result = h.codeToHtml(code, { lang: language, theme: shikiTheme })
        setHtml(result)
      }
    })
  }, [code, language, shikiTheme])

  const handleCopy = (): void => {
    navigator.clipboard.writeText(code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="relative my-3 rounded-md border border-border overflow-hidden">
      <div className="flex items-center justify-between px-3 py-1.5 bg-muted text-[11px] text-muted-foreground">
        <span>{language}</span>
        <button onClick={handleCopy} className="hover:text-foreground transition-colors">
          {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
        </button>
      </div>
      {html ? (
        <div
          className="overflow-x-auto text-[13px] [&_pre]:!bg-transparent [&_pre]:!p-3 [&_pre]:!m-0"
          dangerouslySetInnerHTML={{ __html: html }}
        />
      ) : (
        <pre className="p-3 text-[13px] overflow-x-auto">
          <code>{code}</code>
        </pre>
      )}
    </div>
  )
}
