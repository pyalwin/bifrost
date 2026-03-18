import type { DiffFileData } from '../../types'
import { DiffSummaryHeader } from './DiffSummaryHeader'
import { DiffFile } from './DiffFile'
import { DiffEmptyState } from './EmptyState'

interface Props { files: DiffFileData[] }

export function DiffPanel({ files }: Props) {
  if (files.length === 0) return <DiffEmptyState />

  const totalAdditions = files.reduce((sum, f) => sum + f.additions, 0)
  const totalDeletions = files.reduce((sum, f) => sum + f.deletions, 0)

  return (
    <div className="h-full flex flex-col">
      <DiffSummaryHeader
        fileCount={files.length}
        additions={totalAdditions}
        deletions={totalDeletions}
        onAcceptAll={() => console.log('accept all')}
        onRejectAll={() => console.log('reject all')}
      />
      <div className="flex-1 overflow-y-auto">
        {files.map((file) => (
          <DiffFile key={file.filename} file={file} />
        ))}
      </div>
    </div>
  )
}
