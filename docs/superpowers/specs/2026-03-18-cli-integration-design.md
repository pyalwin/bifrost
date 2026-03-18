# Claude Code UI — CLI Integration Design

## Overview

Connect the Claude Code UI Electron app to a real Claude Code CLI session via WebSocket SDK mode, replacing mock data with live interactive conversations. Enables real-time streaming, tool approval control, session resume, and live git diffs.

**Builds on:** `docs/superpowers/specs/2026-03-18-claude-code-ui-design.md` (v1 UI spec)

---

## Connection Method

**WebSocket SDK mode** — the Electron main process runs an embedded WebSocket server. Claude CLI connects to it via `claude --sdk-url ws://localhost:PORT`. Communication is bidirectional NDJSON (newline-delimited JSON).

This pattern is proven in the `claude-slack-bot` project (`src/claude_slack_bot/executor/ws/bridge.py`).

---

## Main Process Architecture

Three services in Electron's main process:

### 1. WsBridge

A WebSocket server using the `ws` npm package, bound to `localhost:0` (OS-assigned port).

**Responsibilities:**
- Accept WebSocket connection from Claude CLI
- Parse inbound NDJSON messages from CLI
- Route parsed events to renderer via IPC (`mainWindow.webContents.send`)
- Forward outbound messages (user prompts, control responses) from renderer to CLI
- Handle connection lifecycle (open, close, error, reconnect)

**Inbound message types from CLI:**

| Type | Subtype | Description | UI Action |
|------|---------|-------------|-----------|
| `system` | `init` | Session initialized, capabilities | Store session info, mark connected |
| `system` | `status` | Status notifications | Update status indicator |
| `assistant` | — | Content blocks (text, thinking, tool use summaries) | Stream to chat panel |
| `stream_event` | `content_block_delta` | Streaming text deltas (token-by-token) | Append to current message |
| `tool_progress` | — | Real-time tool execution status | Update tool row in chat |
| `tool_use_summary` | — | Completed tool result | Finalize tool row, trigger git diff refresh |
| `control_request` | — | Tool permission request | Show approval UI (if manual mode) or auto-approve |
| `result` | — | Turn complete with cost/duration/session_id | Mark turn done, update stats |
| `keep_alive` | — | Heartbeat | Reset disconnect timer |

**Outbound message types to CLI (exact JSON envelopes):**

User message:
```json
{
  "type": "user",
  "message": {
    "role": "user",
    "content": "user's prompt text here"
  },
  "parent_tool_use_id": null,
  "session_id": "<session-uuid>"
}
```

Control response (approve):
```json
{
  "type": "control_response",
  "response": {
    "response": {
      "behavior": "allow",
      "updatedInput": null
    }
  }
}
```

Control response (deny):
```json
{
  "type": "control_response",
  "response": {
    "response": {
      "behavior": "deny"
    }
  }
}
```

### 2. SessionManager

Manages the Claude CLI child process lifecycle.

**Spawning a new session:**
```
claude --sdk-url ws://localhost:PORT/ws/cli/SESSION_KEY --print --output-format stream-json --input-format stream-json --verbose
```

**Resuming an existing session:**
```
claude --sdk-url ws://localhost:PORT/ws/cli/SESSION_KEY --resume <session-id> --print --output-format stream-json --input-format stream-json --verbose
```

> **Note:** The `--sdk-url` path includes a session key (`/ws/cli/SESSION_KEY`) so the WsBridge can route connections. `--print` with `--input-format stream-json` and `--output-format stream-json` enables the bidirectional NDJSON protocol.

**Additional flags passed:**
- `--model <model>` — from model selector in UI
- `--allowedTools <tools>` — pre-approved tools for auto-approve mode
- `--permission-mode default` — for auto-approve mode; omitted for manual mode
- Working directory set via `cwd` option on `child_process.spawn`

**Startup Sequence:**
1. Start WsBridge (bind to `localhost:0`, get assigned port)
2. Generate a unique session key (UUID)
3. Spawn Claude CLI with `--sdk-url ws://localhost:PORT/ws/cli/SESSION_KEY`
4. Wait for WebSocket connection from CLI (timeout: 10s)
5. **Do NOT wait for `system.init` before enabling input** — the CLI won't send `system.init` until it receives a user message (this is a known protocol quirk)
6. On resume: send the user message or wait for user input
7. Receive `system.init` with session metadata
8. Begin normal message loop

