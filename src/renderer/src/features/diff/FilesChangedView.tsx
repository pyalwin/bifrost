import { useState } from 'react'
import type { DiffFileData, Review } from '../../types'
import { FileTree } from './FileTree'
import { DiffPanel } from './DiffPanel'
import { ReviewTabsBar } from './ReviewTabsBar'

interface Props {
  files: DiffFileData[]
  theme: 'light' | 'dark'
  reviews: Review[]
  activeReviewId: string | null
  onSelectReview: (id: string) => void
  onSubmitReview: (review: Review) => void
}

export function FilesChangedView({ files, theme, reviews, activeReviewId, onSelectReview, onSubmitReview }: Props) {
  const [selectedFile, setSelectedFile] = useState<string | null>(files[0]?.filename ?? null)

  return (
    <div className="flex-1 flex flex-col">
      <ReviewTabsBar
        reviews={reviews}
        activeReviewId={activeReviewId}
        onSelectReview={onSelectReview}
        onStartNewReview={() => {}}
      />
      <div className="flex-1 flex overflow-hidden">
        <FileTree
          files={files}
          selectedFile={selectedFile}
          onSelectFile={setSelectedFile}
        />
        <div className="flex-1 overflow-hidden">
          <DiffPanel files={files} theme={theme} onSubmitReview={onSubmitReview} />
        </div>
      </div>
    </div>
  )
}
