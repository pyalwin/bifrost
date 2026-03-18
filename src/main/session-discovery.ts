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
 * Extract the first user message from a session JSONL file.
 * The first line is typically a queue-operation with the initial prompt.
 */
function extractFirstMessage(jsonlPath: string): string {
  try {
    const firstLine = readFileSync(jsonlPath, 'utf-8').split('\n')[0]
    if (!firstLine) return ''
    const data = JSON.parse(firstLine)
    if (data.type === 'queue-operation' && data.content) {
      return typeof data.content === 'string' ? data.content : ''
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
