import type { ToolUsage } from '../../types'
import { Loader2 } from 'lucide-react'

interface Props { tool: ToolUsage }

export function ToolUsageItem({ tool }: Props) {
  return (
    <div className="flex items-center gap-2 py-[5px] text-[13px]">
      {tool.status === 'pending' && (
        <Loader2 className="w-3 h-3 animate-spin text-muted-foreground shrink-0" />
      )}
      <span className="text-secondary">{tool.action}</span>
      <span className="font-mono text-[12.5px] text-foreground truncate">{tool.target}</span>
      {tool.status === 'success' && (
        <span className="ml-auto text-muted-foreground text-[15px] shrink-0">✓</span>
      )}
      {tool.status === 'error' && (
        <span className="ml-auto text-diff-removed-text text-[13px] shrink-0">✕ Failed</span>
      )}
    </div>
  )
}
