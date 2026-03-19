import { useState } from 'react'
import { ChevronDown, ChevronRight, Search } from 'lucide-react'
import { cn } from '../../lib/utils'
import type { DiffFileData } from '../../types'

interface Props {
  files: DiffFileData[]
  selectedFile: string | null
  onSelectFile: (filename: string) => void
}

interface FolderNode {
  name: string
  path: string
  files: DiffFileData[]
  children: Map<string, FolderNode>
}

function buildTree(files: DiffFileData[]): FolderNode {
  const root: FolderNode = { name: '', path: '', files: [], children: new Map() }

  for (const file of files) {
    const parts = file.filename.split('/')
    parts.pop() // strip filename, keep directory parts
    let current = root

    for (const part of parts) {
      if (!current.children.has(part)) {
        current.children.set(part, {
          name: part,
          path: current.path ? `${current.path}/${part}` : part,
          files: [],
          children: new Map(),
        })
      }
      current = current.children.get(part)!
    }

    current.files.push(file)
  }

  return root
}

function FolderRow({ node, selectedFile, onSelectFile, depth = 0 }: {
  node: FolderNode; selectedFile: string | null; onSelectFile: (f: string) => void; depth?: number
}) {
  const [expanded, setExpanded] = useState(true)
  const children = Array.from(node.children.values())

  return (
    <div>
      {node.name && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full flex items-center gap-1.5 px-3 py-[3px] text-[12px] text-muted-foreground hover:text-foreground transition-colors"
          style={{ paddingLeft: 12 + depth * 12 }}
        >
          {expanded ? <ChevronDown className="w-3 h-3 shrink-0" /> : <ChevronRight className="w-3 h-3 shrink-0" />}
          <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor" opacity="0.5"><path d="M1.75 1A1.75 1.75 0 000 2.75v10.5C0 14.216.784 15 1.75 15h12.5A1.75 1.75 0 0016 13.25v-8.5A1.75 1.75 0 0014.25 3H7.5a.25.25 0 01-.2-.1l-.9-1.2c-.33-.44-.85-.7-1.4-.7H1.75z"/></svg>
          <span className="truncate">{node.name}</span>
        </button>
      )}
      {(expanded || !node.name) && (
        <>
          {children.map(child => (
            <FolderRow key={child.path} node={child} selectedFile={selectedFile} onSelectFile={onSelectFile} depth={node.name ? depth + 1 : depth} />
          ))}
          {node.files.map(file => {
            const isSelected = file.filename === selectedFile
            const isAdded = file.deletions === 0 && file.additions > 0
            const isDeleted = file.additions === 0 && file.deletions > 0
            const dotColor = isAdded ? 'bg-green-500' : isDeleted ? 'bg-red-500' : 'bg-amber-500'
            const fileName = file.filename.split('/').pop()

            return (
              <button
                key={file.filename}
                onClick={() => onSelectFile(file.filename)}
                className={cn(
                  'w-full flex items-center gap-1.5 px-3 py-[3px] text-[12px] transition-colors',
                  isSelected
                    ? 'bg-blue-500/10 text-foreground border-l-2 border-blue-500'
                    : 'text-secondary hover:text-foreground hover:bg-muted'
                )}
                style={{ paddingLeft: (node.name ? 12 + (depth + 1) * 12 : 12 + depth * 12) + (isSelected ? -2 : 0) }}
              >
                <span className={cn('w-[6px] h-[6px] rounded-full shrink-0', dotColor)} />
                <span className="truncate">{fileName}</span>
              </button>
            )
          })}
        </>
      )}
    </div>
  )
}

export function FileTree({ files, selectedFile, onSelectFile }: Props) {
  const [filter, setFilter] = useState('')
  const filteredFiles = filter
    ? files.filter(f => f.filename.toLowerCase().includes(filter.toLowerCase()))
    : files
  const tree = buildTree(filteredFiles)

  return (
    <div className="w-[240px] bg-title-bar border-r border-border flex flex-col shrink-0">
      <div className="p-2 border-b border-border">
        <div className="flex items-center gap-2 px-2 py-1.5 bg-background border border-border rounded-md">
          <Search className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
          <input
            value={filter}
            onChange={e => setFilter(e.target.value)}
            placeholder="Filter files..."
            className="flex-1 text-[12px] bg-transparent outline-none placeholder:text-muted-foreground/50"
          />
        </div>
      </div>
      <div className="flex-1 overflow-y-auto py-1">
        <FolderRow node={tree} selectedFile={selectedFile} onSelectFile={onSelectFile} />
      </div>
    </div>
  )
}
