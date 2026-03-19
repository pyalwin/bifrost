import { useState, useEffect, useRef } from 'react'
import type { DiffFileData, ReviewComment, Review } from '../../types'
import { DiffSummaryHeader } from './DiffSummaryHeader'
import { DiffFile } from './DiffFile'
import { DiffEmptyState } from './EmptyState'

interface Props {
  files: DiffFileData[]
  theme: 'light' | 'dark'
  onSubmitReview?: (review: Review) => void
}

const BATCH_SIZE = 3

export function DiffPanel({ files, theme, onSubmitReview }: Props) {
  const [reviewMode, setReviewMode] = useState(false)
  const [reviewComments, setReviewComments] = useState<ReviewComment[]>([])
  const [commentingLine, setCommentingLine] = useState<{ filename: string; lineNumber: number } | null>(null)
  const [renderedCount, setRenderedCount] = useState(BATCH_SIZE)
  const prevFileKeyRef = useRef('')

  // Only reset progressive rendering when the file set actually changes
  useEffect(() => {
    const key = files.map(f => f.filename).sort().join('\n')
    if (key !== prevFileKeyRef.current) {
      prevFileKeyRef.current = key
      setRenderedCount(BATCH_SIZE)
    }
  }, [files])

  // Progressively render more files
  useEffect(() => {
    if (renderedCount >= files.length) return
    const timer = setTimeout(() => {
      setRenderedCount(prev => Math.min(prev + BATCH_SIZE, files.length))
    }, 50)
    return () => clearTimeout(timer)
  }, [renderedCount, files.length])

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

  if (files.length === 0) return <DiffEmptyState />

  const totalAdditions = files.reduce((sum, f) => sum + f.additions, 0)
  const totalDeletions = files.reduce((sum, f) => sum + f.deletions, 0)
  const visibleFiles = files.slice(0, renderedCount)
  const remaining = files.length - renderedCount

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
        {visibleFiles.map((file) => (
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
        {remaining > 0 && (
          <div className="px-4 py-3 border-b border-border">
            <div className="flex items-center gap-3">
              <span className="shrink-0 w-[14px] h-[14px] relative">
                <span className="absolute inset-0 rounded-full border-[1.5px] border-muted-foreground/30 border-t-muted-foreground animate-spin" />
              </span>
              <span className="text-[12px] text-muted-foreground">
                Loading {remaining} more file{remaining !== 1 ? 's' : ''}...
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
