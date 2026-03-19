import { useState, useCallback, useMemo } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { cn } from '../../lib/utils'
import { useGitUser } from '../../hooks/use-git-user'
import type { PlanComment } from '../../types'

interface Props {
  title: string
  filePath: string
  content: string
  theme: 'light' | 'dark'
  onClose: () => void
  onApprove: (comments: PlanComment[]) => void
  onRevise: (comments: PlanComment[]) => void
}

function CommentBubble({ comment, onDelete, userName, userInitial }: { comment: PlanComment; onDelete: () => void; userName: string; userInitial: string }) {
  return (
    <div className="mt-2 mb-1 bg-muted border border-border rounded-lg px-3 py-2.5">
      <div className="flex items-center gap-1.5 mb-1">
        <div className="w-[18px] h-[18px] rounded-full bg-accent flex items-center justify-center text-[9px] font-bold text-muted-foreground">{userInitial}</div>
        <span className="text-[11px] font-semibold text-secondary">{userName}</span>
        <button onClick={onDelete} className="ml-auto text-[10px] text-muted-foreground hover:text-foreground transition-colors">Delete</button>
      </div>
      <p className="text-[12px] text-foreground leading-relaxed">{comment.text}</p>
    </div>
  )
}

function CommentInput({ onSave, onCancel }: { onSave: (text: string) => void; onCancel: () => void }) {
  const [text, setText] = useState('')
  return (
    <div className="mt-2 mb-1 flex gap-2 items-start">
      <textarea
        autoFocus
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !e.shiftKey && text.trim()) { e.preventDefault(); onSave(text.trim()) }
          if (e.key === 'Escape') onCancel()
        }}
        placeholder="Add a comment on this block..."
        className="flex-1 bg-background border border-border rounded-md px-3 py-2 text-[12px] outline-none focus:border-muted-foreground resize-none"
        rows={2}
      />
      <div className="flex flex-col gap-1">
        <button onClick={() => { if (text.trim()) onSave(text.trim()) }} className="px-3 py-1.5 bg-foreground text-background text-[11px] font-medium rounded-md transition-opacity hover:opacity-85">Save</button>
        <button onClick={onCancel} className="px-3 py-1.5 text-[11px] text-muted-foreground border border-border rounded-md hover:text-foreground transition-colors">Cancel</button>
      </div>
    </div>
  )
}

