import type { Message } from '../../types'
import { MessageList } from './MessageList'
import { InputBox } from './InputBox'
import { ToolApprovalBanner } from './ToolApprovalBanner'

interface Props {
  messages: Message[]
  pendingApproval: { id: string; toolName: string; input: Record<string, unknown> } | null
  onApprove: (id: string) => void
  onDeny: (id: string) => void
  onSend: (text: string) => void
  theme: 'light' | 'dark'
  disabled: boolean
}

export function ChatPanel({
  messages,
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
      <InputBox onSend={onSend} disabled={disabled} />
    </div>
  )
}
