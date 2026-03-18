import { FileX } from 'lucide-react'

export function DiffEmptyState() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground gap-3">
      <FileX className="w-10 h-10 opacity-30" />
      <span className="text-sm">No changes yet</span>
    </div>
  )
}
