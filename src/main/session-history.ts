import { readFileSync } from 'fs'
import { join, sep } from 'path'
import { homedir } from 'os'

interface HistoryMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  tools?: { action: string; target: string; status: 'success' | 'error' }[]
}

/**
 * Convert working dir to Claude's project directory path.
 */
function pathToProjectDir(workingDir: string): string {
  return workingDir.split(sep).join('-')
}

/**
 * Extract text content from a message's content field.
 */
function extractText(content: unknown): string {
  if (typeof content === 'string') return content
  if (Array.isArray(content)) {
    const texts: string[] = []
    for (const block of content) {
      if (typeof block === 'object' && block !== null) {
        const b = block as Record<string, unknown>
        if (b.type === 'text' && typeof b.text === 'string') {
          texts.push(b.text)
        }
      }
    }
    return texts.join('\n\n')
  }
  return ''
}

/**
 * Extract tool uses from assistant content blocks.
 */
function extractTools(content: unknown): HistoryMessage['tools'] {
  if (!Array.isArray(content)) return undefined
  const tools: NonNullable<HistoryMessage['tools']> = []
  for (const block of content) {
    if (typeof block === 'object' && block !== null) {
      const b = block as Record<string, unknown>
      if (b.type === 'tool_use' && typeof b.name === 'string') {
        const input = b.input as Record<string, unknown> | undefined
        let target = b.name
        if (input) {
          if (typeof input.file_path === 'string') {
            target = input.file_path.split('/').pop() ?? b.name
          } else if (typeof input.command === 'string') {
            const cmd = input.command as string
            target = cmd.length > 40 ? cmd.slice(0, 40) + '...' : cmd
          } else if (typeof input.pattern === 'string') {
            target = input.pattern as string
          }
        }
        tools.push({ action: b.name, target, status: 'success' })
      }
    }
  }
  return tools.length > 0 ? tools : undefined
}

/**
 * Load conversation history from a Claude session JSONL file.
 * Returns messages suitable for rendering in the chat UI.
 */
export function loadSessionHistory(sessionId: string, workingDir: string): HistoryMessage[] {
  const claudeDir = join(homedir(), '.claude', 'projects')
  const projectDir = join(claudeDir, pathToProjectDir(workingDir))
  const jsonlPath = join(projectDir, `${sessionId}.jsonl`)

  console.log(`[SessionHistory] Loading: ${jsonlPath}`)

  let raw: string
  try {
    raw = readFileSync(jsonlPath, 'utf-8')
  } catch {
    console.log('[SessionHistory] File not found')
    return []
  }

  const messages: HistoryMessage[] = []
  const lines = raw.split('\n')
  let msgCounter = 0

  // Track the last assistant message to merge consecutive assistant text blocks
  let lastAssistantIdx = -1

  for (const line of lines) {
    if (!line.trim()) continue

    let d: Record<string, unknown>
    try { d = JSON.parse(line) } catch { continue }

    // Skip non-message types
    if (d.type !== 'user' && d.type !== 'assistant') continue
    // Skip meta messages
    if (d.isMeta) continue

    const msg = d.message as Record<string, unknown> | undefined
    if (!msg) continue

    const content = msg.content

    if (d.type === 'user') {
      const text = extractText(content)
      // Skip system/command messages
      if (!text || text.startsWith('<')) continue
      // Skip tool_result blocks (these are tool responses, not user messages)
      if (Array.isArray(content)) {
        const hasOnlyToolResults = content.every(
          (b: unknown) => typeof b === 'object' && b !== null && (b as Record<string, unknown>).type === 'tool_result'
        )
        if (hasOnlyToolResults) continue
      }

      messages.push({
        id: `hist-${++msgCounter}`,
        role: 'user',
        content: text,
      })
      lastAssistantIdx = -1

    } else if (d.type === 'assistant') {
      const text = extractText(content)
      const tools = extractTools(content)

      // Skip empty assistant messages (thinking-only, tool-use-only with no text)
      if (!text && !tools) continue

      // Merge consecutive assistant messages (text after tools in same turn)
      if (lastAssistantIdx >= 0 && !text && tools) {
        // Tool-only block — append tools to last assistant message
        const last = messages[lastAssistantIdx]
        if (last && last.role === 'assistant') {
          last.tools = [...(last.tools ?? []), ...tools]
          continue
        }
      }

      if (lastAssistantIdx >= 0 && text && !tools) {
        // Text-only block after assistant — merge if last was also assistant
        const last = messages[lastAssistantIdx]
        if (last && last.role === 'assistant' && last.content) {
          last.content = last.content + '\n\n' + text
          continue
        }
      }

      messages.push({
        id: `hist-${++msgCounter}`,
        role: 'assistant',
        content: text,
        tools,
      })
      lastAssistantIdx = messages.length - 1
    }
  }

  console.log(`[SessionHistory] Loaded ${messages.length} messages`)
  return messages
}
