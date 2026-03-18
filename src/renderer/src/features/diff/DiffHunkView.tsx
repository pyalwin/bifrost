import type { DiffHunk, DiffLine, InlineComment } from '../../types'
import { cn } from '../../lib/utils'
import { InlineCommentThread } from './InlineCommentThread'

interface Props {
  hunks: DiffHunk[]
  commentsByLine?: Map<number, InlineComment[]>
  onLineClick?: (lineNumber: number) => void
  onResolve?: (id: string) => void
  onReply?: (parentId: string, text: string) => void
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

export function DiffHunkView({ hunks, commentsByLine, onLineClick, onResolve, onReply }: Props) {
  return (
    <div className="font-mono text-xs leading-[1.85]">
      {hunks.map((hunk, hi) => (
        <div key={hi}>
          {hi > 0 && <div className="h-3" />}
          {hunk.lines.map((line, li) => {
            const lineNum = line.newLineNumber
            const lineComments = lineNum ? commentsByLine?.get(lineNum) : undefined
            return (
              <div key={`${hi}-${li}`}>
                <LineRow
                  line={line}
                  onGutterClick={
                    onLineClick && lineNum ? () => onLineClick(lineNum) : undefined
                  }
                />
                {lineComments && lineComments.length > 0 && onResolve && onReply && (
                  <InlineCommentThread
                    comments={lineComments}
                    onResolve={onResolve}
                    onReply={onReply}
                  />
                )}
              </div>
            )
          })}
        </div>
      ))}
    </div>
  )
}
