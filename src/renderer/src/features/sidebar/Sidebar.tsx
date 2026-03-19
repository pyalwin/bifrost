import { useEffect, useState } from 'react'
import { ChevronDown, ChevronRight, Folder, SquarePen } from 'lucide-react'
import { cn } from '../../lib/utils'
import type { ProjectHierarchy, BranchGroup, PullRequest } from '../../types'

interface SidebarProps {
  isOpen: boolean
  onToggle: () => void
  onNewSession: () => void
  onResumeSession: (sessionId: string, workingDir: string) => void
  activeSessionId?: string | null
  currentBranch?: string
  pullRequest?: PullRequest | null
  onCreatePR?: () => void
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

function BranchRow({
  branch, isExpanded, isCurrentBranch, activeSessionId,
  onToggle, onResumeSession, pullRequest, onCreatePR,
}: {
  branch: BranchGroup
  isExpanded: boolean
  isCurrentBranch: boolean
  activeSessionId?: string | null
  onToggle: () => void
  onResumeSession: (sessionId: string, workingDir: string) => void
  pullRequest?: PullRequest | null
  onCreatePR?: () => void
}) {
  const sessionCount = branch.sessions.length

  return (
    <div>
      <button
        onClick={onToggle}
        className={cn(
          'w-full flex items-center gap-1.5 px-4 pl-7 py-[5px] text-[12px] transition-colors',
          isCurrentBranch
            ? 'text-foreground font-medium'
            : 'text-muted-foreground hover:text-foreground'
        )}
      >
        {isExpanded
          ? <ChevronDown className="w-3 h-3 shrink-0" />
          : <ChevronRight className="w-3 h-3 shrink-0" />
        }
        <span className="truncate">{branch.name}</span>
        {!isExpanded && (
          <span className="text-[10px] text-muted-foreground/30 ml-auto shrink-0">
            {sessionCount}
          </span>
        )}
      </button>

      {isExpanded && (
        <div>
          {branch.sessions.map((session) => {
            const isActive = session.id === activeSessionId
            return (
              <button
                key={session.id}
                onClick={() => onResumeSession(session.id, session.workingDir)}
                className={cn(
                  'w-full text-left px-4 pl-[42px] py-[6px] flex items-center gap-2 text-[12px] transition-colors',
                  isActive
                    ? 'bg-muted text-foreground'
                    : 'text-foreground/60 hover:bg-muted/60 hover:text-foreground'
                )}
              >
                <span className="truncate flex-1">{session.firstMessage || 'Untitled'}</span>
                <span className="text-[11px] text-muted-foreground/40 shrink-0 tabular-nums">
                  {timeAgo(session.timestamp)}
                </span>
              </button>
            )
          })}

          {/* PR info */}
          {isCurrentBranch && pullRequest ? (
            <div className="flex items-center gap-1.5 px-4 pl-[42px] py-[5px] text-[11px] text-muted-foreground">
              <svg width="12" height="12" viewBox="0 0 16 16" fill={pullRequest.isDraft ? 'currentColor' : '#3fb950'}><path d="M1.5 3.25a2.25 2.25 0 013 2.122v5.256a2.251 2.251 0 11-1.5 0V5.372A2.25 2.25 0 011.5 3.25zm5.677-.177L9.573.677A.25.25 0 0110 .854V2.5h1A2.5 2.5 0 0113.5 5v5.628a2.251 2.251 0 11-1.5 0V5a1 1 0 00-1-1h-1v1.646a.25.25 0 01-.427.177L7.177 3.427a.25.25 0 010-.354z"/></svg>
              <span className="truncate">PR #{pullRequest.number}</span>
              <span className={cn(
                "px-1.5 py-0 rounded text-[10px] font-medium shrink-0",
                pullRequest.isDraft ? "bg-muted text-muted-foreground" : "bg-green-500/15 text-green-500"
              )}>
                {pullRequest.isDraft ? 'Draft' : 'Open'}
              </span>
            </div>
          ) : isCurrentBranch && onCreatePR ? (
            <button
              onClick={onCreatePR}
              className="flex items-center gap-1.5 px-4 pl-[42px] py-[5px] text-[11px] text-green-500 hover:text-green-400 transition-colors w-full text-left"
            >
              <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor"><path d="M1.5 3.25a2.25 2.25 0 013 2.122v5.256a2.251 2.251 0 11-1.5 0V5.372A2.25 2.25 0 011.5 3.25zm5.677-.177L9.573.677A.25.25 0 0110 .854V2.5h1A2.5 2.5 0 0113.5 5v5.628a2.251 2.251 0 11-1.5 0V5a1 1 0 00-1-1h-1v1.646a.25.25 0 01-.427.177L7.177 3.427a.25.25 0 010-.354z"/></svg>
              Create Pull Request
            </button>
          ) : null}
        </div>
      )}
    </div>
  )
}

export function Sidebar({
  isOpen, onToggle, onNewSession, onResumeSession, activeSessionId, currentBranch,
  pullRequest, onCreatePR,
}: SidebarProps) {
  const [projects, setProjects] = useState<ProjectHierarchy[]>([])
  const [expandedBranches, setExpandedBranches] = useState<Set<string>>(new Set())

  useEffect(() => {
    if (!isOpen) return
    window.claude
      ?.listSessionsGrouped()
      .then((data) => {
        setProjects(data ?? [])
        // Auto-expand the current branch
        if (currentBranch) {
          const keys = (data ?? []).flatMap(p =>
            p.branches.filter(b => b.name === currentBranch).map(b => `${p.workingDir}:${b.name}`)
          )
          if (keys.length > 0) {
            setExpandedBranches(prev => {
              const next = new Set(prev)
              for (const k of keys) next.add(k)
              return next
            })
          }
        }
      })
      .catch(() => setProjects([]))
  }, [isOpen, currentBranch])

  const toggleBranch = (key: string) => {
    setExpandedBranches(prev => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

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
          <div className="px-4 pt-4 pb-1">
            <span className="text-[12px] font-medium text-muted-foreground/60">Threads</span>
          </div>

          {/* Project → Branch → Sessions hierarchy */}
          <div className="flex-1 overflow-y-auto overflow-x-hidden pb-2">
            {projects.length === 0 ? (
              <p className="text-[12px] text-muted-foreground/40 px-4 py-6 text-center">
                No sessions yet
              </p>
            ) : (
              projects.map((project) => (
                <div key={project.workingDir} className="mb-2">
                  {/* Project header */}
                  <div className="flex items-center gap-2 px-4 pt-3 pb-1">
                    <Folder className="w-4 h-4 text-muted-foreground/60 shrink-0" />
                    <span className="text-[13px] font-medium text-foreground/80 truncate">{project.name}</span>
                  </div>

                  {/* Branch groups */}
                  {project.branches.map((branch) => {
                    const branchKey = `${project.workingDir}:${branch.name}`
                    return (
                      <BranchRow
                        key={branchKey}
                        branch={branch}
                        isExpanded={expandedBranches.has(branchKey)}
                        isCurrentBranch={branch.name === currentBranch}
                        activeSessionId={activeSessionId}
                        onToggle={() => toggleBranch(branchKey)}
                        onResumeSession={onResumeSession}
                        pullRequest={branch.name === currentBranch ? pullRequest : undefined}
                        onCreatePR={branch.name === currentBranch ? onCreatePR : undefined}
                      />
                    )
                  })}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}
