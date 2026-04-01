import { useState, useEffect, useRef } from 'react'
import type { DiffFileData, Review, ReviewComment } from '../../types'
import { DiffPanel } from './DiffPanel'
import { cn } from '../../lib/utils'

export type DiffMode = 'all' | 'local' | 'since-review'

interface Props {
  files: DiffFileData[]
  theme: 'light' | 'dark'
  onSubmitReview: (review: Review) => void
  selectedFile?: string | null
  hasUncommitted?: boolean
  reviewComments?: ReviewComment[]
  onAddReviewComment?: (comment: ReviewComment) => void
  onRemoveReviewComment?: (id: string) => void
  onResolveReviewComment?: (id: string) => void
  lastReviewSha?: string
}

export function FilesChangedView({ files, theme, onSubmitReview, selectedFile, hasUncommitted, reviewComments, onAddReviewComment, onRemoveReviewComment, onResolveReviewComment, lastReviewSha }: Props) {
  const defaultMode: DiffMode = lastReviewSha ? 'since-review' : (hasUncommitted ? 'local' : 'all')
  const [diffMode, setDiffMode] = useState<DiffMode>(defaultMode)
  const [localFiles, setLocalFiles] = useState<DiffFileData[]>([])
  const [sinceReviewFiles, setSinceReviewFiles] = useState<DiffFileData[]>([])
  const [loadingLocal, setLoadingLocal] = useState(false)
  const [loadingSinceReview, setLoadingSinceReview] = useState(false)

  // Switch to since-review mode when a lastReviewSha becomes available
  useEffect(() => {
    if (lastReviewSha) {
      setDiffMode('since-review')
    }
  }, [lastReviewSha])

  const filesRef = useRef(files)
  filesRef.current = files

  useEffect(() => {
    if (diffMode !== 'local') return
    setLoadingLocal(true)
    if (typeof window.claude?.getLocalDiffs === 'function') {
      window.claude.getLocalDiffs()
        .then(f => setLocalFiles(f ?? []))
        .catch(() => setLocalFiles(filesRef.current))
        .finally(() => setLoadingLocal(false))
    } else {
      setLocalFiles(filesRef.current)
      setLoadingLocal(false)
    }
  }, [diffMode])

  useEffect(() => {
    if (diffMode !== 'since-review' || !lastReviewSha) return
    setLoadingSinceReview(true)
    if (typeof window.claude?.getDiffSince === 'function') {
      window.claude.getDiffSince(lastReviewSha)
        .then(f => setSinceReviewFiles(f ?? []))
        .catch(() => setSinceReviewFiles(filesRef.current))
        .finally(() => setLoadingSinceReview(false))
    } else {
      setSinceReviewFiles(filesRef.current)
      setLoadingSinceReview(false)
    }
  }, [diffMode, lastReviewSha])

  const activeFiles =
    diffMode === 'local' ? localFiles :
    diffMode === 'since-review' ? sinceReviewFiles :
    files

  const sortedFiles = [...activeFiles].sort((a, b) => a.filename.localeCompare(b.filename))
  const displayFiles = selectedFile
    ? sortedFiles.filter(f => f.filename === selectedFile)
    : sortedFiles

  const isLoading = (diffMode === 'local' && loadingLocal) || (diffMode === 'since-review' && loadingSinceReview)

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center px-4 py-1.5 border-b border-border bg-muted gap-2 shrink-0">
        <div className="flex bg-background border border-border rounded-md overflow-hidden">
          <button
            onClick={() => setDiffMode('local')}
            className={cn(
              'px-2.5 py-1 text-[11px] font-medium transition-colors',
              diffMode === 'local' ? 'bg-foreground text-background' : 'text-muted-foreground hover:text-foreground'
            )}
          >
            Uncommitted
          </button>
          {lastReviewSha && (
            <button
              onClick={() => setDiffMode('since-review')}
              className={cn(
                'px-2.5 py-1 text-[11px] font-medium transition-colors',
                diffMode === 'since-review' ? 'bg-foreground text-background' : 'text-muted-foreground hover:text-foreground'
              )}
            >
              Since last review
            </button>
          )}
          <button
            onClick={() => setDiffMode('all')}
            className={cn(
              'px-2.5 py-1 text-[11px] font-medium transition-colors',
              diffMode === 'all' ? 'bg-foreground text-background' : 'text-muted-foreground hover:text-foreground'
            )}
          >
            All changes
          </button>
        </div>
      </div>
      <div className="flex-1 overflow-hidden">
        {isLoading ? (
          <div className="h-full flex items-center justify-center text-muted-foreground text-[13px]">
            Loading changes...
          </div>
        ) : displayFiles.length === 0 && diffMode === 'since-review' ? (
          <div className="h-full flex items-center justify-center text-muted-foreground text-[13px]">
            No changes since last review
          </div>
        ) : (
          <DiffPanel files={displayFiles} theme={theme} onSubmitReview={onSubmitReview} reviewComments={reviewComments} onAddReviewComment={onAddReviewComment} onRemoveReviewComment={onRemoveReviewComment} onResolveReviewComment={onResolveReviewComment} />
        )}
      </div>
    </div>
  )
}
