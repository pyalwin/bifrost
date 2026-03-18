import { useState, useEffect } from 'react'
import {
  FolderOpen, Loader2, AlertCircle, ArrowLeft,
  MessageSquare, Plus, Clock, ChevronRight, Terminal
} from 'lucide-react'
import type { SessionInfo } from '../../types'

interface ProjectInfo {
  name: string
  workingDir: string
  sessionCount: number
  lastActive: number
}

interface Props {
  onNewSession: () => void
  onStartSessionInDir: (workingDir: string) => void
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
  if (days < 7) return `${days}d ago`
  return new Date(timestamp).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

function shortenPath(p: string): string {
  return p.replace(/^\/Users\/[^/]+/, '~')
}

/* ─── Connecting overlay ─── */
function ConnectingView() {
  return (
    <div className="h-full flex flex-col items-center justify-center gap-5 animate-fade-in">
      <div className="relative">
        <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center">
          <Terminal className="w-7 h-7 text-foreground/30" />
        </div>
        <Loader2 className="absolute -bottom-1 -right-1 w-5 h-5 animate-spin text-primary" />
      </div>
      <div className="text-center">
        <p className="text-sm font-medium text-foreground/60">Connecting to Claude</p>
        <p className="text-xs text-muted-foreground mt-1">Starting CLI session...</p>
      </div>
    </div>
  )
}

/* ─── Error banner ─── */
function ErrorBanner({ message }: { message: string }) {
  return (
    <div className="flex items-center gap-2.5 text-diff-removed-text text-[13px] bg-diff-removed-bg px-4 py-2.5 rounded-lg animate-fade-in-up">
      <AlertCircle className="w-4 h-4 flex-shrink-0" />
      <span className="break-all">{message}</span>
    </div>
  )
}

/* ─── Step 2: Session picker for a chosen project ─── */
function SessionPicker({
  project,
  onBack,
  onNewSession,
  onResumeSession,
  error,
}: {
  project: ProjectInfo
  onBack: () => void
  onNewSession: (workingDir: string) => void
  onResumeSession: (sessionId: string, workingDir: string) => void
  error?: string | null
}) {
  const [sessions, setSessions] = useState<SessionInfo[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    window.claude
      ?.listSessionsForDir(project.workingDir)
      .then((result) => setSessions((result as SessionInfo[]) || []))
      .catch(() => setSessions([]))
      .finally(() => setLoading(false))
  }, [project.workingDir])

