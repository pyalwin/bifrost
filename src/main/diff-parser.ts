import parseDiff from 'parse-diff'

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
  ts: 'typescript', tsx: 'tsx', js: 'javascript', jsx: 'javascript',
  py: 'python', rb: 'ruby', go: 'go', rs: 'rust',
  java: 'java', kt: 'kotlin', cs: 'csharp', cpp: 'cpp', c: 'c',
  html: 'html', css: 'css', scss: 'css', json: 'json',
  yaml: 'yaml', yml: 'yaml', md: 'markdown', sh: 'bash',
  bash: 'bash', zsh: 'bash', sql: 'sql', xml: 'html',
}

function detectLanguage(filename: string): string {
  const ext = filename.split('.').pop()?.toLowerCase() ?? ''
  return LANG_MAP[ext] ?? 'text'
}

export function parseUnifiedDiff(diffOutput: string): DiffFileData[] {
  if (!diffOutput.trim()) return []

  const parsed = parseDiff(diffOutput)

  return parsed.map((file) => {
    const filename = (file.to && file.to !== '/dev/null' ? file.to : file.from) ?? 'unknown'

    const hunks: DiffHunk[] = file.chunks.map((chunk) => ({
      oldStart: chunk.oldStart,
      newStart: chunk.newStart,
      lines: chunk.changes.map((change) => {
        if (change.type === 'add') {
          return {
            type: 'added' as const,
            content: change.content.slice(1), // remove leading +
            newLineNumber: change.ln,
          }
        } else if (change.type === 'del') {
          return {
            type: 'removed' as const,
            content: change.content.slice(1), // remove leading -
            oldLineNumber: change.ln,
          }
        } else {
          return {
            type: 'context' as const,
            content: change.content.slice(1), // remove leading space
            oldLineNumber: change.ln1,
            newLineNumber: change.ln2,
          }
        }
      }),
    }))

    return {
      filename,
      language: detectLanguage(filename),
      additions: file.additions,
      deletions: file.deletions,
      hunks,
      comments: [],
      accepted: null,
    }
  })
}
