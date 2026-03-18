import type { Message } from '../../types'
import { ToolUsageItem } from './ToolUsageItem'
import { MarkdownRenderer } from './MarkdownRenderer'
import { StreamingIndicator } from './StreamingIndicator'
import { Loader2 } from 'lucide-react'

interface Props {
  message: Message
  theme: 'light' | 'dark'
}

export function AIMessage({ message, theme }: Props) {
  const tools = message.tools ?? []

  return (
    <div className="mb-5">
      {/* Thinking state — shown when Claude is processing before any text */}
      {message.isThinking && !message.content && tools.length === 0 && (
        <div className="flex items-center gap-2 text-[13px] text-muted-foreground mb-2">
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
          <span>Thinking...</span>
        </div>
      )}

      {/* Tool usage items — shown inline as they happen */}
      {tools.length > 0 && (
        <div className="ml-2 flex flex-col mb-3">
          {tools.map((tool, i) => (
            <ToolUsageItem key={i} tool={tool} />
          ))}
        </div>
      )}

      {/* Main content — rendered as markdown */}
      {message.content && (
        <div className="text-sm leading-[1.65] text-foreground">
          <MarkdownRenderer content={message.content} theme={theme} />
          {message.isStreaming && <StreamingIndicator />}
        </div>
      )}

      {/* Thinking state after tools but before text */}
      {message.isThinking && !message.content && tools.length > 0 && (
        <div className="flex items-center gap-2 text-[13px] text-muted-foreground mt-1">
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
          <span>Working...</span>
        </div>
      )}
    </div>
  )
}
