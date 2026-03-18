interface DiffLine {
  type: 'added' | 'removed' | 'context'
  content: string
  oldLineNumber?: number
  newLineNumber?: number
}

interface DiffHunk {
  oldStart: number
  newStart: number
  lines: DiffLine[]
}

interface DiffFileData {
  filename: string
  language: string
  additions: number
  deletions: number
  hunks: DiffHunk[]
  comments: never[]
  accepted: null
}

const LANG_MAP: Record<string, string> = {
  ts: 'typescript',
  tsx: 'tsx',
  js: 'javascript',
  jsx: 'javascript',
  py: 'python',
  rb: 'ruby',
  go: 'go',
  rs: 'rust',
  java: 'java',
  kt: 'kotlin',
  cs: 'csharp',
  cpp: 'cpp',
  c: 'c',
  html: 'html',
  css: 'css',
  scss: 'css',
  json: 'json',
  yaml: 'yaml',
  yml: 'yaml',
  md: 'markdown',
  sh: 'bash',
  bash: 'bash',
  zsh: 'bash',
  sql: 'sql',
  xml: 'html'
}

function detectLanguage(filename: string): string {
  const ext = filename.split('.').pop()?.toLowerCase() ?? ''
  return LANG_MAP[ext] ?? 'text'
}

export function parseUnifiedDiff(diffOutput: string): DiffFileData[] {
  const files: DiffFileData[] = []
  const fileChunks = diffOutput.split(/^diff --git /m).filter(Boolean)

  for (const chunk of fileChunks) {
    const lines = chunk.split('\n')
    const headerMatch = lines[0]?.match(/a\/(.+?) b\/(.+)/)
    if (!headerMatch) continue
    const filename = headerMatch[2]

    const hunks: DiffHunk[] = []
    let additions = 0
    let deletions = 0
    let currentHunk: DiffHunk | null = null
    let oldLine = 0
    let newLine = 0

    for (const line of lines) {
      const hunkMatch = line.match(/^@@ -(\d+)(?:,\d+)? \+(\d+)(?:,\d+)? @@/)
      if (hunkMatch) {
        currentHunk = {
          oldStart: parseInt(hunkMatch[1]),
          newStart: parseInt(hunkMatch[2]),
          lines: []
        }
        hunks.push(currentHunk)
        oldLine = parseInt(hunkMatch[1])
        newLine = parseInt(hunkMatch[2])
        continue
      }
      if (!currentHunk) continue
      if (line.startsWith('+')) {
        currentHunk.lines.push({ type: 'added', content: line.slice(1), newLineNumber: newLine++ })
        additions++
      } else if (line.startsWith('-')) {
        currentHunk.lines.push({
          type: 'removed',
          content: line.slice(1),
          oldLineNumber: oldLine++
        })
        deletions++
      } else if (line.startsWith(' ')) {
        currentHunk.lines.push({
          type: 'context',
          content: line.slice(1),
          oldLineNumber: oldLine++,
          newLineNumber: newLine++
        })
      }
    }

    files.push({
      filename,
      language: detectLanguage(filename),
      additions,
      deletions,
      hunks,
      comments: [],
      accepted: null
    })
  }
  return files
}
