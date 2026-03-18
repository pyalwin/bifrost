import { GitBranch, ExternalLink, GitCommit, Sun, Moon } from 'lucide-react'
import { cn } from '../../lib/utils'

interface TitleBarProps {
  branch: string
  theme: 'light' | 'dark'
  onToggleTheme: () => void
  openDisabled?: boolean
}

export function TitleBar({ branch, theme, onToggleTheme, openDisabled = true }: TitleBarProps) {
  return (
    <div className="h-12 bg-title-bar border-b border-border flex items-center px-4 pl-20 select-none"
         style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}>
      <span className="font-semibold text-sm tracking-tight">Claude Code</span>
      <span className="flex items-center gap-1.5 ml-3.5 text-muted-foreground text-[13px]"
            style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}>
        <GitBranch className="w-[13px] h-[13px]" />
        {branch}
      </span>
      <div className="ml-auto flex items-center gap-2"
           style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}>
        <button
          onClick={onToggleTheme}
          className="w-8 h-8 flex items-center justify-center border border-border rounded-lg bg-background hover:bg-muted transition-colors"
        >
          {theme === 'light' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </button>
        <button
          disabled={openDisabled}
          className={cn(
            'flex items-center gap-1.5 px-4 py-1.5 border border-border rounded-lg text-[13px] font-medium bg-background transition-colors',
            openDisabled ? 'opacity-50 cursor-not-allowed' : 'hover:bg-muted'
          )}
        >
          <ExternalLink className="w-3.5 h-3.5" />
          Open
        </button>
        <button className="flex items-center gap-1.5 px-4 py-1.5 border border-border rounded-lg text-[13px] font-medium bg-background hover:bg-muted transition-colors">
          <GitCommit className="w-3.5 h-3.5" />
          Commit
        </button>
      </div>
    </div>
  )
}
