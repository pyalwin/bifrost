import type { ToolUsage } from '../../types'

interface Props { tool: ToolUsage }

export function ToolUsageItem({ tool }: Props) {
  const isPending = tool.status === 'pending'

  return (
    <div className="flex items-center gap-2 py-[5px] text-[13px] animate-slide-in">
      {/* Status indicator */}
      {isPending && (
        <span className="shrink-0 w-[14px] h-[14px] relative">
          <span className="absolute inset-0 rounded-full border-[1.5px] border-muted-foreground/30 border-t-muted-foreground animate-spin" />
        </span>
      )}
      {tool.status === 'success' && (
        <span className="shrink-0 text-muted-foreground/70 text-[13px]">✓</span>
      )}
      {tool.status === 'error' && (
        <span className="shrink-0 text-diff-removed-text text-[13px]">✕</span>
      )}

      <span className="text-muted-foreground">{tool.action}</span>
      <span className="font-mono text-[12.5px] text-foreground/60 truncate">{tool.target}</span>

      {tool.status === 'error' && (
        <span className="ml-auto text-diff-removed-text text-[11px] shrink-0">Failed</span>
      )}
    </div>
  )
}
