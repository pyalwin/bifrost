import { useState, useEffect } from 'react'
import { FolderOpen, History, Loader2, AlertCircle, ArrowLeft, MessageSquare, Folder } from 'lucide-react'
import type { SessionInfo } from '../../types'

interface Props {
  onNewSession: () => void
  onResumeSession: (sessionId: string, workingDir: string) => void
  isConnecting?: boolean
  error?: string | null
}

function timeAgo(timestamp: number): string {
  const seconds = Math.floor((Date.now() - timestamp) / 1000)
  if (seconds < 60) return 'just now'
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

function projectName(workingDir: string): string {
  return workingDir.split('/').filter(Boolean).pop() ?? workingDir
}

export function StartScreen({ onNewSession, onResumeSession, isConnecting, error }: Props) {
  const [showSessions, setShowSessions] = useState(false)
  const [sessions, setSessions] = useState<SessionInfo[]>([])
  const [loadingSessions, setLoadingSessions] = useState(false)

  useEffect(() => {
    if (showSessions) {
      setLoadingSessions(true)
      window.claude
        ?.listSessions()
        .then((result) => setSessions((result as SessionInfo[]) || []))
        .catch(() => setSessions([]))
        .finally(() => setLoadingSessions(false))
    }
  }, [showSessions])

  if (isConnecting) {
    return (
      <div className="h-full flex flex-col items-center justify-center gap-4 animate-fade-in">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">Connecting to Claude CLI...</p>
      </div>
    )
  }

  if (showSessions) {
    // Group sessions by project
    const grouped = new Map<string, SessionInfo[]>()
    for (const s of sessions) {
      const name = projectName(s.workingDir)
      const list = grouped.get(name) ?? []
      list.push(s)
      grouped.set(name, list)
    }

    return (
      <div className="h-full flex flex-col px-8 py-6 overflow-y-auto animate-fade-in">
        <div className="max-w-2xl mx-auto w-full">
          <div className="flex items-center gap-3 mb-6">
            <button
              onClick={() => setShowSessions(false)}
              className="w-8 h-8 flex items-center justify-center rounded-lg border border-border hover:bg-muted transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div>
              <h1 className="text-lg font-semibold">Resume Session</h1>
              <p className="text-xs text-muted-foreground">Pick a previous Claude session to continue</p>
            </div>
          </div>

          {error && (
            <div className="flex items-center gap-2 text-diff-removed-text text-sm bg-diff-removed-bg px-4 py-2 rounded-lg mb-4">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span className="break-all">{error}</span>
            </div>
          )}

          {loadingSessions && (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
            </div>
          )}

          {!loadingSessions && sessions.length === 0 && (
            <div className="text-center py-16 text-muted-foreground">
              <History className="w-8 h-8 mx-auto mb-2 opacity-30" />
              <p className="text-sm">No previous sessions found</p>
            </div>
          )}

          {!loadingSessions && [...grouped.entries()].map(([name, projectSessions]) => (
            <div key={name} className="mb-6">
              <div className="flex items-center gap-2 mb-2 text-[13px] text-muted-foreground">
                <Folder className="w-3.5 h-3.5" />
                <span className="font-medium">{name}</span>
                <span className="text-muted-foreground/50 text-[11px] truncate">{projectSessions[0].workingDir}</span>
              </div>
              <div className="space-y-1">
                {projectSessions.map((session) => (
                  <button
                    key={session.id}
                    onClick={() => onResumeSession(session.id, session.workingDir)}
                    className="w-full text-left px-4 py-3 border border-border rounded-lg hover:bg-muted transition-colors group"
                  >
                    <div className="flex items-start gap-3">
                      <MessageSquare className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm text-foreground truncate">
                          {session.firstMessage || 'New session'}
                        </div>
                        <div className="flex items-center gap-2 mt-1 text-[11px] text-muted-foreground">
                          <span>{timeAgo(session.timestamp)}</span>
                          <span className="text-muted-foreground/30">•</span>
                          <span className="font-mono">{session.id.slice(0, 8)}</span>
                        </div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col items-center justify-center gap-6 animate-fade-in">
      <div className="text-center mb-4">
        <h1 className="text-2xl font-bold mb-2">Claude Code</h1>
        <p className="text-muted-foreground text-sm">
          Start a new session or resume where you left off
        </p>
      </div>

      {error && (
        <div className="flex items-center gap-2 text-diff-removed-text text-sm bg-diff-removed-bg px-4 py-2 rounded-lg max-w-md">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span className="break-all">{error}</span>
        </div>
      )}

      <div className="flex gap-4">
        <button
          onClick={onNewSession}
          className="flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:opacity-80 transition-opacity"
        >
          <FolderOpen className="w-4 h-4" />
          New Session
        </button>
        <button
          onClick={() => setShowSessions(true)}
          className="flex items-center gap-2 px-6 py-3 border border-border rounded-lg text-sm font-medium hover:bg-muted transition-colors"
        >
          <History className="w-4 h-4" />
          Resume Session
        </button>
      </div>
    </div>
  )
}
