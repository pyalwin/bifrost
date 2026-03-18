import type { Message } from '../../types'
import { UserMessage } from './UserMessage'
import { AIMessage } from './AIMessage'
import { ChatEmptyState } from './EmptyState'
import { useAutoScroll } from '../../hooks/use-auto-scroll'

interface Props {
  messages: Message[]
  theme: 'light' | 'dark'
  onSend?: (text: string) => void
}

export function MessageList({ messages, theme, onSend }: Props) {
  const { ref, onScroll } = useAutoScroll<HTMLDivElement>([messages.length])

  if (messages.length === 0) return <ChatEmptyState onSuggestionClick={onSend} />

  return (
    <div ref={ref} onScroll={onScroll} className="flex-1 overflow-y-auto px-6 py-5">
      {messages.map((msg) =>
        msg.role === 'user' ? (
          <UserMessage key={msg.id} content={msg.content} />
        ) : (
          <AIMessage key={msg.id} message={msg} theme={theme} />
        )
      )}
    </div>
  )
}
