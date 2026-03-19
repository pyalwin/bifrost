import { useState } from 'react'
import type { DiffFileData, ReviewComment, Review } from '../../types'
import { DiffSummaryHeader } from './DiffSummaryHeader'
import { DiffFile } from './DiffFile'
import { DiffEmptyState } from './EmptyState'

interface Props {
  files: DiffFileData[]
  theme: 'light' | 'dark'
  onSubmitReview?: (review: Review) => void
}

export function DiffPanel({ files, theme, onSubmitReview }: Props) {
  const [reviewMode, setReviewMode] = useState(false)
  const [reviewComments, setReviewComments] = useState<ReviewComment[]>([])
  const [commentingLine, setCommentingLine] = useState<{ filename: string; lineNumber: number } | null>(null)

  const handleLineClick = (filename: string, lineNumber: number) => {
    if (!reviewMode) return
    setCommentingLine({ filename, lineNumber })
  }

  const handleAddComment = (text: string) => {
    if (!commentingLine) return
    const comment: ReviewComment = {
      id: `rc-${Date.now()}`,
      filename: commentingLine.filename,
      lineNumber: commentingLine.lineNumber,
      text,
      timestamp: Date.now(),
      resolved: false,
    }
    setReviewComments(prev => [...prev, comment])
    setCommentingLine(null)
  }

  const handleCancelComment = () => setCommentingLine(null)

  const handleRemoveComment = (id: string) => {
    setReviewComments(prev => prev.filter(c => c.id !== id))
  }

  const handleSubmitReview = () => {
    if (reviewComments.length === 0) return
    const review: Review = {
      id: `review-${Date.now()}`,
      comments: reviewComments,
      status: 'submitted',
      createdAt: Date.now(),
    }
    onSubmitReview?.(review)
    setReviewComments([])
    setReviewMode(false)
    setCommentingLine(null)
  }

  const handleCancelReview = () => {
    setReviewComments([])
    setReviewMode(false)
    setCommentingLine(null)
  }

  console.log('[DiffPanel] Rendering with', files.length, 'files')
  if (files.length === 0) return <DiffEmptyState />

  const totalAdditions = files.reduce((sum, f) => sum + f.additions, 0)
  const totalDeletions = files.reduce((sum, f) => sum + f.deletions, 0)

  return (
    <div className="h-full flex flex-col">
      <DiffSummaryHeader
        fileCount={files.length}
        additions={totalAdditions}
        deletions={totalDeletions}
        reviewMode={reviewMode}
        reviewCommentCount={reviewComments.length}
        onStartReview={() => setReviewMode(true)}
        onSubmitReview={handleSubmitReview}
        onCancelReview={handleCancelReview}
      />
      <div className="flex-1 overflow-y-auto">
        {files.map((file) => (
          <DiffFile
            key={file.filename}
            file={file}
            theme={theme}
            reviewMode={reviewMode}
            reviewComments={reviewComments.filter(c => c.filename === file.filename)}
            commentingLine={commentingLine?.filename === file.filename ? commentingLine.lineNumber : null}
            onLineClick={(ln) => handleLineClick(file.filename, ln)}
            onAddComment={handleAddComment}
            onCancelComment={handleCancelComment}
            onRemoveComment={handleRemoveComment}
          />
        ))}
      </div>
    </div>
  )
}
