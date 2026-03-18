# CLI Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Connect the Claude Code UI to a real Claude Code CLI session via WebSocket SDK mode, replacing mock data with live streaming conversations, tool approval, and live git diffs.

**Architecture:** Electron main process hosts three services (WsBridge, SessionManager, GitWatcher) communicating with the React renderer via IPC. The renderer adds rich content rendering (markdown, mermaid, streaming) and new UI states (start screen, tool approval, connection status).

**Tech Stack:** ws, chokidar, react-markdown, remark-gfm, mermaid (added to existing Electron + React + Tailwind + shadcn stack)

**Spec:** `docs/superpowers/specs/2026-03-18-cli-integration-design.md`

---

## File Structure

```
src/
├── main/
│   ├── index.ts                          # MODIFY — wire services, IPC handlers
│   ├── ws-bridge.ts                      # CREATE — WebSocket server for CLI
│   ├── session-manager.ts                # CREATE — CLI child process lifecycle
│   ├── git-watcher.ts                    # CREATE — chokidar + git diff parsing
│   ├── diff-parser.ts                    # CREATE — parse unified diff → DiffFileData[]
│   └── cli-discovery.ts                  # CREATE — find claude binary, check version
├── preload/
│   └── index.ts                          # MODIFY — expose ClaudeAPI via contextBridge
├── renderer/src/
│   ├── App.tsx                           # MODIFY — connection state, start screen routing
│   ├── types/
│   │   └── index.ts                      # MODIFY — add CLIEvent, ConnectionState, SessionInfo, ContentBlock
│   ├── hooks/
│   │   ├── use-theme.ts                  # existing
│   │   ├── use-auto-scroll.ts            # existing
│   │   └── use-claude.ts                 # CREATE — hook wrapping window.claude IPC
│   ├── features/
│   │   ├── title-bar/
│   │   │   └── TitleBar.tsx              # MODIFY — add status dot, shield toggle
│   │   ├── start-screen/
│   │   │   └── StartScreen.tsx           # CREATE — new/resume session UI
│   │   ├── chat/
│   │   │   ├── ChatPanel.tsx             # MODIFY — use live messages + streaming
│   │   │   ├── MessageList.tsx           # MODIFY — handle streaming messages
│   │   │   ├── AIMessage.tsx             # MODIFY — render markdown, code, mermaid
│   │   │   ├── MarkdownRenderer.tsx      # CREATE — react-markdown + custom components
│   │   │   ├── CodeBlock.tsx             # CREATE — shiki highlighted code with copy button
│   │   │   ├── MermaidBlock.tsx          # CREATE — mermaid diagram renderer
│   │   │   ├── ToolOutput.tsx            # CREATE — collapsible monospace output
│   │   │   ├── ToolApprovalBanner.tsx    # CREATE — approve/deny banner
│   │   │   ├── StreamingIndicator.tsx    # CREATE — blinking cursor for streaming
│   │   │   ├── InputBox.tsx              # MODIFY — send via IPC, disable when disconnected
│   │   │   └── ...existing files
│   │   └── diff/
│   │       ├── DiffPanel.tsx             # MODIFY — accept live diffs via hook
│   │       ├── DiffFile.tsx              # MODIFY — functional accept/reject
│   │       └── ...existing files
│   └── mocks/                            # existing — kept for fallback/dev mode
```

---

## Task 1: Install Dependencies & Extend Types

**Files:**
- Modify: `package.json`
- Modify: `src/renderer/src/types/index.ts`

- [ ] **Step 1: Install new dependencies**

```bash
cd /Users/ottimate/Documents/code/claude-code-ui
npm install ws chokidar react-markdown remark-gfm mermaid
npm install -D @types/ws
```

- [ ] **Step 2: Extend type definitions**

Add to `src/renderer/src/types/index.ts`:

```typescript
// Connection state for session lifecycle
export type ConnectionState = 'idle' | 'connecting' | 'active' | 'disconnected'

// Session info for resume/list
export interface SessionInfo {
  id: string
  projectName: string
  workingDir: string
  branch: string
  lastActive: string
}

// Content blocks inside assistant messages
export type ContentBlock =
  | { type: 'text'; text: string }
  | { type: 'thinking'; thinking: string }
  | { type: 'tool_use'; id: string; name: string; input: Record<string, unknown> }

// Discriminated union of all CLI events
export type CLIEvent =
  | { type: 'system'; subtype: 'init'; session_id: string; tools: string[] }
  | { type: 'system'; subtype: 'status'; message: string }
  | { type: 'assistant'; message: { content: ContentBlock[] } }
  | { type: 'stream_event'; subtype: 'content_block_delta'; delta: { text?: string } }
  | { type: 'tool_progress'; tool_name: string; progress: string }
  | { type: 'tool_use_summary'; tool_name: string; input: Record<string, unknown>; output: string; is_error: boolean }
  | { type: 'control_request'; id: string; tool_name: string; input: Record<string, unknown> }
  | { type: 'result'; session_id: string; cost_usd: number; duration_ms: number; is_error: boolean; result: string }
  | { type: 'keep_alive' }

// IPC API exposed to renderer
export interface ClaudeAPI {
  startSession(workingDir: string): Promise<void>
  resumeSession(sessionId: string, workingDir: string): Promise<void>
  listSessions(): Promise<SessionInfo[]>
  cancelTurn(): Promise<void>
  sendMessage(text: string): Promise<void>
  sendControlResponse(requestId: string, approved: boolean): Promise<void>
  onMessage(callback: (event: CLIEvent) => void): () => void
  onConnectionStateChange(callback: (state: ConnectionState) => void): () => void
  onDiffUpdate(callback: (diffs: DiffFileData[]) => void): () => void
  onBranchChange(callback: (branch: string) => void): () => void
}

// Extend the global Window
declare global {
  interface Window {
    claude: ClaudeAPI
  }
}
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

- [ ] **Step 4: Commit**

```bash
git add -A && git commit -m "feat: install CLI integration deps and extend type definitions"
```

---

## Task 2: CLI Discovery

**Files:**
- Create: `src/main/cli-discovery.ts`

- [ ] **Step 1: Create CLI discovery module**

Create `src/main/cli-discovery.ts`:

```typescript
import { execSync } from 'child_process'

