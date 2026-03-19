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

export interface ReviewComment {
  id: string
  filename: string
  lineNumber: number
  text: string
  timestamp: number
  resolved: boolean
}

export interface PlanComment {
  id: string
  blockIndex: number
  text: string
  timestamp: number
}

export interface Review {
  id: string
  comments: ReviewComment[]
  status: 'drafting' | 'submitted' | 'in-progress' | 'done'
  createdAt: number
  sessionId?: string
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

export interface BranchGroup {
  name: string
  baseBranch: string | null
  sessions: SessionInfo[]
  latestTimestamp: number
}

export interface ProjectHierarchy {
  name: string
  workingDir: string
  branches: BranchGroup[]
  latestTimestamp: number
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

export interface PullRequest {
  number: number
  title: string
  url: string
  state: 'OPEN' | 'CLOSED' | 'MERGED'
  isDraft: boolean
  baseBranch: string
  headBranch: string
  additions: number
  deletions: number
  commits: number
}

export interface ClaudeAPI {
  startSession(workingDir: string): Promise<void>
  resumeSession(sessionId: string, workingDir: string): Promise<void>
  listSessions(): Promise<SessionInfo[]>
  listSessionsGrouped(): Promise<ProjectHierarchy[]>
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
  saveReviews(data: { reviews: Review[]; comments: ReviewComment[] }): Promise<void>
  loadReviews(): Promise<{ reviews: Review[]; comments: ReviewComment[] }>
  getLocalDiffs(): Promise<DiffFileData[]>
  generateCommitMessage(): Promise<string>
  getStagedFiles(): Promise<{ staged: string[]; unstaged: string[] }>
  stageAll(): Promise<void>
  gitCommit(message: string): Promise<{ success: boolean; error?: string }>
  openExternal(url: string): Promise<void>
  getGitUser(): Promise<{ name: string; initial: string }>
  getGitStatus(): Promise<{ hasUncommitted: boolean; unpushedCount: number }>
  listBranches(): Promise<string[]>
  checkoutBranch(branchName: string, createNew: boolean): Promise<{ success: boolean; error?: string }>
  setBaseBranch(branch: string | null): Promise<void>
  getBaseBranch(): Promise<string | null>
  openInIDE(ide: 'vscode' | 'cursor' | 'pycharm'): Promise<void>
  getPRPrefill(): Promise<{ title: string; body: string }>
  getPullRequest(): Promise<PullRequest | null>
  createPullRequest(title: string, body: string, baseBranch?: string): Promise<{ success: boolean; pr?: PullRequest; error?: string }>
  loadPlanFile(filePath: string): Promise<string | null>
  listCommits(): Promise<Array<{ sha: string; fullSha?: string; message: string; author: string; timeAgo: string; url?: string }>>
}

declare global {
  interface Window {
    claude: ClaudeAPI
  }
}
