import { MessageSquare } from 'lucide-react'

export function ChatEmptyState() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground gap-3">
      <MessageSquare className="w-10 h-10 opacity-30" />
      <span className="text-sm">Start a conversation</span>
    </div>
  )
}
