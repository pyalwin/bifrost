# Bifrost

> The bridge between worlds — a visual desktop UI for [Claude Code](https://docs.anthropic.com/en/docs/claude-code)

Bifrost gives Claude Code a native desktop interface with a two-panel layout: an interactive chat on the left and a live git diff viewer on the right. Think of it as a visual wrapper around the Claude Code CLI — you get the full power of Claude's code editing, with a UI that shows you exactly what changed.

## Features

- **Live CLI Integration** — Connects to Claude Code via WebSocket SDK mode for real-time streaming
- **Chat Panel** — Markdown rendering, syntax-highlighted code blocks, Mermaid diagrams, tool progress indicators
- **Diff Viewer** — Live git diff panel that auto-updates as Claude edits files, with syntax highlighting via Shiki
- **Session Management** — Browse, resume, and continue previous Claude Code sessions from any project
- **Collapsible Sidebar** — Sessions grouped by project with search across your entire Claude history
- **Tool Approval** — Auto-approve mode or manual approve/deny for each tool use
- **Inline Code Review** — Comment threads on diff lines with reply and resolve
- **Model Selector** — Switch between Opus, Sonnet, and Haiku mid-session
- **Light/Dark Theme** — Toggle with Cmd+D, persisted across sessions
- **AskUserQuestion UI** — Interactive prompts with multiple-choice options when Claude needs input

## Screenshots

<!-- TODO: Add screenshots -->

## Prerequisites

- [Claude Code CLI](https://docs.anthropic.com/en/docs/claude-code) (v2.0+) installed and authenticated
- [Node.js](https://nodejs.org/) 20+
- macOS, Windows, or Linux

## Getting Started

```bash
# Clone the repo
git clone https://github.com/pyalwin/bifrost.git
cd bifrost

# Install dependencies
npm install

# Run in development mode
npm run dev
```

The app will launch as a native Electron window. Click **New thread** in the sidebar, select a project directory, and start chatting.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Runtime | Electron |
| Framework | React 18 + TypeScript |
| Build | electron-vite |
| Styling | Tailwind CSS v4 |
| Components | shadcn/ui (New York) |
| Syntax Highlighting | Shiki |
| Markdown | react-markdown + remark-gfm |
| Diagrams | Mermaid |
| Diff Parsing | parse-diff |
| File Watching | chokidar |
| CLI Communication | WebSocket (ws) |

## Architecture

```
Electron Main Process
├── WsBridge          — WebSocket server for CLI communication
├── SessionManager    — CLI process lifecycle, auto-reconnect
├── GitWatcher        — File watching + live diff updates
├── SessionDiscovery  — Scan ~/.claude/projects/ for session history
└── SessionHistory    — Load conversation history from JSONL files

Electron Renderer (React)
├── Sidebar           — Project-grouped session list
├── ChatPanel         — Messages, streaming, tool progress
├── DiffPanel         — Collapsible git diff viewer
├── InputBox          — Message input with model selector
└── TitleBar          — Branch, connection status, diff toggle
```

## Development

```bash
# Run development server with hot reload
npm run dev

# Type check
npm run typecheck

# Lint
npm run lint

# Build for production
npm run build
```

## How It Works

1. **Bifrost starts a WebSocket server** in the Electron main process
2. **Claude Code CLI connects** via `--sdk-url ws://localhost:PORT`
3. **Messages flow bidirectionally** — user prompts go to CLI, streaming responses come back as NDJSON events
4. **Tool approvals** are handled automatically (or manually with the shield toggle)
5. **Git diffs** are detected via chokidar file watching and parsed with parse-diff
6. **Sessions are discovered** by scanning `~/.claude/projects/` for JSONL session files

## Contributing

Contributions are welcome! Please open an issue first to discuss what you'd like to change.

1. Fork the repo
2. Create your feature branch (`git checkout -b feat/amazing-feature`)
3. Commit your changes (`git commit -m 'feat: add amazing feature'`)
4. Push to the branch (`git push origin feat/amazing-feature`)
5. Open a Pull Request

## License

MIT

## Acknowledgments

- Built on top of [Claude Code](https://docs.anthropic.com/en/docs/claude-code) by Anthropic
- UI components from [shadcn/ui](https://ui.shadcn.com/)
- Icons from [Lucide](https://lucide.dev/)
