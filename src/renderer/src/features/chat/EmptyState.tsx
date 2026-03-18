import { Code, FileSearch, GitPullRequest, Bug, Sparkles } from 'lucide-react'

const SUGGESTIONS = [
  { icon: FileSearch, label: 'Explain this project to me' },
  { icon: Code, label: 'Refactor this file for readability' },
  { icon: Bug, label: 'Find and fix the bug in...' },
  { icon: GitPullRequest, label: 'Create a PR for these changes' },
]

interface Props {
  onSuggestionClick?: (text: string) => void
}

export function ChatEmptyState({ onSuggestionClick }: Props) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center px-8 animate-fade-in">
      <div className="max-w-md w-full">
        {/* Welcome */}
        <div className="text-center mb-8">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mx-auto mb-4">
            <Sparkles className="w-5 h-5 text-primary/60" />
          </div>
          <h2 className="text-lg font-semibold text-foreground/80 mb-1">
            What can I help you with?
          </h2>
          <p className="text-[13px] text-muted-foreground">
            I can read, edit, and explain code in this project.
          </p>
        </div>

        {/* Suggestion chips */}
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
