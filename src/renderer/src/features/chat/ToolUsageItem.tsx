import type { ToolUsage } from '../../types'

interface Props { tool: ToolUsage }

export function ToolUsageItem({ tool }: Props) {
  return (
    <div className="flex items-center gap-2 py-[5px] text-[13px]">
      <span className="text-secondary">{tool.action}</span>
      <span className="font-mono text-[12.5px] text-foreground">{tool.target}</span>
      {tool.status === 'success' && (
        <span className="ml-auto text-muted-foreground text-[15px]">✓</span>
      )}
      {tool.status === 'error' && (
        <span className="ml-auto text-diff-removed-text text-[13px]">✕ Failed</span>
      )}
    </div>
  )
}
