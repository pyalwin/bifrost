import { Terminal } from 'lucide-react'

export function ChatEmptyState() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground gap-4 animate-fade-in">
      <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center">
        <Terminal className="w-6 h-6 opacity-40" />
      </div>
      <div className="text-center">
        <p className="text-sm font-medium text-foreground/40">Start a conversation</p>
        <p className="text-xs text-muted-foreground/60 mt-1">Ask Claude to explore, edit, or explain code</p>
      </div>
    </div>
  )
}
