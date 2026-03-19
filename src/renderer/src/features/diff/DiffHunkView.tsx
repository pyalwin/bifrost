import { useState, useEffect } from 'react'
import type { DiffHunk, DiffLine, InlineComment, ReviewComment } from '../../types'
import { cn } from '../../lib/utils'
import { InlineCommentThread } from './InlineCommentThread'
import { highlightLine } from './highlighter'

interface Props {
  hunks: DiffHunk[]
  language: string
  theme: 'light' | 'dark'
  commentsByLine?: Map<number, InlineComment[]>
  onLineClick?: (lineNumber: number) => void
  onResolve?: (id: string) => void
  onReply?: (parentId: string, text: string) => void
  reviewComments?: ReviewComment[]
  commentingLine?: number | null
  onAddComment?: (text: string) => void
  onCancelComment?: () => void
  onRemoveComment?: (id: string) => void
}

function LineRow({
  line,
  language,
  theme,
  onGutterClick
}: {
  line: DiffLine
  language: string
  theme: 'light' | 'dark'
  onGutterClick?: () => void
}) {
  const [html, setHtml] = useState<string | null>(null)
  const shikiTheme = theme === 'dark' ? 'github-dark' : 'github-light'

  useEffect(() => {
    highlightLine(line.content, language, shikiTheme).then(setHtml)
  }, [line.content, language, shikiTheme])

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
        {line.type === 'removed' ? '\u2212' : line.type === 'added' ? '+' : ''}
      </span>
      {html ? (
        <span className="whitespace-pre" dangerouslySetInnerHTML={{ __html: html }} />
      ) : (
        <span className="whitespace-pre">{line.content}</span>
      )}
    </div>
  )
}

function CommentInput({ onSubmit, onCancel }: { onSubmit: (text: string) => void; onCancel: () => void }) {
  const [text, setText] = useState('')

  return (
    <div className="px-4 py-2 bg-muted/50 border-y border-border/50">
      <div className="ml-10 flex gap-2 items-start">
        <textarea
          autoFocus
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey && text.trim()) {
              e.preventDefault()
              onSubmit(text.trim())
            }
            if (e.key === 'Escape') onCancel()
          }}
          placeholder="Leave a review comment..."
          className="flex-1 bg-background border border-border rounded-md px-3 py-2 text-[12px] font-sans outline-none focus:border-foreground/30 resize-none"
          rows={2}
        />
        <div className="flex flex-col gap-1">
          <button
            onClick={() => { if (text.trim()) onSubmit(text.trim()) }}
            className="px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white text-[11px] font-medium rounded-md transition-colors"
          >
            Add
          </button>
          <button
            onClick={onCancel}
            className="px-3 py-1.5 text-[11px] text-muted-foreground border border-border rounded-md hover:text-foreground transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}

export function DiffHunkView({
  hunks, language, theme, commentsByLine, onLineClick, onResolve, onReply,
  reviewComments, commentingLine, onAddComment, onCancelComment, onRemoveComment,
}: Props) {
  return (
    <div className="font-mono text-xs leading-[1.85]">
      {hunks.map((hunk, hi) => (
        <div key={hi}>
          {hi > 0 && <div className="h-3" />}
          {hunk.lines.map((line, li) => {
            const lineNum = line.newLineNumber
            const lineComments = lineNum ? commentsByLine?.get(lineNum) : undefined
            const lineReviewComments = lineNum ? reviewComments?.filter(c => c.lineNumber === lineNum) : undefined
            return (
              <div key={`${hi}-${li}`}>
                <LineRow
                  line={line}
                  language={language}
                  theme={theme}
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
                {/* Review comments for this line */}
                {lineReviewComments && lineReviewComments.length > 0 && lineReviewComments.map(rc => (
                  <div key={rc.id} className="px-4 py-1.5 bg-muted/50 border-y border-border/50">
                    <div className="ml-10 bg-background border border-border rounded-md px-3 py-2">
                      <div className="flex items-center gap-2 mb-1 font-sans">
                        <div className="w-5 h-5 bg-muted-foreground/15 rounded-full flex items-center justify-center text-[9px] font-semibold text-muted-foreground">Y</div>
                        <span className="text-[11px] font-semibold">You</span>
                        <span className="text-[11px] text-muted-foreground">· L{rc.lineNumber}</span>
                        {onRemoveComment && (
                          <button
                            onClick={() => onRemoveComment(rc.id)}
                            className="ml-auto text-[11px] text-muted-foreground hover:text-foreground transition-colors"
                          >
                            ×
                          </button>
                        )}
                      </div>
                      <p className="text-[12px] text-foreground/80 leading-relaxed font-sans">{rc.text}</p>
                    </div>
                  </div>
                ))}
                {/* Comment input for this line */}
                {commentingLine === lineNum && onAddComment && onCancelComment && (
                  <CommentInput onSubmit={onAddComment} onCancel={onCancelComment} />
                )}
              </div>
            )
          })}
        </div>
      ))}
    </div>
  )
}
