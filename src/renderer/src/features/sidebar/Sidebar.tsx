import { useEffect, useState } from 'react'
import { Folder, PanelLeftClose, Plus, ChevronDown, ChevronRight } from 'lucide-react'
import { cn } from '../../lib/utils'
import type { SessionInfo } from '../../types'

interface SidebarProps {
  isOpen: boolean
  onToggle: () => void
  onNewSession: () => void
  onResumeSession: (sessionId: string, workingDir: string) => void
  activeSessionId?: string | null
}

interface ProjectGroup {
  name: string
  workingDir: string
  sessions: SessionInfo[]
  latestTimestamp: number
}

function timeAgo(timestamp: number): string {
  const seconds = Math.floor((Date.now() - timestamp) / 1000)
  if (seconds < 60) return 'now'
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}d`
  const weeks = Math.floor(days / 7)
  if (weeks < 4) return `${weeks}w`
  const months = Math.floor(days / 30)
  return `${months}mo`
}

function extractProjectName(workingDir: string): string {
  const parts = workingDir.split('/').filter(Boolean)
  const name = parts.pop() ?? workingDir
  // Skip generic names like "code", "src", "projects" — use parent + name
  if (['code', 'src', 'projects', 'repos', 'work', 'dev'].includes(name.toLowerCase()) && parts.length > 0) {
    return parts.pop() + '/' + name
  }
  return name
}

function groupSessionsByProject(sessions: SessionInfo[]): ProjectGroup[] {
  const map = new Map<string, ProjectGroup>()

  for (const session of sessions) {
    const existing = map.get(session.workingDir)
    if (existing) {
      existing.sessions.push(session)
      if (session.timestamp > existing.latestTimestamp) {
        existing.latestTimestamp = session.timestamp
      }
    } else {
      map.set(session.workingDir, {
        name: extractProjectName(session.workingDir),
        workingDir: session.workingDir,
        sessions: [session],
        latestTimestamp: session.timestamp,
      })
    }
  }

  for (const group of map.values()) {
    group.sessions.sort((a, b) => b.timestamp - a.timestamp)
  }

  return Array.from(map.values()).sort((a, b) => b.latestTimestamp - a.latestTimestamp)
}

const MAX_VISIBLE = 5

function ProjectRow({
  group,
  activeSessionId,
  onResumeSession,
}: {
  group: ProjectGroup
  activeSessionId?: string | null
  onResumeSession: (sessionId: string, workingDir: string) => void
}) {
  const [expanded, setExpanded] = useState(true)
  const [showAll, setShowAll] = useState(false)

  const visible = showAll ? group.sessions : group.sessions.slice(0, MAX_VISIBLE)
  const remaining = group.sessions.length - MAX_VISIBLE

  return (
    <div className="mb-0.5">
      {/* Project header */}
      <button
        onClick={() => setExpanded(v => !v)}
        className="w-full flex items-center gap-1.5 px-2 py-[5px] text-[11px] font-semibold text-muted-foreground uppercase tracking-wider hover:text-foreground transition-colors"
      >
        {expanded
          ? <ChevronDown className="w-2.5 h-2.5 shrink-0" />
          : <ChevronRight className="w-2.5 h-2.5 shrink-0" />
        }
        <Folder className="w-3 h-3 shrink-0" />
        <span className="truncate">{group.name}</span>
      </button>

      {/* Session items */}
      {expanded && (
        <div>
          {visible.map((session) => {
            const isActive = session.id === activeSessionId
            return (
              <button
                key={session.id}
                onClick={() => onResumeSession(session.id, session.workingDir)}
                className={cn(
                  'w-full text-left pl-6 pr-2 py-[6px] flex items-center gap-1 transition-colors rounded-sm',
                  isActive
                    ? 'bg-muted text-foreground'
                    : 'text-foreground/70 hover:text-foreground hover:bg-muted/50'
                )}
              >
                <span className="text-[12.5px] truncate flex-1 leading-tight">
                  {session.firstMessage || 'Untitled'}
                </span>
                <span className="text-[10px] text-muted-foreground/60 shrink-0 tabular-nums">
                  {timeAgo(session.timestamp)}
                </span>
              </button>
            )
          })}

          {remaining > 0 && !showAll && (
            <button
              onClick={(e) => { e.stopPropagation(); setShowAll(true) }}
              className="w-full text-left pl-6 pr-2 py-[4px] text-[11px] text-muted-foreground/50 hover:text-muted-foreground transition-colors"
            >
              Show {remaining} more
            </button>
          )}
        </div>
      )}
    </div>
  )
}

export function Sidebar({
  isOpen,
  onToggle,
  onNewSession,
  onResumeSession,
  activeSessionId,
}: SidebarProps) {
  const [sessions, setSessions] = useState<SessionInfo[]>([])

  useEffect(() => {
    if (!isOpen) return
    window.claude
      ?.listSessions()
      .then((data) => setSessions(data ?? []))
      .catch(() => setSessions([]))
  }, [isOpen])

  const projects = groupSessionsByProject(sessions)

  return (
    <div
      className={cn(
        'flex flex-col bg-title-bar border-r border-border overflow-hidden transition-all duration-200 shrink-0',
        isOpen ? 'w-[220px]' : 'w-0'
      )}
      style={{ minWidth: isOpen ? 220 : 0 }}
    >
      {isOpen && (
        <div className="flex flex-col h-full animate-fade-in">
          {/* Header */}
          <div className="flex items-center gap-1.5 px-2 pt-2 pb-1.5 shrink-0">
            <button
              onClick={onNewSession}
              className="flex-1 flex items-center justify-center gap-1.5 px-2 py-[6px] rounded-md border border-border text-[12px] font-medium hover:bg-muted transition-colors"
            >
              <Plus className="w-3 h-3" />
              New thread
            </button>
            <button
              onClick={onToggle}
              title="Collapse sidebar"
              className="w-6 h-6 flex items-center justify-center rounded-md hover:bg-muted transition-colors text-muted-foreground/60 hover:text-foreground shrink-0"
            >
              <PanelLeftClose className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Sessions */}
          <div className="flex-1 overflow-y-auto overflow-x-hidden px-1.5 py-1 scrollbar-thin">
            {projects.length === 0 ? (
              <p className="text-[11px] text-muted-foreground/50 px-2 py-4 text-center">
                No sessions yet
              </p>
            ) : (
              projects.map((group) => (
                <ProjectRow
                  key={group.workingDir}
                  group={group}
                  activeSessionId={activeSessionId}
                  onResumeSession={onResumeSession}
                />
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}