export interface CLIInfo {
  path: string
  version: string
}

export function discoverCLI(): CLIInfo {
  // Find claude binary
  let cliPath: string
  try {
    cliPath = execSync('which claude', { encoding: 'utf-8' }).trim()
  } catch {
    throw new Error('Claude Code CLI not found in PATH. Install it from https://claude.ai/claude-code')
  }

  // Check version
  let version: string
  try {
    version = execSync(`"${cliPath}" --version`, { encoding: 'utf-8' }).trim()
  } catch {
    throw new Error('Failed to get Claude Code CLI version')
  }

  return { path: cliPath, version }
}
```

- [ ] **Step 2: Commit**

```bash
git add -A && git commit -m "feat: add CLI binary discovery"
```

---

## Task 3: WsBridge — WebSocket Server

**Files:**
- Create: `src/main/ws-bridge.ts`

- [ ] **Step 1: Create WsBridge**

Create `src/main/ws-bridge.ts`:

```typescript
import { WebSocketServer, WebSocket } from 'ws'
import { EventEmitter } from 'events'
import { createServer } from 'http'

export class WsBridge extends EventEmitter {
  private wss: WebSocketServer | null = null
  private httpServer: ReturnType<typeof createServer> | null = null
  private connection: WebSocket | null = null
  public port: number = 0

