export type MessageRole = 'user' | 'assistant'
export type ToolStatus = 'success' | 'error' | 'pending'

export interface ToolUsage {
  action: string
  target: string
  status: ToolStatus
  toolUseId?: string
  children?: ToolUsage[]
}

export interface ImageAttachment {
  base64: string
  mediaType: string
  name: string
}

export interface Message {
  id: string
  role: MessageRole
  content: string
  images?: ImageAttachment[]
  thinkingTime?: number
  tools?: ToolUsage[]
  isStreaming?: boolean      // true while this message is still being streamed
  isThinking?: boolean       // true while Claude is thinking (before text starts)
  question?: {               // AskUserQuestion — Claude is asking for user input
    toolUseId: string
    text: string
    header?: string
    options?: Array<{ label: string; description?: string }>
  }
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

// Connection state for session lifecycle
export type ConnectionState = 'idle' | 'connecting' | 'active' | 'disconnected'

export interface SessionInfo {
  id: string
  workingDir: string
  firstMessage: string
  timestamp: number
}

export type ContentBlock =
  | { type: 'text'; text: string }
  | { type: 'thinking'; thinking: string }
  | { type: 'tool_use'; id: string; name: string; input: Record<string, unknown> }

export type CLIEvent =
  | { type: 'system'; subtype: 'init'; session_id: string; tools: string[] }
  | { type: 'system'; subtype: 'status'; message: string }
  | { type: 'assistant'; message: { content: ContentBlock[] } }
  | { type: 'stream_event'; subtype: 'content_block_delta'; delta: { text?: string } }
  | { type: 'tool_progress'; tool_name: string; progress: string }
  | {
      type: 'tool_use_summary'
      tool_name: string
      input: Record<string, unknown>
      output: string
      is_error: boolean
    }
  | { type: 'control_request'; id: string; tool_name: string; input: Record<string, unknown> }
  | {
      type: 'result'
      session_id: string
      cost_usd: number
      duration_ms: number
      is_error: boolean
      result: string
    }
  | { type: 'keep_alive' }

export interface ClaudeAPI {
  startSession(workingDir: string): Promise<void>
  resumeSession(sessionId: string, workingDir: string): Promise<void>
  listSessions(): Promise<SessionInfo[]>
  cancelTurn(): Promise<void>
  sendMessage(text: string, images?: ImageAttachment[]): Promise<void>
  selectImages(): Promise<ImageAttachment[]>
  sendControlResponse(requestId: string, approved: boolean): Promise<void>
  onMessage(callback: (event: CLIEvent) => void): () => void
  onConnectionStateChange(callback: (state: ConnectionState) => void): () => void
  onDiffUpdate(callback: (diffs: DiffFileData[]) => void): () => void
  onBranchChange(callback: (branch: string) => void): () => void
  selectDirectory(): Promise<string | null>
  archiveItem(type: 'project' | 'session', id: string): Promise<void>
  unarchiveItem(type: 'project' | 'session', id: string): Promise<void>
  getArchived(): Promise<{ projects: string[]; sessions: string[] }>
  listBranches(): Promise<string[]>
  checkoutBranch(branchName: string, createNew: boolean): Promise<{ success: boolean; error?: string }>
}

declare global {
  interface Window {
    claude: ClaudeAPI
  }
}
