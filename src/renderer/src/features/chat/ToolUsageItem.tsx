import { useState } from 'react'
import type { ToolUsage } from '../../types'

interface Props { tool: ToolUsage }

const INITIAL_VISIBLE = 3

export function ToolUsageItem({ tool }: Props) {
  const isPending = tool.status === 'pending'
  const children = tool.children ?? []
  const hasChildren = children.length > 0
  const [expanded, setExpanded] = useState(false)

  const visibleChildren = expanded ? children : children.slice(0, INITIAL_VISIBLE)
  const hiddenCount = children.length - INITIAL_VISIBLE

  return (
    <div>
      {/* This tool */}
      <div className="flex items-center gap-2 py-[5px] text-[13px] animate-slide-in">
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

      {/* Children — nested with tree line */}
      {hasChildren && (
        <div className="ml-[7px] pl-4 border-l border-border/60">
          {visibleChildren.map((child, i) => (
            <ToolUsageItem key={child.toolUseId ?? i} tool={child} />
          ))}

          {hiddenCount > 0 && !expanded && (
            <button
              onClick={() => setExpanded(true)}
              className="py-[5px] text-[12px] text-muted-foreground/50 hover:text-muted-foreground transition-colors"
            >
              +{hiddenCount} more tool {hiddenCount === 1 ? 'use' : 'uses'}
            </button>
          )}

          {expanded && hiddenCount > 0 && (
            <button
              onClick={() => setExpanded(false)}
              className="py-[5px] text-[12px] text-muted-foreground/50 hover:text-muted-foreground transition-colors"
            >
              Show less
            </button>
          )}
        </div>
      )}
    </div>
  )
}
