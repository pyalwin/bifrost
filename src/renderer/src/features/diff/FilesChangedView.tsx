import { useState, useEffect } from 'react'
import type { DiffFileData, Review } from '../../types'
import { DiffPanel } from './DiffPanel'
import { ReviewTabsBar } from './ReviewTabsBar'
import { cn } from '../../lib/utils'

export type DiffMode = 'all' | 'local'

interface Props {
  files: DiffFileData[]
  theme: 'light' | 'dark'
  reviews: Review[]
  activeReviewId: string | null
  onSelectReview: (id: string) => void
  onSubmitReview: (review: Review) => void
  selectedFile?: string | null
  hasUncommitted?: boolean
}

export function FilesChangedView({ files, theme, reviews, activeReviewId, onSelectReview, onSubmitReview, selectedFile, hasUncommitted }: Props) {
  const [diffMode, setDiffMode] = useState<DiffMode>(hasUncommitted ? 'local' : 'all')
  const [localFiles, setLocalFiles] = useState<DiffFileData[]>([])
  const [loadingLocal, setLoadingLocal] = useState(false)

  // Fetch local diffs when switching to local mode
  useEffect(() => {
    if (diffMode !== 'local') return
    setLoadingLocal(true)
    if (typeof window.claude?.getLocalDiffs === 'function') {
      window.claude.getLocalDiffs()
        .then(f => setLocalFiles(f ?? []))
        .catch(() => setLocalFiles([]))
        .finally(() => setLoadingLocal(false))
    } else {
      setLoadingLocal(false)
    }
  }, [diffMode])

  const activeFiles = diffMode === 'local' ? localFiles : files

  // Sort and filter
  const sortedFiles = [...activeFiles].sort((a, b) => a.filename.localeCompare(b.filename))
  const displayFiles = selectedFile
    ? sortedFiles.filter(f => f.filename === selectedFile)
    : sortedFiles

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
        <ReviewTabsBar
          reviews={reviews}
          activeReviewId={activeReviewId}
          onSelectReview={onSelectReview}
          onStartNewReview={() => {}}
        />
      </div>
      <div className="flex-1 overflow-hidden">
        {loadingLocal ? (
          <div className="h-full flex items-center justify-center text-muted-foreground text-[13px]">
            Loading local changes...
          </div>
        ) : (
          <DiffPanel files={displayFiles} theme={theme} onSubmitReview={onSubmitReview} />
        )}
      </div>
    </div>
  )
}
