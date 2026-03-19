import { useState, useEffect } from 'react'
import { Code, FileSearch, GitPullRequest, Bug, FolderOpen, Zap } from 'lucide-react'

const SUGGESTIONS = [
  { icon: FileSearch, label: 'Explain this project to me' },
  { icon: Code, label: 'Refactor this file for read...' },
  { icon: Bug, label: 'Find and fix the bug in...' },
  { icon: GitPullRequest, label: 'Create a PR for these ch...' },
]

// Rotating taglines for the idle state
const IDLE_LINES = [
  'Your code awaits.',
  'Pick a thread. Ship a fix.',
  'Open a project. Break things (then fix them).',
  'Ready when you are, captain.',
  'No open sessions. The codebase is... suspiciously quiet.',
  "The terminal is empty. That's either very good or very bad.",
  'Start a session. The bugs aren\'t going to fix themselves.',
  'Idle hands write no code.',
]

// Rotating taglines for active session with no messages
const ACTIVE_LINES = [
  'What are we building today?',
  'I\'ve got the codebase loaded. Fire away.',
  'Ready. Point me at the code.',
  'Session\'s live. What needs fixing?',
  'Connected and caffeinated. What\'s the plan?',
]

interface Props {
  onSuggestionClick?: (text: string) => void
  hasSession?: boolean
  onNewSession?: () => void
}

export function ChatEmptyState({ onSuggestionClick, hasSession = false, onNewSession }: Props) {
  const [tagline, setTagline] = useState('')

  useEffect(() => {
    const lines = hasSession ? ACTIVE_LINES : IDLE_LINES
    setTagline(lines[Math.floor(Math.random() * lines.length)])
  }, [hasSession])

  if (!hasSession) {
    // No session — prompt to start or pick one
    return (
      <div className="flex-1 flex flex-col items-center justify-center px-8 animate-fade-in">
        <div className="max-w-sm w-full text-center">
          {/* Logo / brand mark */}
          <div className="relative mx-auto mb-6 w-14 h-14">
            <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-foreground/[0.06] to-foreground/[0.02] border border-border" />
            <div className="absolute inset-0 flex items-center justify-center">
              <Zap className="w-6 h-6 text-foreground/30" />
            </div>
          </div>

          <h2 className="text-[17px] font-semibold text-foreground/80 mb-2 tracking-tight">
            Bifrost
          </h2>
          <p className="text-[13px] text-muted-foreground leading-relaxed mb-8">
            {tagline}
          </p>

          <div className="flex flex-col gap-2">
            <button
              onClick={onNewSession}
              className="w-full flex items-center justify-center gap-2.5 px-4 py-3 rounded-xl bg-foreground text-background text-[13px] font-medium hover:opacity-90 transition-opacity"
            >
              <FolderOpen className="w-4 h-4" />
              Open a project
            </button>
            <p className="text-[11px] text-muted-foreground/50 mt-1">
              or pick a thread from the sidebar →
            </p>
          </div>
        </div>
      </div>
    )
  }

  // Session active — show suggestions
  return (
    <div className="flex-1 flex flex-col items-center justify-center px-8 animate-fade-in">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <div className="w-10 h-10 rounded-xl bg-foreground/[0.05] border border-border flex items-center justify-center mx-auto mb-4">
            <Zap className="w-5 h-5 text-foreground/40" />
          </div>
          <h2 className="text-[16px] font-semibold text-foreground/80 mb-1.5 tracking-tight">
            {tagline}
          </h2>
          <p className="text-[12px] text-muted-foreground">
            I can read, edit, and explain code in this project.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-2">
          {SUGGESTIONS.map((s) => (
            <button
              key={s.label}
              onClick={() => onSuggestionClick?.(s.label)}
              className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-lg border border-border bg-background text-left text-[13px] text-foreground/70 hover:bg-muted hover:text-foreground transition-colors"
            >
              <s.icon className="w-4 h-4 text-muted-foreground shrink-0" />
              <span className="truncate">{s.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