**CLI Binary Discovery:**
- Look for `claude` in PATH via `which claude` (or `where claude` on Windows)
- If not found, show error: "Claude Code CLI not found. Install it from https://claude.ai/claude-code"
- On startup, check CLI version supports `--sdk-url` (run `claude --version`, require >= 2.0.0)
- Store the resolved binary path in `electron-store` for faster subsequent launches

**States:**

| State | Description | UI |
|-------|-------------|-----|
| Idle | No session running | Start screen |
| Connecting | WsBridge started, CLI spawning | Connecting indicator |
| Active | CLI connected via WebSocket | Live chat |
| Disconnected | CLI exited or crashed | Auto-reconnect with indicator |

**Auto-connect on launch:**
1. Read last session ID + working directory from `electron-store`
2. If found → auto-start WsBridge, spawn CLI with `--resume`, go to Active
3. If not found → show start screen

**Auto-reconnect on disconnect:**
- Detect CLI process exit or WebSocket close
- Wait 2 seconds, then re-spawn with `--resume <same-session-id>`
- Show subtle "Reconnecting..." in title bar during retry
- After 3 failed attempts, show start screen

**Cancellation:**
- User clicks cancel → kill the Claude CLI child process (SIGTERM)
- Re-spawn with `--resume <same-session-id>` for next turn
- This is the safest approach — the CLI saves session state on graceful exit

### 3. GitWatcher

Watches the working directory for git changes.

**How it works:**
- Uses `chokidar` to watch `.git/index` and working directory files
- On change detected, debounce 500ms, then run:
  - `git diff` (unstaged changes)
  - `git diff --cached` (staged changes)
  - `git diff HEAD` (combined — this is what we show)
- Parse unified diff output into `DiffFileData[]` (same type the UI already uses)
- Send to renderer via IPC
- Also detects current branch name via `git rev-parse --abbrev-ref HEAD`

