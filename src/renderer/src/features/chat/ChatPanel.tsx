import type { Message } from '../../types'
import { MessageList } from './MessageList'

interface Props { messages: Message[] }

export function ChatPanel({ messages }: Props) {
  return (
    <div className="h-full flex flex-col">
      <MessageList messages={messages} />
    </div>
  )
}