  async start(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.httpServer = createServer()
      this.wss = new WebSocketServer({ server: this.httpServer })

      this.wss.on('connection', (ws, req) => {
        console.log('[WsBridge] CLI connected:', req.url)
        this.connection = ws

        ws.on('message', (data) => {
          const raw = data.toString()
          // NDJSON: each line is a separate JSON message
          for (const line of raw.split('\n')) {
            if (!line.trim()) continue
            try {
              const event = JSON.parse(line)
              this.emit('cli-event', event)
            } catch (err) {
              console.error('[WsBridge] Failed to parse:', line, err)
            }
          }
        })

        ws.on('close', () => {
          console.log('[WsBridge] CLI disconnected')
          this.connection = null
          this.emit('disconnected')
        })

        ws.on('error', (err) => {
          console.error('[WsBridge] WebSocket error:', err)
        })

        this.emit('connected')
      })

      this.httpServer.listen(0, '127.0.0.1', () => {
        const addr = this.httpServer!.address()
        if (addr && typeof addr === 'object') {
          this.port = addr.port
          console.log(`[WsBridge] Listening on ws://127.0.0.1:${this.port}`)
          resolve()
        } else {
          reject(new Error('Failed to bind WsBridge'))
        }
      })

      this.httpServer.on('error', reject)
    })
  }

  sendToClient(data: Record<string, unknown>): void {
    if (!this.connection || this.connection.readyState !== WebSocket.OPEN) {
      console.warn('[WsBridge] No active connection, dropping message')
      return
    }
    this.connection.send(JSON.stringify(data) + '\n')
  }

  get isConnected(): boolean {
    return this.connection?.readyState === WebSocket.OPEN
  }

  async stop(): Promise<void> {
    if (this.connection) {
      this.connection.close()
      this.connection = null
    }
    if (this.wss) {
      this.wss.close()
      this.wss = null
    }
    if (this.httpServer) {
      this.httpServer.close()
      this.httpServer = null
    }
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add -A && git commit -m "feat: add WsBridge WebSocket server for CLI communication"
```

---

## Task 4: SessionManager — CLI Process Lifecycle

**Files:**
- Create: `src/main/session-manager.ts`

- [ ] **Step 1: Create SessionManager**

Create `src/main/session-manager.ts`:

```typescript
import { spawn, ChildProcess } from 'child_process'
import { EventEmitter } from 'events'
import { randomUUID } from 'crypto'
import { WsBridge } from './ws-bridge'
import { discoverCLI } from './cli-discovery'

export type SessionState = 'idle' | 'connecting' | 'active' | 'disconnected'

export class SessionManager extends EventEmitter {
  private bridge: WsBridge
  private process: ChildProcess | null = null
  private _state: SessionState = 'idle'
  private _sessionId: string | null = null
  private _workingDir: string | null = null
  private reconnectAttempts = 0
  private maxReconnectAttempts = 3

  constructor(bridge: WsBridge) {
    super()
    this.bridge = bridge

    bridge.on('connected', () => {
      this.setState('active')
      this.reconnectAttempts = 0
    })

    bridge.on('disconnected', () => {
      if (this._state === 'active') {
        this.setState('disconnected')
        this.attemptReconnect()
      }
    })

    bridge.on('cli-event', (event: Record<string, unknown>) => {
      // Capture session_id from result events
      if (event.type === 'result' && event.session_id) {
        this._sessionId = event.session_id as string
      }
      // Auto-approve control requests when not in manual mode
      if (event.type === 'control_request' && !this.manualApproval) {
        this.bridge.sendToClient({
          type: 'control_response',
          response: { response: { behavior: 'allow', updatedInput: null } }
        })
        return // Don't forward to renderer
      }
      this.emit('cli-event', event)
    })
  }

  public manualApproval = false

  get state(): SessionState { return this._state }
  get sessionId(): string | null { return this._sessionId }
  get workingDir(): string | null { return this._workingDir }

  private setState(state: SessionState): void {
    this._state = state
    this.emit('state-change', state)
  }

  async startSession(workingDir: string, model?: string): Promise<void> {
    await this.killProcess()
    this._workingDir = workingDir
    this._sessionId = null
    this.setState('connecting')
    await this.spawnCLI(workingDir, model)
  }

  async resumeSession(sessionId: string, workingDir: string, model?: string): Promise<void> {
    await this.killProcess()
    this._workingDir = workingDir
    this._sessionId = sessionId
    this.setState('connecting')
    await this.spawnCLI(workingDir, model, sessionId)
  }

  sendMessage(text: string): void {
    this.bridge.sendToClient({
      type: 'user',
      message: { role: 'user', content: text },
      parent_tool_use_id: null,
      session_id: this._sessionId
    })
  }

  sendControlResponse(requestId: string, approved: boolean): void {
    if (approved) {
      this.bridge.sendToClient({
        type: 'control_response',
        response: { response: { behavior: 'allow', updatedInput: null } }
      })
    } else {
      this.bridge.sendToClient({
        type: 'control_response',
        response: { response: { behavior: 'deny' } }
      })
    }
  }

  async cancelTurn(): Promise<void> {
    await this.killProcess()
    if (this._sessionId && this._workingDir) {
      this.setState('connecting')
      await this.spawnCLI(this._workingDir, undefined, this._sessionId)
    } else {
      this.setState('idle')
    }
  }

  private async spawnCLI(workingDir: string, model?: string, resumeId?: string): Promise<void> {
    const cli = discoverCLI()
    const sessionKey = randomUUID()

    const args = [
      '--sdk-url', `ws://127.0.0.1:${this.bridge.port}/ws/cli/${sessionKey}`,
      '--print',
      '--output-format', 'stream-json',
      '--input-format', 'stream-json',
      '--verbose',
    ]

    if (resumeId) {
      args.push('--resume', resumeId)
    }

    if (model) {
      args.push('--model', model)
    }

    if (!this.manualApproval) {
      args.push('--allowedTools', 'Read', 'Glob', 'Grep', 'Bash(git:*)', 'Bash(ls:*)', 'Bash(cat:*)')
    }

    // Remove CLAUDECODE env var to prevent nested session guard
    const env = { ...process.env }
    delete env.CLAUDECODE

    this.process = spawn(cli.path, args, {
      cwd: workingDir,
      env,
      stdio: ['pipe', 'pipe', 'pipe'],
    })

    this.process.on('exit', (code) => {
      console.log(`[SessionManager] CLI exited with code ${code}`)
      if (this._state === 'connecting' && code !== 0) {
        this.emit('cli-error', `CLI exited with code ${code}`)
        this.setState('idle')
      }
    })

    this.process.stderr?.on('data', (data) => {
      console.error('[SessionManager] CLI stderr:', data.toString())
    })

    // Wait for WebSocket connection with timeout
    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('CLI connection timeout (10s)'))
        this.killProcess()
      }, 10000)

      this.bridge.once('connected', () => {
        clearTimeout(timeout)
        resolve()
      })

      this.process!.once('exit', (code) => {
        if (code !== 0) {
          clearTimeout(timeout)
          reject(new Error(`CLI exited with code ${code} during startup`))
        }
      })
    })
  }

  private async attemptReconnect(): Promise<void> {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      this.setState('idle')
      this.emit('reconnect-failed')
      return
    }

    this.reconnectAttempts++
    console.log(`[SessionManager] Reconnect attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts}`)

    await new Promise(resolve => setTimeout(resolve, 2000))

    if (this._sessionId && this._workingDir) {
      try {
        await this.spawnCLI(this._workingDir, undefined, this._sessionId)
      } catch (err) {
        console.error('[SessionManager] Reconnect failed:', err)
        this.attemptReconnect()
      }
    }
  }

  private async killProcess(): Promise<void> {
    if (this.process) {
      this.process.kill('SIGTERM')
      this.process = null
    }
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add -A && git commit -m "feat: add SessionManager for CLI process lifecycle"
```

---

## Task 5: GitWatcher — Live Diff Updates

**Files:**
- Create: `src/main/diff-parser.ts`
- Create: `src/main/git-watcher.ts`

- [ ] **Step 1: Create unified diff parser**

Create `src/main/diff-parser.ts`:

```typescript
// Parses unified diff output into DiffFileData[] compatible with the renderer types

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
  const files: DiffFileData[] = []
  const fileChunks = diffOutput.split(/^diff --git /m).filter(Boolean)

  for (const chunk of fileChunks) {
    const lines = chunk.split('\n')

    // Extract filename from "a/path b/path" line
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
      // Hunk header: @@ -oldStart,oldCount +newStart,newCount @@
      const hunkMatch = line.match(/^@@ -(\d+)(?:,\d+)? \+(\d+)(?:,\d+)? @@/)
      if (hunkMatch) {
        currentHunk = {
          oldStart: parseInt(hunkMatch[1]),
          newStart: parseInt(hunkMatch[2]),
          lines: [],
        }
        hunks.push(currentHunk)
        oldLine = parseInt(hunkMatch[1])
        newLine = parseInt(hunkMatch[2])
        continue
      }

      if (!currentHunk) continue

      if (line.startsWith('+')) {
        currentHunk.lines.push({
          type: 'added',
          content: line.slice(1),
          newLineNumber: newLine++,
        })
        additions++
      } else if (line.startsWith('-')) {
        currentHunk.lines.push({
          type: 'removed',
          content: line.slice(1),
          oldLineNumber: oldLine++,
        })
        deletions++
      } else if (line.startsWith(' ')) {
        currentHunk.lines.push({
          type: 'context',
          content: line.slice(1),
          oldLineNumber: oldLine++,
          newLineNumber: newLine++,
        })
      }
      // Skip lines starting with \ (no newline at end of file)
    }

    files.push({
      filename,
      language: detectLanguage(filename),
      additions,
      deletions,
      hunks,
      comments: [],
      accepted: null,
    })
  }

  return files
}
```

- [ ] **Step 2: Create GitWatcher**

Create `src/main/git-watcher.ts`:

```typescript
import { watch } from 'chokidar'
import { execSync } from 'child_process'
import { EventEmitter } from 'events'
import { join } from 'path'
import { existsSync } from 'fs'
import { parseUnifiedDiff } from './diff-parser'

