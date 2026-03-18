import { useState } from 'react'
import type { DiffFileData } from '../../types'
import { DiffFileHeader } from './DiffFileHeader'

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
        <div className="font-mono text-xs leading-[1.85] px-4 py-3 text-muted-foreground text-center text-[11px]">
          Diff content placeholder
        </div>
      )}
    </div>
  )
}
