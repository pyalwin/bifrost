interface Props {
  toolName: string
  input: Record<string, unknown>
  onApprove: () => void
  onDeny: () => void
}

export function ToolApprovalBanner({ toolName, input, onApprove, onDeny }: Props) {
  const preview = Object.entries(input)
    .map(
      ([k, v]) =>
        `${k}: ${typeof v === 'string' ? v.slice(0, 60) : JSON.stringify(v).slice(0, 60)}`
    )
    .join(', ')

  return (
    <div className="mx-4 mb-2 px-4 py-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/40 rounded-md flex items-center gap-3 font-sans animate-fade-in-up">
      <div className="flex-1 min-w-0">
        <div className="text-[13px] font-semibold text-foreground">{toolName}</div>
        <div className="text-[12px] text-muted-foreground truncate">{preview}</div>
      </div>
      <button
        onClick={onApprove}
        className="px-3 py-1.5 text-[12px] font-medium bg-primary text-primary-foreground rounded hover:opacity-80 transition-opacity"
      >
        Approve
      </button>
      <button
        onClick={onDeny}
        className="px-3 py-1.5 text-[12px] font-medium border border-border rounded hover:bg-muted transition-colors"
      >
        Deny
      </button>
    </div>
  )
}