export function PlanReview({ title, filePath, content, theme, onClose, onApprove, onRevise }: Props) {
  const [comments, setComments] = useState<PlanComment[]>([])
  const [commentingBlock, setCommentingBlock] = useState<number | null>(null)
  const gitUser = useGitUser()

  // Split markdown into blocks — respects code fences, groups by double newline
  const blocks = useMemo(() => {
    const lines = content.split('\n')
    const result: string[] = []
    let current: string[] = []
    let inCodeBlock = false

    for (const line of lines) {
      if (line.startsWith('```')) {
        if (inCodeBlock) {
          current.push(line)
          result.push(current.join('\n'))
          current = []
          inCodeBlock = false
        } else {
          if (current.length > 0) result.push(current.join('\n'))
          current = [line]
          inCodeBlock = true
        }
      } else if (!inCodeBlock && line.trim() === '' && current.length > 0) {
        result.push(current.join('\n'))
        current = []
      } else {
        current.push(line)
      }
    }
    if (current.length > 0) result.push(current.join('\n'))
    return result.filter(b => b.trim())
  }, [content])

  const addComment = useCallback((blockIndex: number, text: string) => {
    setComments(prev => [...prev, {
      id: `pc-${Date.now()}`,
      blockIndex,
      text,
      timestamp: Date.now(),
    }])
    setCommentingBlock(null)
  }, [])

  const deleteComment = useCallback((id: string) => {
    setComments(prev => prev.filter(c => c.id !== id))
  }, [])

  const shortPath = filePath.split('/').slice(-3).join('/')

  return (
    <div className="h-full flex flex-col">
      {/* Toolbar */}
      <div className="h-12 px-5 bg-title-bar border-b border-border flex items-center gap-3 shrink-0">
        <span className="text-[13px] font-semibold truncate tracking-tight">{title}</span>
        <span className="text-[10px] text-muted-foreground/60 font-mono truncate max-w-[200px]">{shortPath}</span>
        {comments.length > 0 && (
          <span className="text-[10px] font-semibold px-2.5 py-0.5 rounded-full bg-yellow-500/10 text-yellow-500">
            {comments.length} comment{comments.length !== 1 ? 's' : ''}
          </span>
        )}
        <span className="flex-1" />
        <button onClick={onClose} className="px-3 py-1.5 text-[12px] text-muted-foreground hover:text-foreground border border-border rounded-md transition-colors">Close</button>
        {comments.length > 0 && (
          <button
            onClick={() => onRevise(comments)}
            className="px-3 py-1.5 text-[12px] font-semibold rounded-md transition-colors bg-yellow-500/10 text-yellow-500 hover:bg-yellow-500/20 flex items-center gap-1.5"
          >
            <svg width="13" height="13" viewBox="0 0 16 16" fill="currentColor"><path d="M11.013 1.427a1.75 1.75 0 012.474 0l1.086 1.086a1.75 1.75 0 010 2.474l-8.61 8.61c-.21.21-.47.364-.756.445l-3.251.93a.75.75 0 01-.927-.928l.929-3.25c.081-.286.235-.547.445-.758l8.61-8.61z"/></svg>
            Request Revision
          </button>
        )}
        <button
          onClick={() => onApprove(comments)}
          className="px-3 py-1.5 text-[12px] font-semibold rounded-md transition-colors bg-green-500/10 text-green-500 hover:bg-green-500/20 flex items-center gap-1.5"
        >
          <svg width="13" height="13" viewBox="0 0 16 16" fill="currentColor"><path d="M13.78 4.22a.75.75 0 010 1.06l-7.25 7.25a.75.75 0 01-1.06 0L2.22 9.28a.75.75 0 011.06-1.06L6 10.94l6.72-6.72a.75.75 0 011.06 0z"/></svg>
          Approve & Implement
        </button>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Plan content */}
        <div className="flex-1 overflow-y-auto px-8 py-8">
          <div className="max-w-[720px] mx-auto">
            {blocks.map((block, i) => {
              const blockComments = comments.filter(c => c.blockIndex === i)
              const hasComments = blockComments.length > 0
              return (
                <div
                  key={i}
                  className={cn(
                    'group relative pl-10 py-0.5 rounded transition-colors',
                    hasComments && 'bg-yellow-500/[0.03] border-l-2 border-yellow-500/30 pl-[38px]'
                  )}
                >
                  <button
                    onClick={() => setCommentingBlock(commentingBlock === i ? null : i)}
                    className={cn(
                      'absolute left-0 top-1 w-6 h-6 rounded-md flex items-center justify-center text-[12px] transition-all',
                      hasComments
                        ? 'opacity-100 text-yellow-500'
                        : 'opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-foreground hover:bg-muted'
                    )}
                  >
                    💬
                  </button>
                  <div className="prose-plan">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{block}</ReactMarkdown>
                  </div>
                  {blockComments.map(c => (
                    <CommentBubble key={c.id} comment={c} onDelete={() => deleteComment(c.id)} userName={gitUser.name} userInitial={gitUser.initial} />
                  ))}
                  {commentingBlock === i && (
                    <CommentInput onSave={(text) => addComment(i, text)} onCancel={() => setCommentingBlock(null)} />
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* Comments sidebar */}
        {comments.length > 0 && (
          <div className="w-[240px] border-l border-border bg-title-bar flex flex-col shrink-0">
            <div className="px-4 py-3 border-b border-border text-[12px] font-semibold text-secondary">
              Comments ({comments.length})
            </div>
            <div className="flex-1 overflow-y-auto p-2">
              {comments.map(c => (
                <div
                  key={c.id}
                  className="px-3 py-2.5 bg-background border border-border rounded-lg mb-1.5 cursor-pointer hover:border-muted-foreground transition-colors"
                >
                  <div className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wide mb-1">
                    Block {c.blockIndex + 1}
                  </div>
                  <div className="text-[12px] text-secondary leading-relaxed line-clamp-2">{c.text}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
