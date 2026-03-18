import { useState } from 'react'
import type { DiffFileData } from '../../types'
import { DiffFileHeader } from './DiffFileHeader'
import { DiffHunkView } from './DiffHunkView'

interface Props { file: DiffFileData }

export function DiffFile({ file }: Props) {
  const [collapsed, setCollapsed] = useState(false)

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
          onLineClick={(ln) => console.log('comment on line', ln, file.filename)}
        />
      )}
    </div>
  )
}
