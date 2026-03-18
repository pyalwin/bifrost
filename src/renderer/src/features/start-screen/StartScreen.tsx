import { FolderOpen, History } from 'lucide-react'

interface Props {
  onNewSession: () => void
  onResumeSession: () => void
}

export function StartScreen({ onNewSession, onResumeSession }: Props) {
  return (
    <div className="h-full flex flex-col items-center justify-center gap-6">
      <div className="text-center mb-4">
        <h1 className="text-2xl font-bold mb-2">Claude Code</h1>
        <p className="text-muted-foreground text-sm">
          Start a new session or resume where you left off
        </p>
      </div>
      <div className="flex gap-4">
        <button
          onClick={onNewSession}
          className="flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:opacity-80 transition-opacity"
        >
          <FolderOpen className="w-4 h-4" />
          New Session
        </button>
        <button
          onClick={onResumeSession}
          className="flex items-center gap-2 px-6 py-3 border border-border rounded-lg text-sm font-medium hover:bg-muted transition-colors"
        >
          <History className="w-4 h-4" />
          Resume Session
        </button>
      </div>
    </div>
  )
}
