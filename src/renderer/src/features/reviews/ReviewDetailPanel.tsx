import { useState } from 'react'
import { ArrowLeft, CheckCircle2, Circle, MessageSquare, ExternalLink } from 'lucide-react'
import type { Review, ReviewComment } from '../../types'
import { cn } from '../../lib/utils'

interface Props {
  review: Review
  reviewIndex: number
  comments: ReviewComment[]
  onBack: () => void
  onResolveComment: (id: string) => void
  onSendFollowUp: (message: string) => void
  onNavigateToFile: (filename: string) => void
}

function groupByFile(comments: ReviewComment[]): Map<string, ReviewComment[]> {
  const map = new Map<string, ReviewComment[]>()
  for (const c of comments) {
    const existing = map.get(c.filename) ?? []
    map.set(c.filename, [...existing, c])
  }
  return map
}

function shortenPath(p: string): string {
  const parts = p.split('/')
  return parts.length > 3 ? '…/' + parts.slice(-2).join('/') : p
}

export function ReviewDetailPanel({ review, reviewIndex, comments, onBack, onResolveComment, onSendFollowUp, onNavigateToFile }: Props) {
  const [followUp, setFollowUp] = useState('')
  const [showFollowUp, setShowFollowUp] = useState(false)

  const unresolved = comments.filter(c => !c.resolved)
  const resolved = comments.filter(c => c.resolved)
  const grouped = groupByFile([...unresolved, ...resolved].sort((a, b) =>
    a.filename.localeCompare(b.filename) || a.lineNumber - b.lineNumber
  ))

  const composeFollowUp = () => {
    if (unresolved.length === 0) return ''
    const byFile = groupByFile(unresolved)
    let msg = 'Please address the following outstanding review comments:\n\n'
    for (const [filename, cs] of byFile) {
      msg += `**${filename}:**\n`
      for (const c of cs) {
        msg += `- Line ${c.lineNumber}: ${c.text}\n`
      }
      msg += '\n'
    }
    return msg.trim()
  }

  const handleOpenFollowUp = () => {
    setFollowUp(composeFollowUp())
    setShowFollowUp(true)
  }

  const handleSend = () => {
    if (!followUp.trim()) return
    onSendFollowUp(followUp.trim())
  }

  const statusColors: Record<Review['status'], string> = {
    drafting: 'text-amber-500 bg-amber-500/10',
    submitted: 'text-amber-500 bg-amber-500/10',
    'in-progress': 'text-blue-400 bg-blue-400/10',
    done: 'text-green-500 bg-green-500/10',
  }
  const statusLabel: Record<Review['status'], string> = {
    drafting: 'Drafting',
    submitted: 'Submitted',
    'in-progress': 'In progress',
    done: 'Done',
  }

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Header */}
      <div className="px-5 py-3 border-b border-border shrink-0 flex items-center gap-3">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-[12px] text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          All reviews
        </button>
        <span className="text-muted-foreground/30 text-[11px]">/</span>
        <span className="text-[13px] font-medium">Review #{reviewIndex + 1}</span>
        <span className={cn('ml-auto text-[11px] font-medium px-2 py-0.5 rounded-full', statusColors[review.status])}>
          {statusLabel[review.status]}
        </span>
      </div>

      {/* Stats bar */}
      <div className="px-5 py-2 border-b border-border shrink-0 flex items-center gap-4 text-[12px] text-muted-foreground bg-muted/40">
        <span className="flex items-center gap-1.5">
          <MessageSquare className="w-3.5 h-3.5" />
          {comments.length} comment{comments.length !== 1 ? 's' : ''}
        </span>
        <span className="flex items-center gap-1.5 text-green-500">
          <CheckCircle2 className="w-3.5 h-3.5" />
          {resolved.length} resolved
        </span>
        {unresolved.length > 0 && (
          <span className="flex items-center gap-1.5 text-amber-500">
            <Circle className="w-3.5 h-3.5" />
            {unresolved.length} open
          </span>
        )}
      </div>

      {/* Comment list */}
      <div className="flex-1 overflow-y-auto">
        {comments.length === 0 ? (
          <div className="flex items-center justify-center h-32 text-muted-foreground text-[13px]">
            No comments in this review
          </div>
        ) : (
          <div className="divide-y divide-border">
            {[...grouped.entries()].map(([filename, fileComments]) => (
              <div key={filename}>
                {/* File header */}
                <div className="px-5 py-2 bg-muted/30 flex items-center gap-2 sticky top-0 z-10">
                  <svg width="13" height="13" viewBox="0 0 16 16" fill="currentColor" className="text-muted-foreground/60 shrink-0">
                    <path d="M2 1.75C2 .784 2.784 0 3.75 0h6.586c.464 0 .909.184 1.237.513l2.914 2.914c.329.328.513.773.513 1.237v9.586A1.75 1.75 0 0 1 13.25 16h-9.5A1.75 1.75 0 0 1 2 14.25V1.75z"/>
                  </svg>
                  <span className="text-[12px] font-medium text-foreground/80 truncate" title={filename}>
                    {shortenPath(filename)}
                  </span>
                  <span className="text-[11px] text-muted-foreground/50 shrink-0">
                    {fileComments.filter(c => !c.resolved).length}/{fileComments.length} open
                  </span>
                  <button
                    onClick={() => onNavigateToFile(filename)}
                    title="View diff"
                    className="ml-auto shrink-0 flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground transition-colors px-1.5 py-0.5 rounded hover:bg-muted"
                  >
                    <ExternalLink className="w-3 h-3" />
                    View diff
                  </button>
                </div>

                {/* Comments for this file */}
                {fileComments.map(comment => (
                  <div
                    key={comment.id}
                    className={cn(
                      'px-5 py-3 flex gap-3 transition-colors',
                      comment.resolved ? 'opacity-60' : ''
                    )}
                  >
                    {/* Line number */}
                    <div className="shrink-0 mt-0.5">
                      <span className="text-[11px] font-mono text-muted-foreground/50 bg-muted px-1.5 py-0.5 rounded">
                        L{comment.lineNumber}
                      </span>
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <p className={cn(
                        'text-[13px] leading-relaxed',
                        comment.resolved ? 'line-through text-muted-foreground' : 'text-foreground'
                      )}>
                        {comment.text}
                      </p>
                    </div>

                    {/* Actions */}
                    <div className="shrink-0 flex items-start gap-1.5 mt-0.5">
                      {comment.resolved ? (
                        <>
                          <span className="flex items-center gap-1 text-[11px] text-green-500 font-medium">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            Resolved
                          </span>
                          <button
                            onClick={() => onResolveComment(comment.id)}
                            className="text-[11px] text-muted-foreground hover:text-foreground transition-colors px-1.5 py-0.5 rounded hover:bg-muted"
                          >
                            Undo
                          </button>
                        </>
                      ) : (
                        <button
                          onClick={() => onResolveComment(comment.id)}
                          className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-green-500 transition-colors px-1.5 py-0.5 rounded hover:bg-muted font-medium"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Resolve
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Follow-up footer */}
      {unresolved.length > 0 && !showFollowUp && (
        <div className="px-5 py-3 border-t border-border shrink-0">
          <button
            onClick={handleOpenFollowUp}
            className="w-full flex items-center justify-center gap-2 py-2 text-[12px] font-medium text-amber-500 hover:text-amber-400 border border-dashed border-amber-500/30 hover:border-amber-500/60 rounded-md transition-colors"
          >
            <MessageSquare className="w-3.5 h-3.5" />
            Send {unresolved.length} unresolved comment{unresolved.length !== 1 ? 's' : ''} to Claude
          </button>
        </div>
      )}

      {showFollowUp && (
        <div className="px-5 py-3 border-t border-border shrink-0 flex flex-col gap-2">
          <textarea
            value={followUp}
            onChange={e => setFollowUp(e.target.value)}
            className="w-full text-[12px] bg-muted border border-border rounded-md px-3 py-2 resize-none outline-none focus:ring-1 focus:ring-ring text-foreground placeholder:text-muted-foreground"
            rows={5}
            placeholder="Message to Claude..."
          />
          <div className="flex gap-2 justify-end">
            <button
              onClick={() => setShowFollowUp(false)}
              className="px-3 py-1.5 text-[12px] text-muted-foreground hover:text-foreground transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSend}
              disabled={!followUp.trim()}
              className="px-3 py-1.5 text-[12px] font-medium bg-primary text-primary-foreground rounded-md hover:opacity-80 transition-opacity disabled:opacity-40"
            >
              Send to Claude
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
