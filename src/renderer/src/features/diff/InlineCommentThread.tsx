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
    <div className="px-4 py-2 pl-14">
      <div className="bg-muted border border-border rounded-md px-3 py-2.5">
        {comments.map((comment) => (
          <div key={comment.id}>
            <CommentRow comment={comment} onResolve={onResolve} />
            {comment.replies.map((reply) => (
              <div key={reply.id} className="ml-6 mt-1.5">
                <CommentRow comment={reply} onResolve={onResolve} />
              </div>
            ))}
            <div className="mt-1.5 flex gap-3 ml-6">
              <button
                onClick={() => setReplyingTo(replyingTo === comment.id ? null : comment.id)}
                className="text-[12px] text-muted-foreground hover:text-foreground transition-colors font-sans"
              >
                Reply
              </button>
              <button
                onClick={() => onResolve(comment.id)}
                className="text-[12px] text-muted-foreground hover:text-foreground transition-colors font-sans"
              >
                Resolve
              </button>
            </div>
            {replyingTo === comment.id && (
              <div className="mt-2 flex gap-2 font-sans ml-6">
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
                  className="flex-1 text-[13px] px-2.5 py-1.5 border border-border rounded bg-background outline-none focus:border-foreground/30"
                />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
