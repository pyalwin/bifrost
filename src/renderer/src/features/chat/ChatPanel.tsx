import { Loader2 } from 'lucide-react'
import type { ConnectionState, Message } from '../../types'
import { MessageList } from './MessageList'
import { InputBox } from './InputBox'
import { ToolApprovalBanner } from './ToolApprovalBanner'

interface Props {
  messages: Message[]
  pendingApproval: { id: string; toolName: string; input: Record<string, unknown> } | null
  onApprove: (id: string) => void
  onDeny: (id: string) => void
  onSend: (text: string, images?: Array<{ base64: string; mediaType: string; name: string }>) => void
  onAnswerQuestion?: (toolUseId: string, answer: string) => void
  onOpenFile?: (filePath: string) => void
  theme: 'light' | 'dark'
  connectionState: ConnectionState
  model: string
  onModelChange: (model: string) => void
  switchingModelLabel?: string | null
  isSwitchingModel?: boolean
  hasSession?: boolean
  onNewSession?: () => void
}

export function ChatPanel({
  messages,
  pendingApproval,
  onApprove,
  onDeny,
  onSend,
  onAnswerQuestion,
  onOpenFile,
  theme,
  connectionState,
  model,
  onModelChange,
  switchingModelLabel,
  isSwitchingModel = false,
  hasSession,
  onNewSession,
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
      {switchingModelLabel && (
        <div className="mx-4 mt-3 px-4 py-3 bg-muted/60 border border-border rounded-md flex items-center gap-3 animate-fade-in-up">
          <Loader2 className="w-4 h-4 animate-spin text-muted-foreground shrink-0" />
          <div className="min-w-0">
            <div className="text-[13px] font-semibold text-foreground">Switching model</div>
            <div className="text-[12px] text-muted-foreground">
              Reconnecting this conversation with {switchingModelLabel}{connectionState === 'connecting' ? '.' : '...'} 
            </div>
          </div>
        </div>
      )}
      <MessageList
        messages={messages}
        theme={theme}
        onSend={onSend}
        onAnswerQuestion={onAnswerQuestion}
        onOpenFile={onOpenFile}
        hasSession={hasSession}
        onNewSession={onNewSession}
      />
      {hasSession && (
        <InputBox
          onSend={onSend}
          connectionState={connectionState}
          model={model}
          onModelChange={onModelChange}
          isSwitchingModel={isSwitchingModel}
        />
      )}
    </div>
  )
}
