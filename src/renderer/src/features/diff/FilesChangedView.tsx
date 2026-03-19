import type { DiffFileData, Review } from '../../types'
import { DiffPanel } from './DiffPanel'
import { ReviewTabsBar } from './ReviewTabsBar'

interface Props {
  files: DiffFileData[]
  theme: 'light' | 'dark'
  reviews: Review[]
  activeReviewId: string | null
  onSelectReview: (id: string) => void
  onSubmitReview: (review: Review) => void
  selectedFile?: string | null
}

export function FilesChangedView({ files, theme, reviews, activeReviewId, onSelectReview, onSubmitReview, selectedFile }: Props) {
  // Sort files alphabetically by path to match the file tree order
  const sortedFiles = [...files].sort((a, b) => a.filename.localeCompare(b.filename))

  // Filter to selected file if one is chosen
  const displayFiles = selectedFile
    ? sortedFiles.filter(f => f.filename === selectedFile)
    : sortedFiles

  return (
    <div className="h-full flex flex-col">
      <ReviewTabsBar
        reviews={reviews}
        activeReviewId={activeReviewId}
        onSelectReview={onSelectReview}
        onStartNewReview={() => {}}
      />
      <div className="flex-1 overflow-hidden">
        <DiffPanel files={displayFiles} theme={theme} onSubmitReview={onSubmitReview} />
      </div>
    </div>
  )
}
