import { ChevronDown, ChevronRight } from 'lucide-react'
import { cn } from '../../lib/utils'

interface Props {
  filename: string
  additions: number
  deletions: number
  collapsed: boolean
  viewed: boolean
  onToggleCollapse: () => void
  onToggleViewed: () => void
}

export function DiffFileHeader({ filename, additions, deletions, collapsed, viewed, onToggleCollapse, onToggleViewed }: Props) {
  return (
    <div
      className={cn(
        "flex items-center px-4 py-2 border-b border-border text-[13px] cursor-pointer select-none",
        viewed ? "bg-muted/50" : "bg-muted"
      )}
      onClick={onToggleCollapse}
    >
      {collapsed ? <ChevronRight className="w-3.5 h-3.5 mr-1.5 text-muted-foreground" /> : <ChevronDown className="w-3.5 h-3.5 mr-1.5 text-muted-foreground" />}
      <span className={cn("font-mono text-[12.5px] font-medium", viewed && "text-muted-foreground")}>{filename}</span>
      <span className="ml-2.5 text-diff-added-text text-xs font-medium">+{additions}</span>
      <span className="ml-1 text-diff-removed-text text-xs font-medium">-{deletions}</span>
      <span className="ml-auto flex items-center" onClick={(e) => e.stopPropagation()}>
        <label className="flex items-center gap-1.5 cursor-pointer text-[11px] text-muted-foreground hover:text-foreground transition-colors">
          <input
            type="checkbox"
            checked={viewed}
            onChange={onToggleViewed}
            className="w-3.5 h-3.5 rounded border-border accent-green-600 cursor-pointer"
          />
          Viewed
        </label>
      </span>
    </div>
  )
}
