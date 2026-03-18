import { useState, useEffect, useCallback, useRef } from 'react'
import type { Message, DiffFileData, ConnectionState, CLIEvent, ToolUsage } from '../types'

interface UseClaudeReturn {
  connectionState: ConnectionState
  messages: Message[]
  diffs: DiffFileData[]
  branch: string
  streamingText: string
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
  const [streamingText, setStreamingText] = useState('')
  const [pendingApproval, setPendingApproval] = useState<UseClaudeReturn['pendingApproval']>(null)
  const messageIdCounter = useRef(0)
  const currentTools = useRef<ToolUsage[]>([])

  useEffect(() => {
    if (!window.claude) return

    const unsubMessage = window.claude.onMessage((event: CLIEvent) => {
      switch (event.type) {
        case 'assistant': {
          const textBlocks = event.message.content
            .filter((b): b is { type: 'text'; text: string } => b.type === 'text')
            .map((b) => b.text)
            .join('')

          if (textBlocks) {
            setMessages((prev) => [
              ...prev,
              {
                id: `msg-${++messageIdCounter.current}`,
                role: 'assistant',
                content: textBlocks,
                tools:
                  currentTools.current.length > 0 ? [...currentTools.current] : undefined
              }
            ])
            currentTools.current = []
            setStreamingText('')
          }
          break
        }
        case 'stream_event': {
          if (event.delta?.text) {
            setStreamingText((prev) => prev + event.delta.text)
          }
          break
        }
        case 'tool_use_summary': {
          currentTools.current.push({
            action: event.tool_name.replace(/Tool$/, ''),
            target:
              typeof event.input === 'object' && 'file_path' in event.input
                ? String(event.input.file_path).split('/').pop() ?? event.tool_name
                : event.tool_name,
            status: event.is_error ? 'error' : 'success'
          })
          break
        }
        case 'control_request': {
          setPendingApproval({ id: event.id, toolName: event.tool_name, input: event.input })
          break
        }
        case 'result': {
          setStreamingText('')
          if (event.is_error && event.result) {
            setMessages((prev) => [
              ...prev,
              {
                id: `msg-${++messageIdCounter.current}`,
                role: 'assistant',
                content: event.result,
                tools:
                  currentTools.current.length > 0 ? [...currentTools.current] : undefined
              }
            ])
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

    return () => {
      unsubMessage()
      unsubState()
      unsubDiff()
      unsubBranch()
    }
  }, [])

  const sendMessage = useCallback((text: string) => {
    setMessages((prev) => [
      ...prev,
      {
        id: `msg-${++messageIdCounter.current}`,
        role: 'user',
        content: text
      }
    ])
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
    connectionState,
    messages,
    diffs,
    branch,
    streamingText,
    pendingApproval,
    startSession,
    resumeSession,
    sendMessage,
    cancelTurn,
    approveRequest,
    denyRequest
  }
}
