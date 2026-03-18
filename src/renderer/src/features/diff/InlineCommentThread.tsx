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
    <div className="px-4 py-1 pl-14">
      <div className="bg-muted border border-border rounded-md overflow-hidden">
        {comments.map((comment) => {
          // Flatten: parent + replies all render at same level, separated by dividers
          const allMessages = [comment, ...comment.replies]
          return (
            <div key={comment.id}>
              {allMessages.map((msg, i) => (
                <div key={msg.id}>
                  {i > 0 && <div className="border-t border-border" />}
                  <div className="px-3">
                    <CommentRow comment={msg} />
                  </div>
                </div>
              ))}
              {/* Actions bar */}
              <div className="border-t border-border px-3 py-2 flex items-center gap-2">
                {replyingTo === comment.id ? (
                  <div className="flex gap-2 flex-1 font-sans">
                    <input
                      autoFocus
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && replyText.trim()) {
                          onReply(comment.id, replyText.trim())
                          setReplyText('')
                          setReplyingTo(null)
                        }
                        if (e.key === 'Escape') {
                          setReplyText('')
                          setReplyingTo(null)
                        }
                      }}
                      placeholder="Write a reply..."
                      className="flex-1 text-[13px] px-2.5 py-1.5 border border-border rounded bg-background outline-none focus:border-foreground/30"
                    />
                    <button
                      onClick={() => {
                        if (replyText.trim()) {
                          onReply(comment.id, replyText.trim())
                          setReplyText('')
                          setReplyingTo(null)
                        }
                      }}
                      className="text-[12px] font-medium px-3 py-1.5 bg-primary text-primary-foreground rounded hover:opacity-80 transition-opacity font-sans"
                    >
                      Reply
                    </button>
                    <button
                      onClick={() => { setReplyText(''); setReplyingTo(null) }}
                      className="text-[12px] text-muted-foreground hover:text-foreground transition-colors font-sans"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <>
                    <button
                      onClick={() => setReplyingTo(comment.id)}
                      className="text-[12px] text-muted-foreground hover:text-foreground transition-colors font-sans"
                    >
                      Reply
                    </button>
                    <span className="text-[12px] text-muted-foreground/40">·</span>
                    <button
                      onClick={() => onResolve(comment.id)}
                      className="text-[12px] text-muted-foreground hover:text-foreground transition-colors font-sans"
                    >
                      {comment.resolved ? 'Unresolve' : 'Resolve'}
                    </button>
                  </>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
