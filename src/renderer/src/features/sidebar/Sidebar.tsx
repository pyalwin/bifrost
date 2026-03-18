import { useEffect, useState } from 'react'
import { Folder, PanelLeftClose, SquarePen, Settings } from 'lucide-react'
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
  if (weeks < 5) return `${weeks}w`
  const months = Math.floor(days / 30)
  return `${months}mo`
}

function extractProjectName(workingDir: string): string {
  const parts = workingDir.split('/').filter(Boolean)
  const name = parts.pop() ?? workingDir
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
      if (session.timestamp > existing.latestTimestamp) existing.latestTimestamp = session.timestamp
    } else {
      map.set(session.workingDir, {
        name: extractProjectName(session.workingDir),
        workingDir: session.workingDir,
        sessions: [session],
        latestTimestamp: session.timestamp,
      })
    }
  }
  for (const group of map.values()) group.sessions.sort((a, b) => b.timestamp - a.timestamp)
  return Array.from(map.values()).sort((a, b) => b.latestTimestamp - a.latestTimestamp)
}

const MAX_VISIBLE = 10

function ProjectRow({
  group, activeSessionId, onResumeSession,
}: {
  group: ProjectGroup
  activeSessionId?: string | null
  onResumeSession: (sessionId: string, workingDir: string) => void
}) {
  const [showAll, setShowAll] = useState(false)
  const visible = showAll ? group.sessions : group.sessions.slice(0, MAX_VISIBLE)
  const remaining = group.sessions.length - MAX_VISIBLE

  return (
    <div className="mb-2">
      {/* Project name */}
      <div className="flex items-center gap-2 px-4 pt-3 pb-1">
        <Folder className="w-4 h-4 text-muted-foreground/60 shrink-0" />
        <span className="text-[13px] font-medium text-foreground/80 truncate">{group.name}</span>
      </div>

      {/* Sessions */}
      <div>
        {visible.map((session) => {
          const isActive = session.id === activeSessionId
          return (
            <button
              key={session.id}
              onClick={() => onResumeSession(session.id, session.workingDir)}
              className={cn(
                'w-full text-left px-4 py-[7px] flex items-center gap-2 transition-colors',
                isActive
                  ? 'bg-muted text-foreground'
                  : 'text-foreground/70 hover:bg-muted/60 hover:text-foreground'
              )}
            >
              <span className="text-[13px] truncate flex-1">
                {session.firstMessage || 'Untitled'}
              </span>
              <span className="text-[12px] text-muted-foreground/50 shrink-0 tabular-nums">
                {timeAgo(session.timestamp)}
              </span>
            </button>
          )
        })}

        {remaining > 0 && !showAll && (
          <button
            onClick={() => setShowAll(true)}
            className="w-full text-left px-4 py-[5px] text-[12px] text-muted-foreground/40 hover:text-muted-foreground transition-colors"
          >
            Show more
          </button>
        )}
      </div>
    </div>
  )
}

export function Sidebar({
  isOpen, onToggle, onNewSession, onResumeSession, activeSessionId,
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
        isOpen ? 'w-[260px]' : 'w-0'
      )}
      style={{ minWidth: isOpen ? 260 : 0 }}
    >
      {isOpen && (
        <div className="flex flex-col h-full animate-fade-in">
          {/* Nav items */}
          <div className="px-3 pt-3 pb-1 space-y-0.5 shrink-0">
            <button
              onClick={onNewSession}
              className="w-full flex items-center gap-3 px-3 py-2 rounded-md text-[14px] text-foreground/80 hover:bg-muted hover:text-foreground transition-colors"
            >
              <SquarePen className="w-[18px] h-[18px]" />
              New thread
            </button>
          </div>

          {/* Threads label */}
          <div className="flex items-center justify-between px-4 pt-4 pb-1">
            <span className="text-[12px] font-medium text-muted-foreground/60">Threads</span>
            <button
              onClick={onToggle}
              title="Collapse sidebar"
              className="w-5 h-5 flex items-center justify-center rounded hover:bg-muted transition-colors text-muted-foreground/40 hover:text-foreground"
            >
              <PanelLeftClose className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Project groups with sessions */}
          <div className="flex-1 overflow-y-auto overflow-x-hidden pb-2">
            {projects.length === 0 ? (
              <p className="text-[12px] text-muted-foreground/40 px-4 py-6 text-center">
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

          {/* Footer */}
          <div className="shrink-0 border-t border-border px-3 py-2">
            <button className="w-full flex items-center gap-3 px-3 py-2 rounded-md text-[14px] text-foreground/60 hover:bg-muted hover:text-foreground transition-colors">
              <Settings className="w-[18px] h-[18px]" />
              Settings
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
