interface Props {
  fileCount: number
  additions: number
  deletions: number
  onAcceptAll: () => void
  onRejectAll: () => void
}

export function DiffSummaryHeader({ fileCount, additions, deletions, onAcceptAll, onRejectAll }: Props) {
  return (
    <div className="px-4 py-2.5 border-b border-border flex items-center gap-2.5 bg-muted">
      <span className="font-semibold text-[13px]">{fileCount} files changed</span>
      <span className="text-diff-added-text text-[13px] font-medium">+{additions}</span>
      <span className="text-diff-removed-text text-[13px] font-medium">-{deletions}</span>
      <span className="ml-auto flex gap-2.5 items-center">
        <button onClick={onRejectAll} className="text-muted-foreground hover:text-foreground text-base transition-colors">×</button>
        <button onClick={onAcceptAll} className="text-muted-foreground hover:text-foreground text-base transition-colors">✓</button>
      </span>
    </div>
  )
}
