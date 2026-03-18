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
  const hasContent = !!message.content
  const isThinkingOnly = message.isThinking && !hasContent && tools.length === 0

  return (
    <div className="mb-5">
      {/* Thinking state — spinner shown immediately when Claude starts processing */}
      {isThinkingOnly && (
        <div className="flex items-center gap-2 text-[13px] text-muted-foreground py-1">
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
          <span>Thinking...</span>
        </div>
      )}

      {/* Intermediary section — tools and thinking, styled distinctly from response */}
      {tools.length > 0 && (
        <div className="mb-3">
          {/* Thinking time if available */}
          {message.thinkingTime && (
            <div className="text-[13px] text-muted-foreground mb-1.5">
              Thought {message.thinkingTime}s
            </div>
          )}

          {/* Tool items — flat muted rows, matching the original mockup */}
          <div className="flex flex-col">
            {tools.map((tool, i) => (
              <ToolUsageItem key={i} tool={tool} />
            ))}
          </div>

          {/* Working indicator — after tools but before text arrives */}
          {message.isStreaming && !hasContent && (
            <div className="flex items-center gap-2 text-[13px] text-muted-foreground mt-2">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              <span>Working...</span>
            </div>
          )}
        </div>
      )}

      {/* Final response text — rendered as markdown, visually distinct */}
      {hasContent && (
        <div className="text-sm leading-[1.65] text-foreground">
          <MarkdownRenderer content={message.content} theme={theme} />
          {message.isStreaming && <StreamingIndicator />}
        </div>
      )}
    </div>
  )
}