export class GitWatcher extends EventEmitter {
  private watcher: ReturnType<typeof watch> | null = null
  private workingDir: string
  private debounceTimer: NodeJS.Timeout | null = null
  private lastBranch: string = ''

  constructor(workingDir: string) {
    super()
    this.workingDir = workingDir
  }

  start(): void {
    const gitDir = join(this.workingDir, '.git')
    if (!existsSync(gitDir)) {
      console.warn('[GitWatcher] Not a git repository:', this.workingDir)
      return
    }

    // Watch .git/index and working directory for changes
    this.watcher = watch([join(gitDir, 'index'), this.workingDir], {
      ignored: [
        /(^|[/\\])\../,  // dotfiles except .git
        '**/node_modules/**',
        join(gitDir, 'objects/**'),
        join(gitDir, 'logs/**'),
      ],
      ignoreInitial: true,
      awaitWriteFinish: { stabilityThreshold: 200 },
    })

    this.watcher.on('all', () => this.debouncedRefresh())

    // Initial refresh
    this.refresh()
  }

  // Called directly after tool_use_summary for immediate refresh
  forceRefresh(): void {
    if (this.debounceTimer) clearTimeout(this.debounceTimer)
    this.refresh()
  }

  private debouncedRefresh(): void {
    if (this.debounceTimer) clearTimeout(this.debounceTimer)
    this.debounceTimer = setTimeout(() => this.refresh(), 500)
  }

  private refresh(): void {
    try {
      // Get combined diff
      const diffOutput = execSync('git diff HEAD', {
        cwd: this.workingDir,
        encoding: 'utf-8',
        maxBuffer: 10 * 1024 * 1024, // 10MB
      })

      const files = parseUnifiedDiff(diffOutput)
      this.emit('diff-update', files)

      // Check branch
      const branch = execSync('git rev-parse --abbrev-ref HEAD', {
        cwd: this.workingDir,
        encoding: 'utf-8',
      }).trim()

      if (branch !== this.lastBranch) {
        this.lastBranch = branch
        this.emit('branch-change', branch)
      }
    } catch (err) {
      // Not a git repo or git not installed — emit empty
      this.emit('diff-update', [])
    }
  }

  stop(): void {
    if (this.debounceTimer) clearTimeout(this.debounceTimer)
    if (this.watcher) {
      this.watcher.close()
      this.watcher = null
    }
  }
}
```

- [ ] **Step 3: Commit**

```bash
git add -A && git commit -m "feat: add GitWatcher with diff parser for live diff updates"
```

---

## Task 6: IPC Bridge — Preload Script

**Files:**
- Modify: `src/preload/index.ts`

- [ ] **Step 1: Rewrite preload script**

Replace `src/preload/index.ts`:

```typescript
import { contextBridge, ipcRenderer } from 'electron'

const claudeAPI = {
  // Session
  startSession: (workingDir: string) => ipcRenderer.invoke('claude:start-session', workingDir),
  resumeSession: (sessionId: string, workingDir: string) => ipcRenderer.invoke('claude:resume-session', sessionId, workingDir),
  listSessions: () => ipcRenderer.invoke('claude:list-sessions'),
  cancelTurn: () => ipcRenderer.invoke('claude:cancel-turn'),

  // Messages
  sendMessage: (text: string) => ipcRenderer.invoke('claude:send-message', text),
  sendControlResponse: (requestId: string, approved: boolean) => ipcRenderer.invoke('claude:control-response', requestId, approved),

  // Events
  onMessage: (callback: (event: unknown) => void) => {
    const handler = (_: unknown, event: unknown) => callback(event)
    ipcRenderer.on('claude:message', handler)
    return () => ipcRenderer.removeListener('claude:message', handler)
  },
  onConnectionStateChange: (callback: (state: string) => void) => {
    const handler = (_: unknown, state: string) => callback(state)
    ipcRenderer.on('claude:state-change', handler)
    return () => ipcRenderer.removeListener('claude:state-change', handler)
  },
  onDiffUpdate: (callback: (diffs: unknown[]) => void) => {
    const handler = (_: unknown, diffs: unknown[]) => callback(diffs)
    ipcRenderer.on('claude:diff-update', handler)
    return () => ipcRenderer.removeListener('claude:diff-update', handler)
  },
  onBranchChange: (callback: (branch: string) => void) => {
    const handler = (_: unknown, branch: string) => callback(branch)
    ipcRenderer.on('claude:branch-change', handler)
    return () => ipcRenderer.removeListener('claude:branch-change', handler)
  },

  // Utility
  selectDirectory: () => ipcRenderer.invoke('claude:select-directory'),
}