**Triggers refresh on:**
- File system changes in `.git/`
- After any `tool_use_summary` event for Edited/Write tools (immediate refresh, don't wait for debounce)

---

## Preload Script / IPC Bridge

The preload script exposes a typed API to the renderer via `contextBridge`:

```typescript
interface ClaudeAPI {
  // Session
  startSession(workingDir: string): Promise<void>
  resumeSession(sessionId: string, workingDir: string): Promise<void>
  listSessions(): Promise<SessionInfo[]>
  cancelTurn(): Promise<void>

  // Messages
  sendMessage(text: string): Promise<void>
  sendControlResponse(requestId: string, approved: boolean): Promise<void>

  // Events (renderer subscribes)
  onMessage(callback: (event: CLIEvent) => void): () => void
  onConnectionStateChange(callback: (state: ConnectionState) => void): () => void
  onDiffUpdate(callback: (diffs: DiffFileData[]) => void): () => void
  onBranchChange(callback: (branch: string) => void): () => void
}
```

Exposed as `window.claude` in the renderer.

**New types needed:**

```typescript
type ConnectionState = 'idle' | 'connecting' | 'active' | 'disconnected'

interface SessionInfo {
  id: string
  projectName: string
  workingDir: string
  branch: string
  lastActive: string  // ISO timestamp
}

// Discriminated union of all inbound CLI events
type CLIEvent =
  | { type: 'system'; subtype: 'init'; session_id: string; tools: string[] }
  | { type: 'system'; subtype: 'status'; message: string }
  | { type: 'assistant'; message: { content: ContentBlock[] } }
  | { type: 'stream_event'; subtype: 'content_block_delta'; delta: { text?: string } }
  | { type: 'tool_progress'; tool_name: string; progress: string }
  | { type: 'tool_use_summary'; tool_name: string; input: Record<string, unknown>; output: string; is_error: boolean }
  | { type: 'control_request'; id: string; tool_name: string; input: Record<string, unknown> }
  | { type: 'result'; session_id: string; cost_usd: number; duration_ms: number; is_error: boolean; result: string }
  | { type: 'keep_alive' }

type ContentBlock =
  | { type: 'text'; text: string }
  | { type: 'thinking'; thinking: string }
  | { type: 'tool_use'; id: string; name: string; input: Record<string, unknown> }
```

---

## Error Handling

**CLI not found:** On startup, check `which claude`. If not found, show a full-screen error: "Claude Code CLI not found" with install link.

**CLI version incompatible:** Run `claude --version`. If < 2.0.0 or missing `--sdk-url` support, show error with upgrade instructions.

**CLI startup failure:** If the child process exits within 5 seconds of spawn with non-zero code, parse stderr for the error message and show it to the user.

**CLI error result:** When a `result` event has `is_error: true`, render the error message in the chat panel as a red error block.

**Session resume failure:** If `--resume <id>` fails (session not found, corrupted), catch the error and offer to start a new session instead.

**WebSocket connection timeout:** If CLI doesn't connect to WsBridge within 10 seconds, kill the process and show an error.

**Diff panel: Accept/Reject safety:**
- Accept (`git add <file>`) is safe and reversible
- Reject (`git checkout -- <file>`) is destructive — show a confirmation dialog: "Discard changes to <file>? This cannot be undone."

---

## Session History Replay

When resuming a session, the chat must show previous messages.

**Source:** Session history is obtained by running the CLI in a read-only mode to extract conversation history. The exact storage location varies by CLI version, so we don't read files directly.

**Approach:** Use `claude --resume <session-id> --print --output-format json` with a no-op prompt to get the session metadata. Alternatively, the `system.init` message on WebSocket connect may include conversation history. The implementation should try both approaches and use whichever works.

**Fallback:** If history cannot be loaded, show "Resumed session" placeholder and only render new messages going forward (graceful degradation).

**Process:**
1. On resume, attempt to load history via CLI or session files
2. Parse conversation turns into `Message[]` type
3. Send full history to renderer via IPC
4. Renderer renders history
5. When WebSocket connects and streaming starts, new messages append below history

**Mapping session data → UI types:**
- User turns → `UserMessage`
- Assistant turns → `AIMessage` with `thinkingTime`, `tools[]`, and `content`
- Tool usage from history → `ToolUsageItem` rows

---

## Tool Approval

**Default mode: Auto-approve**
- Main process receives `control_request` from CLI
- Immediately responds with `control_response: { approved: true }`
- User never sees a prompt

**Manual mode: User approval**
- Toggled via shield icon in title bar (shield filled = manual, shield outline = auto)
- On `control_request`:
  - Renderer shows a toast banner at top of chat panel
  - Banner shows: tool name, arguments preview, [Approve] [Deny] buttons
  - User clicks → renderer sends `sendControlResponse(requestId, approved)` via IPC
  - No auto-timeout — banner persists until user responds (CLI blocks waiting)

**Allowed tools configuration:**
- Default allowlist: `Read, Glob, Grep, Bash(git:*), Bash(ls:*), Bash(cat:*)`
- Passed to CLI via `--allowedTools` in auto-approve mode
- In manual mode, `--allowedTools` is not passed — all tools require approval

---

## Content Rendering

Claude's responses contain rich content that needs proper rendering in the chat panel.

### Markdown Text
- **Library:** `react-markdown` + `remark-gfm` (GitHub Flavored Markdown)
- Renders: headings, bold, italic, links, lists, tables, inline code, blockquotes
- Streaming: progressive rendering as tokens arrive

### Code Blocks
- Fenced code blocks (` ```python `, ` ```tsx `, etc.)
- **Syntax highlighting:** `shiki` (already in project)
- UI: language label in top-right corner, copy button
- Styled as distinct blocks with border and background

### Mermaid Diagrams
- Fenced code blocks with language tag ` ```mermaid `
- **Library:** `mermaid` (official JS library)
- Rendered as inline SVG, respects current theme (light/dark)
- Toggle button to switch between rendered diagram and raw source code

### Thinking Blocks
- Rendered as a collapsible section
- Header: "Thought Xs" (with duration)
- Collapsed by default once the response is complete
- Expanded while actively thinking (streaming)

### Tool Use Blocks
- Flat clickable rows (existing design): `Edited hero.tsx ✓`
- Clicking a file-editing tool scrolls the diff panel to that file
- Error state shown for failed tools: `Edited config.yml ✕ Failed`
- Progress state while tool is executing: spinner/pulse animation

### Tool Output
- Bash command output, file contents from Read
- Rendered in monospace scroll container
- Max-height with overflow scroll
- Collapsible if output exceeds 10 lines
- Copy button for output content

### Streaming Behavior
- Tokens arrive via WebSocket as partial `assistant` messages
- Append to current message in real-time
- Markdown re-renders progressively (like ChatGPT)
- Cursor/blinking indicator at end of streaming text

---

## UI Changes from v1

### Title Bar Updates
- **Branch indicator** — now live from `git rev-parse`, updates on branch change
- **Shield icon** — new toggle for tool approval mode (auto/manual)
- **Open button** — now functional, opens selected file in system default editor
- **Commit button** — now functional, runs `git commit` flow (stage + commit message prompt)
- **Status dot** — next to "Claude Code" title, green when connected, yellow when reconnecting, gray when disconnected

### Start Screen (new)
Shown on first launch or when no session to auto-resume:
- **New Session** button → opens directory picker → starts Claude
- **Resume Session** button → lists recent sessions with project name, branch, last active time → user picks one
- Recent sessions from `electron-store`

### Chat Panel Updates
- **Input box** — sends real messages via IPC instead of console.log
- **Model selector** — functional dropdown, passes `--model` to CLI
- **Streaming** — messages render progressively as tokens arrive
- **Tool approval banner** — appears at top when manual mode is on

### Diff Panel Updates
- **Live data** — real `git diff` output instead of mock data
- **Auto-refresh** — updates within 1-2 seconds of Claude editing a file
- **Accept/Reject** — now functional: Accept = `git add <file>`, Reject = `git checkout -- <file>`

---

## Tech Stack Additions

| Package | Purpose |
|---------|---------|
| `ws` | WebSocket server in main process |
| `react-markdown` | Markdown rendering |
| `remark-gfm` | GitHub Flavored Markdown support |
| `mermaid` | Diagram rendering |
| `chokidar` | File watching (more reliable than `fs.watch`) |

---

## Data Flow Diagram

```
┌─────────────────────────────────────────────────────────┐
│ Electron Main Process                                    │
│                                                          │
│  ┌──────────────┐    WebSocket     ┌──────────────────┐ │
│  │  WsBridge     │◄──── NDJSON ───►│  Claude CLI       │ │
│  │  (ws server)  │                 │  --sdk-url        │ │
│  └──────┬───────┘                 │  --resume <id>    │ │
│         │                          └──────────────────┘ │
│         │ IPC                                            │
│  ┌──────┴───────┐                 ┌──────────────────┐ │
│  │ SessionManager│                 │  GitWatcher       │ │
│  │ (spawn/kill)  │                 │  (chokidar)       │ │
│  └──────────────┘                 │  → git diff       │ │
│                                    └────────┬─────────┘ │
├──────────────── IPC ────────────────────────┼───────────┤
│ Renderer (React)                             │           │
│                                              │           │
│  ┌────────────────┐  ┌──────────────────┐   │           │
│  │ ChatPanel       │  │ DiffPanel         │◄──┘           │
│  │ • react-markdown│  │ • live git diff   │               │
│  │ • shiki         │  │ • shiki highlight │               │
│  │ • mermaid       │  │ • inline comments │               │
│  │ • streaming     │  │ • accept/reject   │               │
│  └────────────────┘  └──────────────────┘               │
└─────────────────────────────────────────────────────────┘
```

---

## Notes

**Inline comments in live mode:** The diff panel's inline comment feature (from v1) remains functional in live mode. Comments are stored in renderer state only (not persisted to git). They are useful for the user to annotate diffs while reviewing Claude's work. Comments reset when the diff data updates.

---

## Future Considerations (not in scope)

- Multiple concurrent sessions (tabs)
- Sidebar with session history
- Terminal panel showing raw CLI output
- File tree browser
- Collaborative sessions (multiple users)
