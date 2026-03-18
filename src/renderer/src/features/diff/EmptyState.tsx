import { GitCompareArrows } from 'lucide-react'

export function DiffEmptyState() {
  return (
    <div className="h-full flex flex-col items-center justify-center text-muted-foreground gap-4 animate-fade-in">
      <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center">
        <GitCompareArrows className="w-6 h-6 opacity-40" />
      </div>
      <div className="text-center">
        <p className="text-sm font-medium text-foreground/40">No changes yet</p>
        <p className="text-xs text-muted-foreground/60 mt-1">Diffs will appear here as Claude edits files</p>
      </div>
    </div>
  )
}
