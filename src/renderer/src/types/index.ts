export type MessageRole = 'user' | 'assistant'
export type ToolStatus = 'success' | 'error' | 'pending'

export interface ToolUsage {
  action: string
  target: string
  status: ToolStatus
}

export interface Message {
  id: string
  role: MessageRole
  content: string
  thinkingTime?: number
  tools?: ToolUsage[]
}

export interface DiffHunk {
  oldStart: number
  newStart: number
  lines: DiffLine[]
}

export interface DiffLine {
  type: 'added' | 'removed' | 'context'
  content: string
  oldLineNumber?: number
  newLineNumber?: number
}

export interface InlineComment {
  id: string
  lineNumber: number
  author: string
  text: string
  timestamp: string
  resolved: boolean
  replies: InlineComment[]
}

export interface DiffFileData {
  filename: string
  language: string
  additions: number
  deletions: number
  hunks: DiffHunk[]
  comments: InlineComment[]
  accepted?: boolean | null
}

export interface Conversation {
  id: string
  messages: Message[]
  diffs: DiffFileData[]
  branch: string
}
