import type { Message } from '../../types'
import { ToolUsageItem } from './ToolUsageItem'
import { MarkdownRenderer } from './MarkdownRenderer'
import { StreamingIndicator } from './StreamingIndicator'

interface Props {
  message: Message
  theme: 'light' | 'dark'
}

function ThinkingDots() {
  return (
    <div className="flex items-center gap-3 py-2 animate-fade-in">
      <div className="flex items-center gap-[5px]">
        <span className="thinking-dot block w-[5px] h-[5px] rounded-full bg-muted-foreground/60" />
        <span className="thinking-dot block w-[5px] h-[5px] rounded-full bg-muted-foreground/60" />
        <span className="thinking-dot block w-[5px] h-[5px] rounded-full bg-muted-foreground/60" />
      </div>
      <span className="text-[13px] text-muted-foreground">Thinking</span>
    </div>
  )
}

function WorkingShimmer() {
  return (
    <div className="mt-2 space-y-2 animate-fade-in">
      <div className="shimmer-line h-[10px] w-3/4" />
      <div className="shimmer-line h-[10px] w-1/2" />
    </div>
  )
}

export function AIMessage({ message, theme }: Props) {
  const tools = message.tools ?? []
  const hasContent = !!message.content
  const isThinkingOnly = message.isThinking && !hasContent && tools.length === 0

  return (
    <div className="mb-5 animate-fade-in-up">
      {/* Thinking state — animated dots shown immediately */}
      {isThinkingOnly && <ThinkingDots />}

      {/* Intermediary section — tools, visually grouped */}
      {tools.length > 0 && (
        <div className="mb-3">
          {message.thinkingTime && (
            <div className="text-[13px] text-muted-foreground mb-1.5 animate-fade-in">
              Thought {message.thinkingTime}s
            </div>
          )}

          <div className="flex flex-col stagger-children">
            {tools.map((tool, i) => (
              <ToolUsageItem key={i} tool={tool} />
            ))}
          </div>

          {/* Shimmer loading — after tools, before text */}
          {message.isStreaming && !hasContent && <WorkingShimmer />}
        </div>
      )}

      {/* Response text — markdown rendered, fades in */}
      {hasContent && (
        <div className="text-sm leading-[1.65] text-foreground animate-fade-in">
          <MarkdownRenderer content={message.content} theme={theme} />
          {message.isStreaming && <StreamingIndicator />}
        </div>
      )}
    </div>
  )
}
