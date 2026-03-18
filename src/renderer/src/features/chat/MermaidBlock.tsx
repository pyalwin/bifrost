import { useState, useEffect, useRef } from 'react'
import mermaid from 'mermaid'
import { Code, Image } from 'lucide-react'

interface Props {
  code: string
  theme: 'light' | 'dark'
}

export function MermaidBlock({ code, theme }: Props) {
  const [svg, setSvg] = useState<string | null>(null)
  const [showSource, setShowSource] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const idRef = useRef(`mermaid-${Math.random().toString(36).slice(2)}`)

  useEffect(() => {
    mermaid.initialize({
      startOnLoad: false,
      theme: theme === 'dark' ? 'dark' : 'default',
      securityLevel: 'loose'
    })
    mermaid
      .render(idRef.current, code)
      .then(({ svg: rendered }) => {
        setSvg(rendered)
        setError(null)
      })
      .catch((err: Error) => {
        setError(err.message)
        setSvg(null)
      })
  }, [code, theme])

  return (
    <div className="my-3 rounded-md border border-border overflow-hidden">
      <div className="flex items-center justify-between px-3 py-1.5 bg-muted text-[11px] text-muted-foreground">
        <span>mermaid</span>
        <button
          onClick={() => setShowSource(!showSource)}
          className="hover:text-foreground transition-colors"
        >
          {showSource ? (
            <Image className="w-3.5 h-3.5" />
          ) : (
            <Code className="w-3.5 h-3.5" />
          )}
        </button>
      </div>
      {showSource ? (
        <pre className="p-3 text-[13px] overflow-x-auto">
          <code>{code}</code>
        </pre>
      ) : error ? (
        <div className="p-3 text-[13px] text-diff-removed-text">{error}</div>
      ) : svg ? (
        <div className="p-3 overflow-x-auto" dangerouslySetInnerHTML={{ __html: svg }} />
      ) : (
        <div className="p-3 text-[13px] text-muted-foreground">Rendering...</div>
      )}
    </div>
  )
}
