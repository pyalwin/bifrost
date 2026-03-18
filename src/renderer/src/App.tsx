import { useState, useEffect, useCallback } from 'react'
import { useTheme } from './hooks/use-theme'
import { useClaude } from './hooks/use-claude'
import { TitleBar } from './features/title-bar/TitleBar'
import { StartScreen } from './features/start-screen/StartScreen'
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle
} from './components/ui/resizable'
import { ChatPanel } from './features/chat/ChatPanel'
import { DiffPanel } from './features/diff/DiffPanel'

export default function App() {
  const { theme, toggleTheme } = useTheme()
  const claude = useClaude()
  const [manualApproval, setManualApproval] = useState(false)
  const [sessionError, setSessionError] = useState<string | null>(null)

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'd') {
        e.preventDefault()
        toggleTheme()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [toggleTheme])

  const handleNewSession = useCallback(async () => {
    setSessionError(null)
    try {
      const dir = await window.claude?.selectDirectory()
      if (dir) {
        await claude.startSession(dir)
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      console.error('[App] Failed to start session:', message)
      setSessionError(message)
    }
  }, [claude])

  const handleResumeSession = useCallback(async (sessionId: string, workingDir: string) => {
    setSessionError(null)
    try {
      await claude.resumeSession(sessionId, workingDir)
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      console.error('[App] Failed to resume session:', message)
      setSessionError(message)
    }
  }, [claude])

  if (claude.connectionState === 'idle' || claude.connectionState === 'connecting') {
    return (
      <div className="h-screen flex flex-col bg-background text-foreground">
        <TitleBar
          branch=""
          projectPath=""
          theme={theme}
          onToggleTheme={toggleTheme}
          connectionState={claude.connectionState}
          manualApproval={manualApproval}
          onToggleApproval={() => setManualApproval(!manualApproval)}
        />
        <StartScreen
          onNewSession={handleNewSession}
          onStartSessionInDir={async (dir) => {
            setSessionError(null)
            try { await claude.startSession(dir) }
            catch (err) { setSessionError(err instanceof Error ? err.message : String(err)) }
          }}
          onResumeSession={handleResumeSession}
          isConnecting={claude.connectionState === 'connecting'}
          error={sessionError}
        />
      </div>
    )
  }

  return (
    <div className="h-screen flex flex-col bg-background text-foreground">
      <TitleBar
        branch={claude.branch || 'main'}
        projectPath={claude.projectPath}
        theme={theme}
        onToggleTheme={toggleTheme}
        connectionState={claude.connectionState}
        manualApproval={manualApproval}
        onToggleApproval={() => setManualApproval(!manualApproval)}
      />
      <ResizablePanelGroup orientation="horizontal" className="flex-1">
        <ResizablePanel defaultSize={46} minSize={25}>
          <ChatPanel
            messages={claude.messages}
            pendingApproval={claude.pendingApproval}
            onApprove={(id) => claude.approveRequest(id)}
            onDeny={(id) => claude.denyRequest(id)}
            onSend={claude.sendMessage}
            theme={theme}
            disabled={claude.connectionState !== 'active'}
          />
        </ResizablePanel>
        <ResizableHandle withHandle />
        <ResizablePanel defaultSize={54} minSize={30}>
          <DiffPanel files={claude.diffs} theme={theme} />
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  )
}
