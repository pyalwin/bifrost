import { useState } from 'react'
import type { InlineComment } from '../../types'
import { CommentRow } from './CommentRow'

interface Props {
  comments: InlineComment[]
  onResolve: (id: string) => void
  onReply: (parentId: string, text: string) => void
}

export function InlineCommentThread({ comments, onResolve, onReply }: Props) {
  const [replyingTo, setReplyingTo] = useState<string | null>(null)
  const [replyText, setReplyText] = useState('')

  return (
    <div className="px-4 py-3 pl-14 border-t border-b border-border bg-amber-50 dark:bg-amber-950/30">
      {comments.map((comment) => (
        <div key={comment.id}>
          <CommentRow comment={comment} onResolve={onResolve} />
          {comment.replies.map((reply) => (
            <div key={reply.id} className="ml-4 mt-1">
              <CommentRow comment={reply} onResolve={onResolve} />
            </div>
          ))}
          <div className="mt-1 flex gap-2">
            <button
              onClick={() => setReplyingTo(replyingTo === comment.id ? null : comment.id)}
              className="text-[10px] text-amber-600/70 hover:text-amber-700 dark:text-amber-500/70 dark:hover:text-amber-400 transition-colors font-sans"
            >
              Reply
            </button>
            <span className="text-[10px] text-amber-600/40 dark:text-amber-500/40 font-sans">·</span>
            <button
              onClick={() => onResolve(comment.id)}
              className="text-[10px] text-amber-600/70 hover:text-amber-700 dark:text-amber-500/70 dark:hover:text-amber-400 transition-colors font-sans"
            >
              Resolve
            </button>
          </div>
          {replyingTo === comment.id && (
            <div className="mt-2 flex gap-2 font-sans">
              <input
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && replyText.trim()) {
                    onReply(comment.id, replyText.trim())
                    setReplyText('')
                    setReplyingTo(null)
                  }
                }}
                placeholder="Reply..."
                className="flex-1 text-[11px] px-2 py-1 border border-border rounded bg-background outline-none"
              />
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
