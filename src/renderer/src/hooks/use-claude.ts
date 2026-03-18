import { useState, useEffect, useCallback, useRef } from 'react'
import type { Message, DiffFileData, ConnectionState, CLIEvent, ToolUsage } from '../types'

interface UseClaudeReturn {
  connectionState: ConnectionState
  messages: Message[]
  diffs: DiffFileData[]
  branch: string
  pendingApproval: { id: string; toolName: string; input: Record<string, unknown> } | null
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
      switch (event.type) {
        case 'assistant': {
          // Full assistant message — extract text from content blocks
          const textBlocks = event.message.content
            .filter((b): b is { type: 'text'; text: string } => b.type === 'text')
            .map(b => b.text)
            .join('')

          if (!textBlocks) break

          if (!isInTurn.current) {
            // No active turn — start one and set content
            startTurn()
          }

          // Update the current message with the accumulated text
          updateCurrentMessage(m => ({
            ...m,
            content: m.content ? m.content + '\n\n' + textBlocks : textBlocks,
            isThinking: false,
          }))
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
              // For Bash, show the command
              const cmd = String(event.input.command)
              target = cmd.length > 40 ? cmd.slice(0, 40) + '...' : cmd
            } else if ('pattern' in event.input) {
              target = String(event.input.pattern)
            }
          }

          const newTool: ToolUsage = {
            action: toolAction,
            target,
            status: event.is_error ? 'error' : 'success',
          }

          // Add tool to current message
          updateCurrentMessage(m => ({
            ...m,
            tools: [...(m.tools ?? []), newTool],
            isThinking: false,
          }))
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

          // Remove any pending tools (replace with final state)
          updateCurrentMessage(m => ({
            ...m,
            tools: m.tools?.filter(t => t.status !== 'pending'),
          }))

          finalizeTurn()
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
  }, [startTurn, finalizeTurn, updateCurrentMessage])

  const sendMessage = useCallback((text: string) => {
    // Finalize any in-progress turn before starting a new user message
    if (isInTurn.current) finalizeTurn()

    setMessages(prev => [...prev, {
      id: `msg-${++messageIdCounter.current}`,
      role: 'user',
      content: text,
    }])
    window.claude?.sendMessage(text)
  }, [finalizeTurn])

  const startSession = useCallback(async (workingDir: string) => {
    setMessages([])
    setDiffs([])
    currentTurnId.current = null
    isInTurn.current = false
    try {
      await window.claude?.startSession(workingDir)
    } catch (err) {
      console.error('[useClaude] startSession failed:', err)
      setConnectionState('idle')
      throw err
    }
  }, [])

  const resumeSession = useCallback(async (sessionId: string, workingDir: string) => {
    setMessages([])
    setDiffs([])
    currentTurnId.current = null
    isInTurn.current = false
    try {
      await window.claude?.resumeSession(sessionId, workingDir)
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
    connectionState, messages, diffs, branch, pendingApproval,
    startSession, resumeSession, sendMessage, cancelTurn, approveRequest, denyRequest,
  }
}