  return (
    <div className="h-full flex flex-col animate-fade-in">
      {/* Header */}
      <div className="px-6 pt-6 pb-4 border-b border-border">
        <div className="max-w-lg mx-auto">
          <button
            onClick={onBack}
            className="flex items-center gap-1.5 text-[13px] text-muted-foreground hover:text-foreground transition-colors mb-4"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            All projects
          </button>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-lg font-semibold tracking-tight">{project.name}</h1>
              <p className="text-xs text-muted-foreground mt-0.5 font-mono">{shortenPath(project.workingDir)}</p>
            </div>
            <button
              onClick={() => onNewSession(project.workingDir)}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-primary text-primary-foreground rounded-lg text-[13px] font-medium hover:opacity-80 transition-opacity"
            >
              <Plus className="w-3.5 h-3.5" />
              New session
            </button>
          </div>
        </div>
      </div>

      {/* Session list */}
      <div className="flex-1 overflow-y-auto px-6 py-4">
        <div className="max-w-lg mx-auto">
          {error && <div className="mb-4"><ErrorBanner message={error} /></div>}

          {loading && (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
            </div>
          )}

          {!loading && sessions.length === 0 && (
            <div className="text-center py-16 animate-fade-in">
              <MessageSquare className="w-8 h-8 mx-auto mb-3 text-muted-foreground/20" />
              <p className="text-sm text-muted-foreground">No sessions yet in this project</p>
              <p className="text-xs text-muted-foreground/60 mt-1">Start a new session to begin</p>
            </div>
          )}

          {!loading && sessions.length > 0 && (
            <div className="space-y-1 stagger-children">
              {sessions.slice(0, 20).map((session) => (
                <button
                  key={session.id}
                  onClick={() => onResumeSession(session.id, session.workingDir)}
                  className="w-full text-left px-3 py-2 rounded-md hover:bg-muted transition-colors group"
                >
                  <div className="flex items-center gap-2.5">
                    <MessageSquare className="w-3.5 h-3.5 text-muted-foreground/50 shrink-0" />
                    <span className="text-[13px] text-foreground truncate flex-1">
                      {session.firstMessage || 'Empty session'}
                    </span>
                    <span className="text-[11px] text-muted-foreground/60 shrink-0">
                      {timeAgo(session.timestamp)}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

/* ─── Step 1: Project picker (main view) ─── */
export function StartScreen({
  onNewSession,
  onStartSessionInDir,
  onResumeSession,
  isConnecting,
  error,
}: Props) {
  const [projects, setProjects] = useState<ProjectInfo[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedProject, setSelectedProject] = useState<ProjectInfo | null>(null)

  useEffect(() => {
    setLoading(true)
    window.claude
      ?.listProjects()
      .then((result) => setProjects((result as ProjectInfo[]) || []))
      .catch(() => setProjects([]))
      .finally(() => setLoading(false))
  }, [])

  if (isConnecting) return <ConnectingView />
  if (selectedProject) {
    return (
      <SessionPicker
        project={selectedProject}
        onBack={() => setSelectedProject(null)}
        onNewSession={onStartSessionInDir}
        onResumeSession={onResumeSession}
        error={error}
      />
    )
  }

  return (
    <div className="h-full flex flex-col animate-fade-in">
      {/* Header */}
      <div className="px-6 pt-8 pb-4">
        <div className="max-w-lg mx-auto text-center">
          <div className="w-11 h-11 rounded-xl bg-primary/[0.06] flex items-center justify-center mx-auto mb-4">
            <Terminal className="w-5.5 h-5.5 text-primary/40" />
          </div>
          <h1 className="text-xl font-semibold tracking-tight mb-1">Bifrost</h1>
          <p className="text-[13px] text-muted-foreground">Choose a project to get started</p>
        </div>
      </div>

      {/* Project list */}
      <div className="flex-1 overflow-y-auto px-6 py-2">
        <div className="max-w-lg mx-auto">
          {error && <div className="mb-4"><ErrorBanner message={error} /></div>}

          {loading && (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
            </div>
          )}

          {!loading && (
            <div className="space-y-1 stagger-children">
              {projects.map((project) => (
                <button
                  key={project.workingDir}
                  onClick={() => setSelectedProject(project)}
                  className="w-full text-left px-4 py-3.5 rounded-lg hover:bg-muted transition-colors group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-muted group-hover:bg-background flex items-center justify-center shrink-0 transition-colors">
                      <FolderOpen className="w-4 h-4 text-muted-foreground" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[13px] font-medium text-foreground">{project.name}</div>
                      <div className="text-[11px] text-muted-foreground font-mono truncate mt-0.5">
                        {shortenPath(project.workingDir)}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-[11px] text-muted-foreground">{timeAgo(project.lastActive)}</div>
                      <div className="text-[10px] text-muted-foreground/50 mt-0.5">
                        {project.sessionCount} session{project.sessionCount !== 1 ? 's' : ''}
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-muted-foreground/30 group-hover:text-muted-foreground transition-colors shrink-0" />
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Footer — open different directory */}
      <div className="px-6 py-4 border-t border-border">
        <div className="max-w-lg mx-auto">
          <button
            onClick={onNewSession}
            className="w-full flex items-center justify-center gap-2 py-2.5 text-[13px] text-muted-foreground hover:text-foreground border border-dashed border-border rounded-lg hover:bg-muted/50 transition-colors"
          >
            <FolderOpen className="w-4 h-4" />
            Open a different directory...
          </button>
        </div>
      </div>
    </div>
  )
}