if (process.contextIsolated) {
  contextBridge.exposeInMainWorld('claude', claudeAPI)
} else {
  (window as any).claude = claudeAPI
}
```

- [ ] **Step 2: Commit**

```bash
git add -A && git commit -m "feat: add IPC bridge exposing ClaudeAPI to renderer"
```

---

## Task 7: Main Process — Wire Everything Together

**Files:**
- Modify: `src/main/index.ts`

- [ ] **Step 1: Rewrite main process to wire services and IPC**

Update `src/main/index.ts` to:
- Create WsBridge and start it on app ready
- Create SessionManager wired to the bridge
- Register all `ipcMain.handle` handlers for the ClaudeAPI
- Create GitWatcher when a session starts
- Forward events to renderer via `mainWindow.webContents.send`
- Add `claude:select-directory` handler using `dialog.showOpenDialog`
- Auto-resume last session from `electron-store` on launch
- Clean up on app quit (kill CLI process, stop watcher, stop bridge)

The IPC handlers map to:
- `claude:start-session` → `sessionManager.startSession()`
- `claude:resume-session` → `sessionManager.resumeSession()`
- `claude:send-message` → `sessionManager.sendMessage()`
- `claude:control-response` → `sessionManager.sendControlResponse()`
- `claude:cancel-turn` → `sessionManager.cancelTurn()`
- `claude:list-sessions` → read from `electron-store`
- `claude:select-directory` → `dialog.showOpenDialog({ properties: ['openDirectory'] })`

Forward events to renderer:
- `sessionManager.on('cli-event')` → `mainWindow.webContents.send('claude:message', event)`
- `sessionManager.on('state-change')` → `mainWindow.webContents.send('claude:state-change', state)`
- `gitWatcher.on('diff-update')` → `mainWindow.webContents.send('claude:diff-update', diffs)`
- `gitWatcher.on('branch-change')` → `mainWindow.webContents.send('claude:branch-change', branch)`

On `tool_use_summary` events for Edited/Write tools → call `gitWatcher.forceRefresh()`

Store last session info in `electron-store` on each successful session start:
```typescript
store.set('lastSession', { id: sessionId, workingDir, timestamp: new Date().toISOString() })
```

- [ ] **Step 2: Verify app launches without errors**

```bash
npm run dev
```

Expected: App opens. If `claude` CLI is not available, should gracefully handle the error. If CLI is available but no session auto-resumes, the app should show the existing UI (mock data for now — start screen comes in a later task).

- [ ] **Step 3: Commit**

```bash
git add -A && git commit -m "feat: wire main process with IPC handlers, WsBridge, SessionManager, GitWatcher"
```

---

## Task 8: useClaude Hook — Renderer State Management

**Files:**
- Create: `src/renderer/src/hooks/use-claude.ts`

- [ ] **Step 1: Create the useClaude hook**

Create `src/renderer/src/hooks/use-claude.ts`:

```typescript
import { useState, useEffect, useCallback, useRef } from 'react'
import type { Message, DiffFileData, ConnectionState, CLIEvent, ToolUsage } from '../types'

interface UseClaudeReturn {
  // State
  connectionState: ConnectionState
  messages: Message[]
  diffs: DiffFileData[]
  branch: string
  streamingText: string
  pendingApproval: { id: string; toolName: string; input: Record<string, unknown> } | null

  // Actions
  startSession: (workingDir: string) => Promise<void>
  resumeSession: (sessionId: string, workingDir: string) => Promise<void>
  sendMessage: (text: string) => void
  cancelTurn: () => void
  approveRequest: (id: string) => void
  denyRequest: (id: string) => void
}

