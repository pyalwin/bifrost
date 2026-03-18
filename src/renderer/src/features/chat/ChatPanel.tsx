import type { Message } from '../../types'
import { MessageList } from './MessageList'
import { InputBox } from './InputBox'
import { ToolApprovalBanner } from './ToolApprovalBanner'
import { StreamingIndicator } from './StreamingIndicator'

interface Props {
  messages: Message[]
  streamingText: string
  pendingApproval: { id: string; toolName: string; input: Record<string, unknown> } | null
  onApprove: (id: string) => void
  onDeny: (id: string) => void
  onSend: (text: string) => void
  theme: 'light' | 'dark'
  disabled: boolean
}

export function ChatPanel({
  messages,
  streamingText,
  pendingApproval,
  onApprove,
  onDeny,
  onSend,
  theme,
  disabled
}: Props) {
  return (
    <div className="h-full flex flex-col">
      {pendingApproval && (
        <ToolApprovalBanner
          toolName={pendingApproval.toolName}
          input={pendingApproval.input}
          onApprove={() => onApprove(pendingApproval.id)}
          onDeny={() => onDeny(pendingApproval.id)}
        />
      )}
      <MessageList messages={messages} theme={theme} />
      {streamingText && (
        <div className="px-6 pb-2 text-sm leading-[1.65] text-foreground">
          {streamingText}
          <StreamingIndicator />
        </div>
      )}
      <InputBox onSend={onSend} disabled={disabled} />
    </div>
  )
}
