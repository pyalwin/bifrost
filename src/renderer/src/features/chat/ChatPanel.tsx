import type { Message } from '../../types'
import { MessageList } from './MessageList'
import { InputBox } from './InputBox'

interface Props { messages: Message[] }

export function ChatPanel({ messages }: Props) {
  const handleSend = (text: string) => {
    console.log('Send:', text)
  }

  return (
    <div className="h-full flex flex-col">
      <MessageList messages={messages} />
      <InputBox onSend={handleSend} />
    </div>
  )
}
