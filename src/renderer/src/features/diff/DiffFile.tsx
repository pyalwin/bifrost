import { useState } from 'react'
import type { DiffFileData, InlineComment } from '../../types'
import { DiffFileHeader } from './DiffFileHeader'
import { DiffHunkView } from './DiffHunkView'

interface Props { file: DiffFileData }

export function DiffFile({ file }: Props) {
  const [collapsed, setCollapsed] = useState(false)
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
        onToggleCollapse={() => setCollapsed(!collapsed)}
        onAccept={() => console.log('accept', file.filename)}
        onReject={() => console.log('reject', file.filename)}
      />
      {!collapsed && (
        <DiffHunkView
          hunks={file.hunks}
          commentsByLine={commentsByLine}
          onResolve={handleResolve}
          onReply={handleReply}
          onLineClick={(ln) => console.log('new comment on line', ln)}
        />
      )}
    </div>
  )
}
