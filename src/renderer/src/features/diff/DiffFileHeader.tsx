import { ChevronDown, ChevronRight } from 'lucide-react'

interface Props {
  filename: string
  additions: number
  deletions: number
  collapsed: boolean
  onToggleCollapse: () => void
  onAccept: () => void
  onReject: () => void
}

export function DiffFileHeader({ filename, additions, deletions, collapsed, onToggleCollapse, onAccept, onReject }: Props) {
  return (
    <div
      className="flex items-center px-4 py-2 bg-muted border-b border-border text-[13px] cursor-pointer select-none"
      onClick={onToggleCollapse}
    >
      {collapsed ? <ChevronRight className="w-3.5 h-3.5 mr-1.5 text-muted-foreground" /> : <ChevronDown className="w-3.5 h-3.5 mr-1.5 text-muted-foreground" />}
      <span className="font-mono text-[12.5px] font-medium">{filename}</span>
      <span className="ml-2.5 text-diff-added-text text-xs font-medium">+{additions}</span>
      <span className="ml-1 text-diff-removed-text text-xs font-medium">-{deletions}</span>
      <span className="ml-auto flex gap-2.5 items-center" onClick={(e) => e.stopPropagation()}>
        <button onClick={onReject} className="text-muted-foreground hover:text-foreground text-[15px] transition-colors">×</button>
        <button onClick={onAccept} className="text-muted-foreground hover:text-foreground text-[15px] transition-colors">✓</button>
      </span>
    </div>
  )
}
