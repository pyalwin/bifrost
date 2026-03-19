import { useState } from 'react'
import type { DiffFileData, InlineComment, ReviewComment } from '../../types'
import { DiffFileHeader } from './DiffFileHeader'
import { DiffHunkView } from './DiffHunkView'

interface Props {
  file: DiffFileData
  theme: 'light' | 'dark'
  reviewMode?: boolean
  reviewComments?: ReviewComment[]
  commentingLine?: number | null
  onLineClick?: (lineNumber: number) => void
  onAddComment?: (text: string) => void
  onCancelComment?: () => void
  onRemoveComment?: (id: string) => void
}

export function DiffFile({ file, theme, reviewMode, reviewComments, commentingLine, onLineClick, onAddComment, onCancelComment, onRemoveComment }: Props) {
  const [collapsed, setCollapsed] = useState(false)
  const [viewed, setViewed] = useState(false)
  const [comments, setComments] = useState<InlineComment[]>(file.comments)

  const commentsByLine = new Map<number, InlineComment[]>()
  comments.forEach((c) => {
    const existing = commentsByLine.get(c.lineNumber) ?? []
    commentsByLine.set(c.lineNumber, [...existing, c])
  })

  const handleResolve = (id: string) => {
    setComments((prev) =>
      prev.map((c) => (c.id === id ? { ...c, resolved: !c.resolved } : c))
    )
  }

  const handleReply = (parentId: string, text: string) => {
    setComments((prev) =>
      prev.map((c) =>
        c.id === parentId
          ? {
              ...c,
              replies: [
                ...c.replies,
                {
                  id: `${parentId}-r${c.replies.length + 1}`,
                  lineNumber: c.lineNumber,
                  author: 'You',
                  text,
                  timestamp: 'just now',
                  resolved: false,
                  replies: [],
                },
              ],
            }
          : c
      )
    )
  }

  return (
    <div className="border-b border-border">
      <DiffFileHeader
        filename={file.filename}
        additions={file.additions}
        deletions={file.deletions}
        collapsed={collapsed}
        viewed={viewed}
        onToggleCollapse={() => setCollapsed(!collapsed)}
        onToggleViewed={() => {
          const next = !viewed
          setViewed(next)
          if (next) setCollapsed(true)
        }}
      />
      {!collapsed && (
        <DiffHunkView
          hunks={file.hunks}
          language={file.language}
          theme={theme}
          commentsByLine={commentsByLine}
          onResolve={handleResolve}
          onReply={handleReply}
          onLineClick={reviewMode ? onLineClick : undefined}
          reviewComments={reviewComments}
          commentingLine={commentingLine}
          onAddComment={onAddComment}
          onCancelComment={onCancelComment}
          onRemoveComment={onRemoveComment}
        />
      )}
    </div>
  )
}
