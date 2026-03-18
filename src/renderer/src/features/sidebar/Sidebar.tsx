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
  if (seconds < 60) return 'just now'
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
  return workingDir.split('/').filter(Boolean).pop() ?? workingDir
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
        latestTimestamp: session.timestamp
      })
    }
  }

  // Sort each project's sessions newest first
  for (const group of map.values()) {
    group.sessions.sort((a, b) => b.timestamp - a.timestamp)
  }

  // Sort projects by most recent session
  return Array.from(map.values()).sort((a, b) => b.latestTimestamp - a.latestTimestamp)
}

const MAX_SESSIONS_VISIBLE = 5

function ProjectRow({
  group,
  activeSessionId,
  onResumeSession
}: {
  group: ProjectGroup
  activeSessionId?: string | null
  onResumeSession: (sessionId: string, workingDir: string) => void
}) {
  const [expanded, setExpanded] = useState(true)
  const [showAll, setShowAll] = useState(false)

  const visibleSessions = showAll ? group.sessions : group.sessions.slice(0, MAX_SESSIONS_VISIBLE)
  const hasMore = group.sessions.length > MAX_SESSIONS_VISIBLE

  return (
    <div className="mb-1">
      {/* Project header */}
      <button
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center gap-1.5 px-3 py-1 text-[12px] font-medium text-muted-foreground hover:text-foreground transition-colors rounded-md hover:bg-muted group"
      >
        {expanded ? (
          <ChevronDown className="w-3 h-3 shrink-0 opacity-60" />
        ) : (
          <ChevronRight className="w-3 h-3 shrink-0 opacity-60" />
        )}
        <Folder className="w-3.5 h-3.5 shrink-0" />
        <span className="truncate">{group.name}</span>
      </button>

      {/* Sessions list */}
      {expanded && (
        <div className="mt-0.5 stagger-children">
          {visibleSessions.map((session) => {
            const isActive = session.id === activeSessionId
            return (
              <button
                key={session.id}
                onClick={() => onResumeSession(session.id, session.workingDir)}
                className={cn(
                  'w-full text-left px-3 py-1.5 rounded-md flex items-start gap-2 transition-colors',
                  'hover:bg-muted',
                  isActive
                    ? 'bg-muted border-l-2 border-primary pl-[10px]'
                    : 'border-l-2 border-transparent pl-[10px]'
                )}
              >
                <div className="flex-1 min-w-0">
                  <p
                    className={cn(
                      'text-[13px] truncate leading-snug',
                      isActive ? 'text-foreground font-medium' : 'text-foreground/80'
                    )}
                  >
                    {session.firstMessage || 'Untitled session'}
                  </p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    {timeAgo(session.timestamp)}
                  </p>
                </div>
              </button>
            )
          })}

          {hasMore && !showAll && (
            <button
              onClick={() => setShowAll(true)}
              className="w-full text-left px-3 py-1 text-[11px] text-muted-foreground hover:text-foreground transition-colors"
            >
              Show {group.sessions.length - MAX_SESSIONS_VISIBLE} more…
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
  activeSessionId
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
    <>
      {/* Sidebar panel */}
      <div
        className={cn(
          'flex flex-col bg-title-bar border-r border-border overflow-hidden transition-all duration-200 ease-in-out shrink-0',
          isOpen ? 'w-[240px]' : 'w-0'
        )}
        style={{ minWidth: isOpen ? 240 : 0 }}
      >
        {isOpen && (
          <div className="flex flex-col h-full animate-fade-in">
            {/* Header */}
            <div className="flex items-center gap-2 px-3 pt-3 pb-2 shrink-0">
              <button
                onClick={onNewSession}
                className="flex-1 flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-background border border-border text-[13px] font-medium hover:bg-muted transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                New thread
              </button>
              <button
                onClick={onToggle}
                title="Collapse sidebar"
                className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-muted transition-colors text-muted-foreground hover:text-foreground shrink-0"
              >
                <PanelLeftClose className="w-4 h-4" />
              </button>
            </div>

            <div className="w-full h-px bg-border shrink-0" />

            {/* Sessions list */}
            <div className="flex-1 overflow-y-auto overflow-x-hidden px-2 py-2">
              {projects.length === 0 ? (
                <p className="text-[12px] text-muted-foreground px-3 py-2">No sessions yet.</p>
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
    </>
  )
}
