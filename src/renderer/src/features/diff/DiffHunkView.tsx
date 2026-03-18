import type { DiffHunk, DiffLine } from '../../types'
import { cn } from '../../lib/utils'

interface Props {
  hunks: DiffHunk[]
  onLineClick?: (lineNumber: number) => void
}

function LineRow({ line, onGutterClick }: { line: DiffLine; onGutterClick?: () => void }) {
  return (
    <div
      className={cn(
        'flex px-4',
        line.type === 'removed' && 'bg-diff-removed-bg text-diff-removed-text',
        line.type === 'added' && 'bg-diff-added-bg text-diff-added-text',
        line.type === 'context' && 'text-foreground'
      )}
    >
      <span
        className="inline-block w-10 text-right mr-4 select-none text-muted-foreground shrink-0 cursor-pointer hover:text-foreground transition-colors"
        onClick={onGutterClick}
      >
        {line.type === 'removed' ? '−' : line.type === 'added' ? '+' : ''}
      </span>
      <span className="whitespace-pre">{line.content}</span>
    </div>
  )
}

export function DiffHunkView({ hunks, onLineClick }: Props) {
  return (
    <div className="font-mono text-xs leading-[1.85]">
      {hunks.map((hunk, hi) => (
        <div key={hi}>
          {hi > 0 && <div className="h-3" />}
          {hunk.lines.map((line, li) => (
            <LineRow
              key={`${hi}-${li}`}
              line={line}
              onGutterClick={
                onLineClick && line.newLineNumber
                  ? () => onLineClick(line.newLineNumber!)
                  : undefined
              }
            />
          ))}
        </div>
      ))}
    </div>
  )
}
