import { useState, useEffect, useCallback, useRef } from 'react'
import type { Message, DiffFileData, ConnectionState, CLIEvent, ToolUsage } from '../types'

interface UseClaudeReturn {
  connectionState: ConnectionState
  messages: Message[]
  diffs: DiffFileData[]
  branch: string
  projectPath: string
  hasConversationStarted: boolean
  pendingApproval: { id: string; toolName: string; input: Record<string, unknown> } | null
  startSession: (workingDir: string, model?: string) => Promise<void>
  startReviewSession: (workingDir: string, reviewMessage: string, model?: string) => Promise<void>
  resumeSession: (sessionId: string, workingDir: string, model?: string) => Promise<void>
  sendMessage: (text: string, images?: Array<{ base64: string; mediaType: string; name: string }>, model?: string) => void
  answerQuestion: (toolUseId: string, answer: string) => void
  cancelTurn: () => void
  approveRequest: (id: string) => void
  denyRequest: (id: string) => void
}

export function useClaude(): UseClaudeReturn {
  const [connectionState, setConnectionState] = useState<ConnectionState>('idle')
  const [messages, setMessages] = useState<Message[]>([])
  const [diffs, setDiffs] = useState<DiffFileData[]>([])
  const [branch, setBranch] = useState('')
  const [projectPath, setProjectPath] = useState('')
  const [hasConversationStarted, setHasConversationStarted] = useState(false)
  const [pendingApproval, setPendingApproval] = useState<UseClaudeReturn['pendingApproval']>(null)

  const messageIdCounter = useRef(0)
  // Track the current assistant turn — accumulates text + tools as events stream in
  const currentTurnId = useRef<string | null>(null)
  const isInTurn = useRef(false)

  // Helper: update the current streaming message in place
  const updateCurrentMessage = useCallback((updater: (msg: Message) => Message) => {
    if (!currentTurnId.current) return
    const id = currentTurnId.current
    setMessages(prev => prev.map(m => m.id === id ? updater(m) : m))
  }, [])

  // Helper: start a new assistant turn
  const startTurn = useCallback(() => {
    const id = `msg-${++messageIdCounter.current}`
    currentTurnId.current = id
    isInTurn.current = true
    setMessages(prev => [...prev, {
      id,
      role: 'assistant',
      content: '',
      tools: [],
      isStreaming: true,
      isThinking: true,
    }])
  }, [])

  // Helper: finalize the current turn
  const finalizeTurn = useCallback(() => {
    if (currentTurnId.current) {
      updateCurrentMessage(m => ({
        ...m,
        isStreaming: false,
        isThinking: false,
      }))
    }
    currentTurnId.current = null
    isInTurn.current = false
  }, [updateCurrentMessage])

  useEffect(() => {
    if (!window.claude) return

    const unsubMessage = window.claude.onMessage((event: CLIEvent) => {
      console.log('[useClaude] event:', event.type, 'subtype' in event ? (event as any).subtype : '')

      switch (event.type) {
        case 'assistant': {
          // Extract text blocks
          const textBlocks = event.message.content
            .filter((b): b is { type: 'text'; text: string } => b.type === 'text')
            .map(b => b.text)
            .join('')

          // Extract tool_use blocks (this is how tools appear in live WebSocket mode)
          const toolUseBlocks = event.message.content
            .filter((b): b is { type: 'tool_use'; id: string; name: string; input: Record<string, unknown> } => b.type === 'tool_use')

          // Nothing useful in this event
          if (!textBlocks && toolUseBlocks.length === 0) break

          if (!isInTurn.current) {
            startTurn()
          }

          // Check for AskUserQuestion tool — pauses the turn and waits for user input
          const askQuestion = toolUseBlocks.find(b => b.name === 'AskUserQuestion')
          if (askQuestion) {
            // Format: { questions: [{ question, header, options: [{ label, description }] }] }
            const questions = askQuestion.input.questions as Array<{
              question?: string; header?: string;
              options?: Array<{ label: string; description?: string }>
            }> | undefined
            const firstQ = questions?.[0]
            const questionText = firstQ?.question
              ?? (askQuestion.input.question as string)
              ?? (askQuestion.input.text as string)
              ?? ''
            if (questionText) {
              updateCurrentMessage(m => ({
                ...m,
                question: {
                  toolUseId: askQuestion.id,
                  text: questionText,
                  header: firstQ?.header,
                  options: firstQ?.options,
                },
                isStreaming: false,
                isThinking: false,
              }))
              break
            }
          }

          // Add tool_use items (skip AskUserQuestion since it's handled above)
          const regularTools = toolUseBlocks.filter(b => b.name !== 'AskUserQuestion')
          if (regularTools.length > 0) {
            const newTools: ToolUsage[] = regularTools.map(b => {
              let target = b.name
              if (b.input) {
                if (typeof b.input.file_path === 'string') {
                  target = String(b.input.file_path).split('/').pop() ?? b.name
                } else if (typeof b.input.command === 'string') {
                  const cmd = b.input.command as string
                  target = cmd.length > 40 ? cmd.slice(0, 40) + '...' : cmd
                } else if (typeof b.input.pattern === 'string') {
                  target = b.input.pattern as string
                } else if (typeof b.input.description === 'string') {
                  target = b.input.description as string
                }
              }
              return { action: b.name, target, status: 'pending' as const, toolUseId: b.id }
            })

            updateCurrentMessage(m => ({
              ...m,
              tools: [...(m.tools ?? []), ...newTools],
              isThinking: false,
            }))
          }

          // Add text content
          if (textBlocks) {
            // Mark any pending tools as success (text after tools means they completed)
            updateCurrentMessage(m => ({
              ...m,
              content: m.content ? m.content + '\n\n' + textBlocks : textBlocks,
              tools: m.tools?.map(t => t.status === 'pending' ? { ...t, status: 'success' as const } : t),
              isThinking: false,
            }))
          }
          break
        }

        case 'stream_event': {
          if (!event.delta?.text) break

          if (!isInTurn.current) {
            startTurn()
          }

          // Append streaming text to current message
          updateCurrentMessage(m => ({
            ...m,
            content: m.content + event.delta.text,
            isThinking: false,
          }))
          break
        }

        case 'tool_use_summary': {
          if (!isInTurn.current) {
            startTurn()
          }

          const toolAction = event.tool_name.replace(/Tool$/, '')
          let target = event.tool_name
          if (typeof event.input === 'object') {
            if ('file_path' in event.input) {
              target = String(event.input.file_path).split('/').pop() ?? event.tool_name
            } else if ('command' in event.input) {
              const cmd = String(event.input.command)
              target = cmd.length > 40 ? cmd.slice(0, 40) + '...' : cmd
            } else if ('pattern' in event.input) {
              target = String(event.input.pattern)
            } else if ('description' in event.input) {
              target = String(event.input.description)
            }
          }

          updateCurrentMessage(m => {
            const tools = [...(m.tools ?? [])]
            const pendingIdx = tools.findIndex(t => t.status === 'pending' && t.action === toolAction)
            if (pendingIdx >= 0) {
              const existing = tools[pendingIdx]
              tools[pendingIdx] = {
                ...existing,
                target: existing.target !== existing.action ? existing.target : target,
                status: event.is_error ? 'error' : 'success',
                children: existing.children?.map(c =>
                  c.status === 'pending' ? { ...c, status: 'success' as const } : c
                ),
              }
            } else {
              tools.push({
                action: toolAction,
                target,
                status: event.is_error ? 'error' : 'success',
              })
            }
            return { ...m, tools, isThinking: false }
          })
          break
        }

        case 'tool_progress': {
          if (!isInTurn.current) {
            startTurn()
          }
          // Show tool as "pending" while it's running
          updateCurrentMessage(m => {
            const existingPending = m.tools?.find(t => t.status === 'pending' && t.action === event.tool_name)
            if (existingPending) return m // Already showing
            return {
              ...m,
              tools: [...(m.tools ?? []), {
                action: event.tool_name.replace(/Tool$/, ''),
                target: event.progress || event.tool_name,
                status: 'pending' as const,
              }],
              isThinking: false,
            }
          })
          break
        }

        case 'control_request': {
          setPendingApproval({ id: event.id, toolName: event.tool_name, input: event.input })
          break
        }

        case 'result': {
          // Turn is done
          if (event.is_error && event.result) {
            if (!isInTurn.current) startTurn()
            updateCurrentMessage(m => ({
              ...m,
              content: m.content ? m.content + '\n\n' + event.result : event.result,
            }))
          }

          // Mark any remaining pending tools (and their children) as success
          updateCurrentMessage(m => ({
            ...m,
            tools: m.tools?.map(t => ({
              ...t,
              status: t.status === 'pending' ? 'success' as const : t.status,
              children: t.children?.map(c =>
                c.status === 'pending' ? { ...c, status: 'success' as const } : c
              ),
            })),
          }))

          finalizeTurn()
          break
        }

        case 'system':
        case 'keep_alive':
          // Ignore system/keepalive events
          break

        case 'error': {
          finalizeTurn()
          setConnectionState('idle')
          setMessages(prev => [...prev, {
            id: `msg-${++messageIdCounter.current}`,
            role: 'assistant',
            content: `Connection error: ${event.error}`,
          }])
          break
        }

        default: {
          // Handle progress events with agent child tools
          const rawEvent = event as any
          if (rawEvent.type === 'progress') {
            const progressData = rawEvent.data
            if (progressData?.type !== 'agent_progress') break

            const parentToolUseID = rawEvent.parentToolUseID as string | undefined
            if (!parentToolUseID) break

            const innerMsg = progressData.message
            if (innerMsg?.type !== 'assistant') break

            const innerContent = innerMsg.message?.content
            if (!Array.isArray(innerContent)) break

            const childTools: ToolUsage[] = []
            for (const block of innerContent) {
              if (block.type === 'tool_use' && typeof block.name === 'string') {
                let childTarget = block.name
                const input = block.input as Record<string, unknown> | undefined
                if (input) {
                  if (typeof input.file_path === 'string') {
                    childTarget = String(input.file_path).split('/').pop() ?? block.name
                  } else if (typeof input.command === 'string') {
                    const cmd = input.command as string
                    childTarget = cmd.length > 40 ? cmd.slice(0, 40) + '...' : cmd
                  } else if (typeof input.pattern === 'string') {
                    childTarget = input.pattern as string
                  } else if (typeof input.description === 'string') {
                    childTarget = input.description as string
                  }
                }
                childTools.push({
                  action: block.name,
                  target: childTarget,
                  status: 'pending' as const,
                  toolUseId: block.id,
                })
              }
            }

            if (childTools.length === 0) break

            if (!isInTurn.current) startTurn()

            updateCurrentMessage(m => {
              const tools = (m.tools ?? []).map(t => {
                if (t.toolUseId === parentToolUseID) {
                  const existingIds = new Set((t.children ?? []).map(c => c.toolUseId))
                  const newChildren = childTools.filter(c => !existingIds.has(c.toolUseId))
                  if (newChildren.length === 0) return t
                  return { ...t, children: [...(t.children ?? []), ...newChildren] }
                }
                return t
              })
              return { ...m, tools }
            })
            break
          }

          // Unknown event — log but don't break anything
          console.log('[useClaude] unhandled event type:', (event as any).type)
          break
        }
      }
    })

    const unsubState = window.claude.onConnectionStateChange((state) => {
      setConnectionState(state as ConnectionState)
    })
    const unsubDiff = window.claude.onDiffUpdate((newDiffs) => {
      console.log('[useClaude] Received diffs:', (newDiffs as DiffFileData[]).length, 'files')
      setDiffs(newDiffs as DiffFileData[])
    })
    const unsubBranch = window.claude.onBranchChange((newBranch) => {
      setBranch(newBranch)
    })

    const unsubHistory = window.claude.onHistory?.((historyMessages) => {
      console.log('[useClaude] Received history:', (historyMessages as Message[]).length, 'messages')
      setMessages(historyMessages as Message[])
      setHasConversationStarted(true)
    })

    return () => { unsubMessage(); unsubState(); unsubDiff(); unsubBranch(); unsubHistory?.() }
  }, [startTurn, finalizeTurn, updateCurrentMessage])

  const sendMessage = useCallback((text: string, images?: Array<{ base64: string; mediaType: string; name: string }>, model?: string) => {
    // Finalize any in-progress turn before starting a new user message
    if (isInTurn.current) finalizeTurn()

    setHasConversationStarted(true)

    // Add user message
    setMessages(prev => [...prev, {
      id: `msg-${++messageIdCounter.current}`,
      role: 'user',
      content: text,
      images,
    }])

    // Immediately start the assistant turn so thinking indicator shows instantly
    startTurn()

    window.claude?.sendMessage(text, images, model)
  }, [finalizeTurn, startTurn])

  const answerQuestion = useCallback((_toolUseId: string, answer: string) => {
    // Clear the question from the message
    updateCurrentMessage(m => ({
      ...m,
      question: undefined,
      isStreaming: true,
      isThinking: true,
    }))

    // Add user's answer as a visible message
    setMessages(prev => [...prev, {
      id: `msg-${++messageIdCounter.current}`,
      role: 'user',
      content: answer,
    }])

    // Send as a user message — the CLI treats it as the tool_result response
    // In WebSocket SDK mode, a regular user message continues the turn
    window.claude?.sendMessage(answer)
  }, [updateCurrentMessage])

  const startReviewSession = useCallback(async (workingDir: string, reviewMessage: string, model?: string) => {
    setMessages([])
    setDiffs([])
    setProjectPath(workingDir)
    setHasConversationStarted(true)
    setConnectionState('connecting')
    currentTurnId.current = null
    isInTurn.current = false

    try {
      await window.claude?.startSession(workingDir, model)
      // Send the review context as the first message after connection
      setTimeout(() => sendMessage(reviewMessage, undefined, model), 500)
    } catch (err) {
      console.error('[useClaude] startReviewSession failed:', err)
      setConnectionState('idle')
    }
  }, [sendMessage])

  const startSession = useCallback(async (workingDir: string, model?: string) => {
    setMessages([])
    setDiffs([])
    setProjectPath(workingDir)
    setHasConversationStarted(false)
    setConnectionState('connecting')
    currentTurnId.current = null
    isInTurn.current = false
    try {
      await window.claude?.startSession(workingDir, model)
    } catch (err) {
      console.error('[useClaude] startSession failed:', err)
      setConnectionState('idle')
      throw err
    }
  }, [])

  const resumeSession = useCallback(async (sessionId: string, workingDir: string, model?: string) => {
    setMessages([])
    setDiffs([])
    setProjectPath(workingDir)
    setHasConversationStarted(true)
    setConnectionState('connecting')
    currentTurnId.current = null
    isInTurn.current = false
    try {
      await window.claude?.resumeSession(sessionId, workingDir, model)
    } catch (err) {
      console.error('[useClaude] resumeSession failed:', err)
      setConnectionState('idle')
      throw err
    }
  }, [])

  const cancelTurn = useCallback(() => {
    finalizeTurn()
    window.claude?.cancelTurn()
  }, [finalizeTurn])

  const approveRequest = useCallback((id: string) => {
    window.claude?.sendControlResponse(id, true)
    setPendingApproval(null)
  }, [])

  const denyRequest = useCallback((id: string) => {
    window.claude?.sendControlResponse(id, false)
    setPendingApproval(null)
  }, [])

  return {
    connectionState, messages, diffs, branch, projectPath, hasConversationStarted, pendingApproval,
    startSession, startReviewSession, resumeSession, sendMessage, answerQuestion, cancelTurn, approveRequest, denyRequest,
  }
}
