import { readdirSync, statSync, readFileSync } from 'fs'
import { join, sep } from 'path'
import { homedir } from 'os'

export interface DiscoveredSession {
  id: string
  workingDir: string
  firstMessage: string
  timestamp: number  // ms since epoch
}

/**
 * Convert a working directory path to Claude's project directory name.
 * Claude uses the absolute path with '/' replaced by '-'.
 * e.g. /Users/ottimate/Documents/code/datadash → -Users-ottimate-Documents-code-datadash
 */
function pathToProjectDir(workingDir: string): string {
  return workingDir.split(sep).join('-')
}

/**
 * Check if text looks like a real human message (not a system/command/meta message).
 */
function isRealUserText(text: string): boolean {
  if (!text || text.length < 2) return false
  // Skip XML-like system messages
  if (text.startsWith('<')) return false
  // Skip slash commands that aren't meaningful
  if (text === 'claude') return false
  return true
}

/**
 * Extract text content from a message's content field (string or array of blocks).
 */
function extractTextFromContent(content: unknown): string {
  if (typeof content === 'string') return content
  if (Array.isArray(content)) {
    for (const block of content) {
      if (typeof block === 'object' && block !== null) {
        const b = block as Record<string, unknown>
        if (b.type === 'text' && typeof b.text === 'string') {
          return b.text
        }
      }
    }
  }
  return ''
}

/**
 * Extract the first real user message from a session JSONL file.
 * Handles multiple formats and skips system/meta/command messages.
 */
function extractFirstMessage(jsonlPath: string): string {
  try {
    const raw = readFileSync(jsonlPath, 'utf-8')
    const lines = raw.split('\n')

    const limit = Math.min(lines.length, 300)
    for (let i = 0; i < limit; i++) {
      const line = lines[i]?.trim()
      if (!line) continue

      let d: Record<string, unknown>
      try { d = JSON.parse(line) } catch { continue }

      // Format 1: queue-operation (from --print mode sessions)
      if (d.type === 'queue-operation' && typeof d.content === 'string') {
        if (isRealUserText(d.content)) return d.content
      }

      // Format 2: user message (from interactive sessions)
      if (d.type === 'user' && !d.isMeta) {
        const msg = d.message as Record<string, unknown> | undefined
        if (!msg) continue
        const text = extractTextFromContent(msg.content)
        if (isRealUserText(text)) return text
        // Keep scanning — this user message was a system/command message
      }
    }
    return ''
  } catch {
    return ''
  }
}

/**
 * Discover Claude Code sessions for a given working directory.
 * Scans ~/.claude/projects/<project-dir>/*.jsonl
 */
export function discoverSessions(workingDir: string): DiscoveredSession[] {
  const claudeDir = join(homedir(), '.claude', 'projects')
  const projectDir = join(claudeDir, pathToProjectDir(workingDir))

  console.log(`[SessionDiscovery] Scanning: ${projectDir}`)

  let files: string[]
  try {
    files = readdirSync(projectDir).filter(f => f.endsWith('.jsonl'))
  } catch {
    console.log('[SessionDiscovery] No sessions found (directory does not exist)')
    return []
  }

  const sessions: DiscoveredSession[] = []
  for (const file of files) {
    const sessionId = file.replace('.jsonl', '')
    const fullPath = join(projectDir, file)

    try {
      const stat = statSync(fullPath)
      const firstMessage = extractFirstMessage(fullPath)

      sessions.push({
        id: sessionId,
        workingDir,
        firstMessage: firstMessage.slice(0, 100),
        timestamp: stat.mtimeMs,
      })
    } catch {
      // Skip unreadable files
    }
  }

  // Sort newest first
  sessions.sort((a, b) => b.timestamp - a.timestamp)

  console.log(`[SessionDiscovery] Found ${sessions.length} sessions`)
  return sessions
}

export interface DiscoveredProject {
  name: string
  workingDir: string
  sessionCount: number
  lastActive: number  // ms since epoch
}

/**
 * Discover all known projects from ~/.claude/projects/.
 * Returns projects sorted by most recently active.
 */
export function discoverProjects(): DiscoveredProject[] {
  const claudeDir = join(homedir(), '.claude', 'projects')

  let projectDirs: string[]
  try {
    projectDirs = readdirSync(claudeDir)
  } catch {
    return []
  }

  const projects: DiscoveredProject[] = []

  for (const dir of projectDirs) {
    const projectPath = join(claudeDir, dir)
    let files: string[]
    try {
      files = readdirSync(projectPath).filter(f => f.endsWith('.jsonl'))
    } catch {
      continue
    }
    if (files.length === 0) continue

    // Reverse: -Users-ottimate-Documents-code-datadash → /Users/ottimate/Documents/code/datadash
    const workingDir = sep + dir.replace(/^-/, '').split('-').join(sep)
    const name = workingDir.split(sep).filter(Boolean).pop() ?? dir

    // Find most recent session file
    let lastActive = 0
    for (const file of files) {
      try {
        const stat = statSync(join(projectPath, file))
        if (stat.mtimeMs > lastActive) lastActive = stat.mtimeMs
      } catch { /* skip */ }
    }

    projects.push({ name, workingDir, sessionCount: files.length, lastActive })
  }

  projects.sort((a, b) => b.lastActive - a.lastActive)
  return projects
}

/**
 * Discover sessions for all known projects (scans all project dirs).
 * Returns the 20 most recent sessions across all projects.
 */
export function discoverAllSessions(): DiscoveredSession[] {
  const claudeDir = join(homedir(), '.claude', 'projects')

  let projectDirs: string[]
  try {
    projectDirs = readdirSync(claudeDir)
  } catch {
    return []
  }

  const allSessions: DiscoveredSession[] = []

  for (const dir of projectDirs) {
    // Reverse the path conversion: -Users-ottimate-... → /Users/ottimate/...
    const workingDir = dir.split('-').join(sep)

    const projectPath = join(claudeDir, dir)
    let files: string[]
    try {
      files = readdirSync(projectPath).filter(f => f.endsWith('.jsonl'))
    } catch {
      continue
    }

    for (const file of files) {
      const sessionId = file.replace('.jsonl', '')
      const fullPath = join(projectPath, file)

      try {
        const stat = statSync(fullPath)
        const firstMessage = extractFirstMessage(fullPath)

        allSessions.push({
          id: sessionId,
          workingDir,
          firstMessage: firstMessage.slice(0, 100),
          timestamp: stat.mtimeMs,
        })
      } catch {
        // Skip
      }
    }
  }

  allSessions.sort((a, b) => b.timestamp - a.timestamp)
  return allSessions.slice(0, 20)
}