export function useClaude(): UseClaudeReturn {
  const [connectionState, setConnectionState] = useState<ConnectionState>('idle')
  const [messages, setMessages] = useState<Message[]>([])
  const [diffs, setDiffs] = useState<DiffFileData[]>([])
  const [branch, setBranch] = useState('')
  const [streamingText, setStreamingText] = useState('')
  const [pendingApproval, setPendingApproval] = useState<UseClaudeReturn['pendingApproval']>(null)
  const messageIdCounter = useRef(0)
  const currentTools = useRef<ToolUsage[]>([])

  useEffect(() => {
    if (!window.claude) return

    const unsubMessage = window.claude.onMessage((event: CLIEvent) => {
      switch (event.type) {
        case 'assistant': {
          // Full assistant message — contains content blocks
          const textBlocks = event.message.content
            .filter((b): b is { type: 'text'; text: string } => b.type === 'text')
            .map(b => b.text)
            .join('')

          const thinkingBlock = event.message.content
            .find((b): b is { type: 'thinking'; thinking: string } => b.type === 'thinking')

          if (textBlocks) {
            setMessages(prev => [...prev, {
              id: `msg-${++messageIdCounter.current}`,
              role: 'assistant',
              content: textBlocks,
              thinkingTime: thinkingBlock ? undefined : undefined, // TODO: extract duration
              tools: currentTools.current.length > 0 ? [...currentTools.current] : undefined,
            }])
            currentTools.current = []
            setStreamingText('')
          }
          break
        }

        case 'stream_event': {
          if (event.delta?.text) {
            setStreamingText(prev => prev + event.delta.text)
          }
          break
        }

        case 'tool_use_summary': {
          currentTools.current.push({
            action: event.tool_name.replace(/Tool$/, ''),
            target: typeof event.input === 'object' && 'file_path' in event.input
              ? String(event.input.file_path).split('/').pop() ?? event.tool_name
              : event.tool_name,
            status: event.is_error ? 'error' : 'success',
          })
          break
        }

        case 'control_request': {
          setPendingApproval({
            id: event.id,
            toolName: event.tool_name,
            input: event.input,
          })
          break
        }

        case 'result': {
          setStreamingText('')
          if (event.is_error && event.result) {
            setMessages(prev => [...prev, {
              id: `msg-${++messageIdCounter.current}`,
              role: 'assistant',
              content: event.result,
              tools: currentTools.current.length > 0 ? [...currentTools.current] : undefined,
            }])
            currentTools.current = []
          }
          break
        }
      }
    })

    const unsubState = window.claude.onConnectionStateChange((state) => {
      setConnectionState(state as ConnectionState)
    })

    const unsubDiff = window.claude.onDiffUpdate((newDiffs) => {
      setDiffs(newDiffs as DiffFileData[])
    })

    const unsubBranch = window.claude.onBranchChange((newBranch) => {
      setBranch(newBranch)
    })

    return () => { unsubMessage(); unsubState(); unsubDiff(); unsubBranch() }
  }, [])

  const sendMessage = useCallback((text: string) => {
    setMessages(prev => [...prev, {
      id: `msg-${++messageIdCounter.current}`,
      role: 'user',
      content: text,
    }])
    window.claude?.sendMessage(text)
  }, [])

  const startSession = useCallback(async (workingDir: string) => {
    setMessages([])
    setDiffs([])
    await window.claude?.startSession(workingDir)
  }, [])

  const resumeSession = useCallback(async (sessionId: string, workingDir: string) => {
    await window.claude?.resumeSession(sessionId, workingDir)
  }, [])

  const cancelTurn = useCallback(() => {
    window.claude?.cancelTurn()
    setStreamingText('')
  }, [])

  const approveRequest = useCallback((id: string) => {
    window.claude?.sendControlResponse(id, true)
    setPendingApproval(null)
  }, [])

  const denyRequest = useCallback((id: string) => {
    window.claude?.sendControlResponse(id, false)
    setPendingApproval(null)
  }, [])

  return {
    connectionState, messages, diffs, branch, streamingText, pendingApproval,
    startSession, resumeSession, sendMessage, cancelTurn, approveRequest, denyRequest,
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add -A && git commit -m "feat: add useClaude hook for renderer state management"
```

---

## Task 9: Content Rendering — Markdown, Code, Mermaid

**Files:**
- Create: `src/renderer/src/features/chat/MarkdownRenderer.tsx`
- Create: `src/renderer/src/features/chat/CodeBlock.tsx`
- Create: `src/renderer/src/features/chat/MermaidBlock.tsx`
- Create: `src/renderer/src/features/chat/ToolOutput.tsx`
- Create: `src/renderer/src/features/chat/StreamingIndicator.tsx`

- [ ] **Step 1: Create CodeBlock with shiki + copy button**

Create `src/renderer/src/features/chat/CodeBlock.tsx`:

```tsx
import { useState, useEffect } from 'react'
import { Copy, Check } from 'lucide-react'
import { getHighlighter } from '../diff/highlighter'

interface Props {
  code: string
  language: string
  theme: 'light' | 'dark'
}

export function CodeBlock({ code, language, theme }: Props) {
  const [html, setHtml] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const shikiTheme = theme === 'dark' ? 'github-dark' : 'github-light'

  useEffect(() => {
    getHighlighter().then(h => {
      const loadedLangs = h.getLoadedLanguages()
      if (loadedLangs.includes(language as any)) {
        const result = h.codeToHtml(code, { lang: language, theme: shikiTheme })
        setHtml(result)
      }
    })
  }, [code, language, shikiTheme])

  const handleCopy = () => {
    navigator.clipboard.writeText(code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="relative my-3 rounded-md border border-border overflow-hidden">
      <div className="flex items-center justify-between px-3 py-1.5 bg-muted text-[11px] text-muted-foreground">
        <span>{language}</span>
        <button onClick={handleCopy} className="hover:text-foreground transition-colors">
          {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
        </button>
      </div>
      {html ? (
        <div className="overflow-x-auto text-[13px] [&_pre]:!bg-transparent [&_pre]:!p-3 [&_pre]:!m-0" dangerouslySetInnerHTML={{ __html: html }} />
      ) : (
        <pre className="p-3 text-[13px] overflow-x-auto"><code>{code}</code></pre>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Create MermaidBlock**

Create `src/renderer/src/features/chat/MermaidBlock.tsx`:

```tsx
import { useState, useEffect, useRef } from 'react'
import mermaid from 'mermaid'
import { Code, Image } from 'lucide-react'

interface Props {
  code: string
  theme: 'light' | 'dark'
}

export function MermaidBlock({ code, theme }: Props) {
  const [svg, setSvg] = useState<string | null>(null)
  const [showSource, setShowSource] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const idRef = useRef(`mermaid-${Math.random().toString(36).slice(2)}`)

  useEffect(() => {
    mermaid.initialize({
      startOnLoad: false,
      theme: theme === 'dark' ? 'dark' : 'default',
      securityLevel: 'loose',
    })

    mermaid.render(idRef.current, code)
      .then(({ svg }) => { setSvg(svg); setError(null) })
      .catch((err) => { setError(err.message); setSvg(null) })
  }, [code, theme])

  return (
    <div className="my-3 rounded-md border border-border overflow-hidden">
      <div className="flex items-center justify-between px-3 py-1.5 bg-muted text-[11px] text-muted-foreground">
        <span>mermaid</span>
        <button
          onClick={() => setShowSource(!showSource)}
          className="hover:text-foreground transition-colors"
        >
          {showSource ? <Image className="w-3.5 h-3.5" /> : <Code className="w-3.5 h-3.5" />}
        </button>
      </div>
      {showSource ? (
        <pre className="p-3 text-[13px] overflow-x-auto"><code>{code}</code></pre>
      ) : error ? (
        <div className="p-3 text-[13px] text-diff-removed-text">{error}</div>
      ) : svg ? (
        <div className="p-3 overflow-x-auto" dangerouslySetInnerHTML={{ __html: svg }} />
      ) : (
        <div className="p-3 text-[13px] text-muted-foreground">Rendering...</div>
      )}
    </div>
  )
}
```

- [ ] **Step 3: Create ToolOutput**

Create `src/renderer/src/features/chat/ToolOutput.tsx`:

```tsx
import { useState } from 'react'
import { ChevronDown, ChevronRight, Copy, Check } from 'lucide-react'

interface Props {
  output: string
  maxLines?: number
}

export function ToolOutput({ output, maxLines = 10 }: Props) {
  const lines = output.split('\n')
  const isLong = lines.length > maxLines
  const [expanded, setExpanded] = useState(!isLong)
  const [copied, setCopied] = useState(false)

  const displayText = expanded ? output : lines.slice(0, maxLines).join('\n') + '\n...'

  const handleCopy = () => {
    navigator.clipboard.writeText(output)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="my-2 rounded-md border border-border overflow-hidden">
      <div className="flex items-center justify-between px-3 py-1 bg-muted text-[11px] text-muted-foreground">
        <button onClick={() => setExpanded(!expanded)} className="flex items-center gap-1 hover:text-foreground">
          {isLong && (expanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />)}
          <span>Output ({lines.length} lines)</span>
        </button>
        <button onClick={handleCopy} className="hover:text-foreground transition-colors">
          {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
        </button>
      </div>
      <pre className="p-3 text-[12px] font-mono overflow-x-auto max-h-[300px] overflow-y-auto">
        {displayText}
      </pre>
    </div>
  )
}
```

- [ ] **Step 4: Create StreamingIndicator**

Create `src/renderer/src/features/chat/StreamingIndicator.tsx`:

```tsx
export function StreamingIndicator() {
  return (
    <span className="inline-block w-2 h-4 bg-foreground/60 animate-pulse ml-0.5 rounded-sm" />
  )
}
```

- [ ] **Step 5: Create MarkdownRenderer**

Create `src/renderer/src/features/chat/MarkdownRenderer.tsx`:

```tsx
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { CodeBlock } from './CodeBlock'
import { MermaidBlock } from './MermaidBlock'

interface Props {
  content: string
  theme: 'light' | 'dark'
}

export function MarkdownRenderer({ content, theme }: Props) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        code({ className, children, ...props }) {
          const match = /language-(\w+)/.exec(className || '')
          const code = String(children).replace(/\n$/, '')

          if (match) {
            const lang = match[1]
            if (lang === 'mermaid') {
              return <MermaidBlock code={code} theme={theme} />
            }
            return <CodeBlock code={code} language={lang} theme={theme} />
          }

          // Inline code
          return (
            <code className="px-1.5 py-0.5 rounded bg-muted text-[13px] font-mono" {...props}>
              {children}
            </code>
          )
        },
        // Style other markdown elements
        p: ({ children }) => <p className="mb-3 last:mb-0">{children}</p>,
        h1: ({ children }) => <h1 className="text-xl font-bold mb-3 mt-4">{children}</h1>,
        h2: ({ children }) => <h2 className="text-lg font-bold mb-2 mt-3">{children}</h2>,
        h3: ({ children }) => <h3 className="text-base font-semibold mb-2 mt-3">{children}</h3>,
        ul: ({ children }) => <ul className="list-disc pl-6 mb-3">{children}</ul>,
        ol: ({ children }) => <ol className="list-decimal pl-6 mb-3">{children}</ol>,
        li: ({ children }) => <li className="mb-1">{children}</li>,
        a: ({ href, children }) => (
          <a href={href} className="text-blue-600 dark:text-blue-400 underline" target="_blank" rel="noopener noreferrer">{children}</a>
        ),
        blockquote: ({ children }) => (
          <blockquote className="border-l-2 border-border pl-4 italic text-muted-foreground my-3">{children}</blockquote>
        ),
        table: ({ children }) => (
          <div className="overflow-x-auto my-3">
            <table className="min-w-full border border-border text-[13px]">{children}</table>
          </div>
        ),
        th: ({ children }) => <th className="border border-border px-3 py-1.5 bg-muted font-semibold text-left">{children}</th>,
        td: ({ children }) => <td className="border border-border px-3 py-1.5">{children}</td>,
      }}
    >
      {content}
    </ReactMarkdown>
  )
}
```

- [ ] **Step 6: Commit**

```bash
git add -A && git commit -m "feat: add content renderers — markdown, code blocks, mermaid, tool output"
```

---

## Task 10: Tool Approval Banner

**Files:**
- Create: `src/renderer/src/features/chat/ToolApprovalBanner.tsx`

- [ ] **Step 1: Create ToolApprovalBanner**

Create `src/renderer/src/features/chat/ToolApprovalBanner.tsx`:

```tsx
interface Props {
  toolName: string
  input: Record<string, unknown>
  onApprove: () => void
  onDeny: () => void
}

export function ToolApprovalBanner({ toolName, input, onApprove, onDeny }: Props) {
  // Build a preview of the tool arguments
  const preview = Object.entries(input)
    .map(([k, v]) => `${k}: ${typeof v === 'string' ? v.slice(0, 60) : JSON.stringify(v).slice(0, 60)}`)
    .join(', ')

  return (
    <div className="mx-4 mb-2 px-4 py-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/40 rounded-md flex items-center gap-3 font-sans">
      <div className="flex-1 min-w-0">
        <div className="text-[13px] font-semibold text-foreground">{toolName}</div>
        <div className="text-[12px] text-muted-foreground truncate">{preview}</div>
      </div>
      <button
        onClick={onApprove}
        className="px-3 py-1.5 text-[12px] font-medium bg-primary text-primary-foreground rounded hover:opacity-80 transition-opacity"
      >
        Approve
      </button>
      <button
        onClick={onDeny}
        className="px-3 py-1.5 text-[12px] font-medium border border-border rounded hover:bg-muted transition-colors"
      >
        Deny
      </button>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add -A && git commit -m "feat: add tool approval banner component"
```

---

## Task 11: Start Screen

**Files:**
- Create: `src/renderer/src/features/start-screen/StartScreen.tsx`

- [ ] **Step 1: Create StartScreen**

Create `src/renderer/src/features/start-screen/StartScreen.tsx`:

```tsx
import { FolderOpen, History } from 'lucide-react'

interface Props {
  onNewSession: () => void
  onResumeSession: () => void
}

export function StartScreen({ onNewSession, onResumeSession }: Props) {
  return (
    <div className="h-full flex flex-col items-center justify-center gap-6">
      <div className="text-center mb-4">
        <h1 className="text-2xl font-bold mb-2">Claude Code</h1>
        <p className="text-muted-foreground text-sm">Start a new session or resume where you left off</p>
      </div>
      <div className="flex gap-4">
        <button
          onClick={onNewSession}
          className="flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:opacity-80 transition-opacity"
        >
          <FolderOpen className="w-4 h-4" />
          New Session
        </button>
        <button
          onClick={onResumeSession}
          className="flex items-center gap-2 px-6 py-3 border border-border rounded-lg text-sm font-medium hover:bg-muted transition-colors"
        >
          <History className="w-4 h-4" />
          Resume Session
        </button>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add -A && git commit -m "feat: add start screen with new/resume session options"
```

---

## Task 12: Wire Everything in App.tsx & UI Updates

**Files:**
- Modify: `src/renderer/src/App.tsx`
- Modify: `src/renderer/src/features/title-bar/TitleBar.tsx`
- Modify: `src/renderer/src/features/chat/ChatPanel.tsx`
- Modify: `src/renderer/src/features/chat/AIMessage.tsx`
- Modify: `src/renderer/src/features/chat/InputBox.tsx`
- Modify: `src/renderer/src/features/diff/DiffPanel.tsx`

- [ ] **Step 1: Update TitleBar**

Add to TitleBar:
- `connectionState` prop → render status dot (green/yellow/gray) next to "Claude Code"
- `manualApproval` + `onToggleApproval` props → shield icon toggle
- Use live `branch` from props instead of hardcoded value

- [ ] **Step 2: Update AIMessage to use MarkdownRenderer**

Replace the plain text `<div>` for `message.content` with:
```tsx
<MarkdownRenderer content={message.content} theme={theme} />
```

Pass `theme` prop through ChatPanel → MessageList → AIMessage.

- [ ] **Step 3: Update InputBox**

- Accept `onSend` that calls `useClaude().sendMessage` instead of console.log
- Accept `disabled` prop — disable when `connectionState !== 'active'`
- Show streaming text + `<StreamingIndicator />` above the input when `streamingText` is non-empty

- [ ] **Step 4: Update ChatPanel**

- Accept `pendingApproval` + `onApprove` + `onDeny` → render `<ToolApprovalBanner />` at top
- Accept `streamingText` → pass to InputBox area or render above messages

- [ ] **Step 5: Update DiffPanel**

- Accept diffs from `useClaude().diffs` (live) with fallback to mock data when empty
- Wire Accept button → `window.claude` IPC to run `git add <file>` (via a new IPC handler)
- Wire Reject button → confirmation dialog → `git checkout -- <file>`

- [ ] **Step 6: Rewrite App.tsx**

The root component now:
- Calls `useClaude()` hook for all state
- Shows `StartScreen` when `connectionState === 'idle'`
- Shows the two-panel layout when connecting/active/disconnected
- Passes live data to all panels
- Handles `onNewSession` (directory picker → startSession) and `onResumeSession`

```tsx
export default function App() {
  const { theme, toggleTheme } = useTheme()
  const claude = useClaude()
  const [manualApproval, setManualApproval] = useState(false)

  // ... keyboard shortcuts ...

  if (claude.connectionState === 'idle') {
    return (
      <div className="h-screen flex flex-col bg-background text-foreground">
        <TitleBar ... connectionState="idle" />
        <StartScreen
          onNewSession={async () => {
            const dir = await window.claude.selectDirectory()
            if (dir) claude.startSession(dir)
          }}
          onResumeSession={() => { /* show session list */ }}
        />
      </div>
    )
  }

  return (
    <div className="h-screen flex flex-col bg-background text-foreground">
      <TitleBar
        branch={claude.branch || 'main'}
        theme={theme}
        onToggleTheme={toggleTheme}
        connectionState={claude.connectionState}
        manualApproval={manualApproval}
        onToggleApproval={() => setManualApproval(!manualApproval)}
      />
      <ResizablePanelGroup ...>
        <ResizablePanel ...>
          <ChatPanel
            messages={claude.messages}
            streamingText={claude.streamingText}
            pendingApproval={claude.pendingApproval}
            onApprove={(id) => claude.approveRequest(id)}
            onDeny={(id) => claude.denyRequest(id)}
            onSend={claude.sendMessage}
            theme={theme}
            disabled={claude.connectionState !== 'active'}
          />
        </ResizablePanel>
        <ResizableHandle withHandle />
        <ResizablePanel ...>
          <DiffPanel
            files={claude.diffs.length > 0 ? claude.diffs : mockDiffs}
            theme={theme}
          />
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  )
}
```

- [ ] **Step 7: Verify full integration**

```bash
npm run dev
```

Test:
- App launches → shows start screen (if no previous session) or auto-resumes
- Click "New Session" → directory picker → Claude CLI spawns → status dot turns green
- Type a message → streams response with markdown rendering
- Diff panel updates as Claude edits files
- Theme toggle still works
- Tool approval banner appears in manual mode
- Cancel button kills and re-spawns CLI

- [ ] **Step 8: Commit**

```bash
git add -A && git commit -m "feat: wire live CLI integration into all UI components"
```

---

## Summary

| Task | What it builds | Files |
|------|---------------|-------|
| 1 | Dependencies + types | 2 modified |
| 2 | CLI discovery | 1 created |
| 3 | WsBridge | 1 created |
| 4 | SessionManager | 1 created |
| 5 | GitWatcher + diff parser | 2 created |
| 6 | IPC bridge (preload) | 1 modified |
| 7 | Main process wiring | 1 modified |
| 8 | useClaude hook | 1 created |
| 9 | Content renderers | 5 created |
| 10 | Tool approval banner | 1 created |
| 11 | Start screen | 1 created |
| 12 | Final integration | 6 modified |

**Total:** ~14 new files, ~8 modified files, 12 tasks
