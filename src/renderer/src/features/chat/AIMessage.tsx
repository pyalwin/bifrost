import type { Message } from '../../types'
import { ThinkingIndicator } from './ThinkingIndicator'
import { ToolUsageItem } from './ToolUsageItem'
import { MarkdownRenderer } from './MarkdownRenderer'

interface Props {
  message: Message
  theme: 'light' | 'dark'
}

export function AIMessage({ message, theme }: Props) {
  const summaryTool = message.tools?.find(t => t.action === 'Explored')
  const detailTools = message.tools?.filter(t => t.action !== 'Explored') ?? []

  return (
    <div className="mb-5">
      {message.content && (
        <div className="text-sm leading-[1.65] text-foreground mb-3.5">
          <MarkdownRenderer content={message.content} theme={theme} />
        </div>
      )}
      {message.thinkingTime && (
        <ThinkingIndicator seconds={message.thinkingTime} />
      )}
      {summaryTool && (
        <div className="text-[13px] text-muted-foreground mb-2">
          {summaryTool.action} {summaryTool.target}
        </div>
      )}
      {detailTools.length > 0 && (
        <div className="ml-2 flex flex-col mb-4">
          {detailTools.map((tool, i) => (
            <ToolUsageItem key={i} tool={tool} />
          ))}
        </div>
      )}
    </div>
  )
}
