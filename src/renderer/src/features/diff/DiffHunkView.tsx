import { useState, useEffect } from 'react'
import type { DiffHunk, DiffLine, InlineComment, ReviewComment } from '../../types'
import { cn } from '../../lib/utils'
import { InlineCommentThread } from './InlineCommentThread'
import { highlightLine } from './highlighter'
import { useGitUser } from '../../hooks/use-git-user'

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
  onResolveReviewComment?: (id: string) => void
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
    highlightLine(line.content, language, shikiTheme).then(setHtml).catch(() => {})
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
        className={cn(
          "inline-block w-10 text-right mr-4 select-none text-muted-foreground/50 shrink-0 text-[11px]",
          onGutterClick && "cursor-pointer hover:text-blue-400 hover:bg-blue-400/10 rounded transition-colors"
        )}
        onClick={onGutterClick}
      >
        {line.newLineNumber ?? line.oldLineNumber ?? ''}
      </span>
      {html ? (
        <span className="whitespace-pre-wrap break-all" dangerouslySetInnerHTML={{ __html: html }} />
      ) : (
        <span className="whitespace-pre-wrap break-all">{line.content}</span>
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
  reviewComments, commentingLine, onAddComment, onCancelComment, onRemoveComment, onResolveReviewComment,
}: Props) {
  const gitUser = useGitUser()
  return (
    <div className="font-mono text-xs leading-[1.85]">
      {hunks.map((hunk, hi) => (
        <div key={hi}>
          {hi > 0 && <div className="h-3" />}
          {hunk.lines.map((line, li) => {
            const lineNum = line.newLineNumber ?? line.oldLineNumber
            // Only show comments on the new line number to avoid duplication on removed+added pairs
            const showCommentsHere = line.newLineNumber != null
            const lineComments = (showCommentsHere && lineNum) ? commentsByLine?.get(lineNum) : undefined
            const lineReviewComments = (showCommentsHere && lineNum) ? reviewComments?.filter(c => c.lineNumber === lineNum) : undefined
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
                  <div key={rc.id} className={cn("px-4 py-1.5 border-y border-border/50", rc.resolved ? "bg-green-500/[0.03]" : "bg-muted/50")}>
                    <div className={cn("ml-10 border rounded-md px-3 py-2", rc.resolved ? "bg-background/50 border-green-500/20" : "bg-background border-border")}>
                      <div className="flex items-center gap-2 mb-1 font-sans">
                        {rc.resolved ? (
                          <span className="w-5 h-5 rounded-full bg-green-500/15 flex items-center justify-center text-[10px] text-green-500">✓</span>
                        ) : (
                          <div className="w-5 h-5 bg-muted-foreground/15 rounded-full flex items-center justify-center text-[9px] font-semibold text-muted-foreground">{gitUser.initial}</div>
                        )}
                        <span className={cn("text-[11px] font-semibold", rc.resolved && "text-green-500")}>{rc.resolved ? 'Resolved' : gitUser.name}</span>
                        <span className="text-[11px] text-muted-foreground">· L{rc.lineNumber}</span>
                        <div className="ml-auto flex items-center gap-2">
                          {onResolveReviewComment && (
                            <button
                              onClick={() => onResolveReviewComment(rc.id)}
                              className={cn("text-[10px] transition-colors font-sans", rc.resolved ? "text-green-500 hover:text-muted-foreground" : "text-muted-foreground hover:text-green-500")}
                            >
                              {rc.resolved ? 'Unresolve' : 'Resolve'}
                            </button>
                          )}
                          {onRemoveComment && !rc.resolved && (
                            <button
                              onClick={() => onRemoveComment(rc.id)}
                              className="text-[11px] text-muted-foreground hover:text-foreground transition-colors"
                            >
                              ×
                            </button>
                          )}
                        </div>
                      </div>
                      <p className={cn("text-[12px] leading-relaxed font-sans", rc.resolved ? "text-muted-foreground line-through" : "text-foreground/80")}>{rc.text}</p>
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
