import { useState, useEffect } from 'react'
import { FolderOpen, History, Loader2, AlertCircle, ArrowLeft } from 'lucide-react'
import type { SessionInfo } from '../../types'

interface Props {
  onNewSession: () => void
  onResumeSession: (sessionId: string, workingDir: string) => void
  isConnecting?: boolean
  error?: string | null
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
        .then((result) => {
          setSessions((result as SessionInfo[]) || [])
        })
        .catch((err) => {
          console.error('[StartScreen] Failed to list sessions:', err)
          setSessions([])
        })
        .finally(() => setLoadingSessions(false))
    }
  }, [showSessions])

  if (isConnecting) {
    return (
      <div className="h-full flex flex-col items-center justify-center gap-4">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">Connecting to Claude CLI...</p>
      </div>
    )
  }

  if (showSessions) {
    return (
      <div className="h-full flex flex-col items-center justify-center gap-6">
        <div className="text-center mb-2">
          <h1 className="text-2xl font-bold mb-2">Resume Session</h1>
          <p className="text-muted-foreground text-sm">Pick a previous session to continue</p>
        </div>

        {error && (
          <div className="flex items-center gap-2 text-destructive text-sm bg-destructive/10 px-4 py-2 rounded-lg max-w-md">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span className="break-all">{error}</span>
          </div>
        )}

        <div className="w-full max-w-md space-y-2">
          {loadingSessions && (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
            </div>
          )}

          {!loadingSessions && sessions.length === 0 && (
            <p className="text-center text-sm text-muted-foreground py-8">
              No previous sessions found.
            </p>
          )}

          {!loadingSessions &&
            sessions.map((session) => (
              <button
                key={session.id}
                onClick={() => onResumeSession(session.id, session.workingDir)}
                className="w-full text-left px-4 py-3 border border-border rounded-lg hover:bg-muted transition-colors"
              >
                <div className="text-sm font-medium truncate">{session.workingDir}</div>
                <div className="text-xs text-muted-foreground mt-1">
                  {new Date(session.timestamp).toLocaleString()} &mdash;{' '}
                  <span className="font-mono text-xs">{session.id.slice(0, 8)}</span>
                </div>
              </button>
            ))}
        </div>

        <button
          onClick={() => setShowSessions(false)}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-3 h-3" />
          Back
        </button>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col items-center justify-center gap-6">
      <div className="text-center mb-4">
        <h1 className="text-2xl font-bold mb-2">Claude Code</h1>
        <p className="text-muted-foreground text-sm">
          Start a new session or resume where you left off
        </p>
      </div>

      {error && (
        <div className="flex items-center gap-2 text-destructive text-sm bg-destructive/10 px-4 py-2 rounded-lg max-w-md">
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
