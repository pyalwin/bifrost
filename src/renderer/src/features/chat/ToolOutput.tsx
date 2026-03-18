import { useState } from 'react'
import { ChevronDown, ChevronRight, Copy, Check } from 'lucide-react'

interface Props {
  output: string
  maxLines?: number
}

export function ToolOutput({ output, maxLines = 10 }: Props) {
  const lines = output.split('\n')
  const isLong = lines.length > maxLines
  const [expanded, setExpanded] = useState(!isLong)
  const [copied, setCopied] = useState(false)

  const displayText = expanded ? output : lines.slice(0, maxLines).join('\n') + '\n...'

  const handleCopy = (): void => {
    navigator.clipboard.writeText(output)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="my-2 rounded-md border border-border overflow-hidden">
      <div className="flex items-center justify-between px-3 py-1 bg-muted text-[11px] text-muted-foreground">
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-1 hover:text-foreground"
        >
          {isLong &&
            (expanded ? (
              <ChevronDown className="w-3 h-3" />
            ) : (
              <ChevronRight className="w-3 h-3" />
            ))}
          <span>Output ({lines.length} lines)</span>
        </button>
        <button onClick={handleCopy} className="hover:text-foreground transition-colors">
          {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
        </button>
      </div>
      <pre className="p-3 text-[12px] font-mono overflow-x-auto max-h-[300px] overflow-y-auto">
        {displayText}
      </pre>
    </div>
  )
}
