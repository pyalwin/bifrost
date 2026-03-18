import { useState, useEffect, useCallback } from 'react'
import { useTheme } from './hooks/use-theme'
import { useClaude } from './hooks/use-claude'
import { TitleBar } from './features/title-bar/TitleBar'
import { Sidebar } from './features/sidebar/Sidebar'
import { ChatPanel } from './features/chat/ChatPanel'
import { DiffPanel } from './features/diff/DiffPanel'
import { cn } from './lib/utils'

export default function App() {
  const { theme, toggleTheme } = useTheme()
  const claude = useClaude()
  const [manualApproval, setManualApproval] = useState(false)
  const [_sessionError, setSessionError] = useState<string | null>(null)
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [diffOpen, setDiffOpen] = useState(false)

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

  // Auto-open diff panel when changes arrive
  useEffect(() => {
    if (claude.diffs.length > 0 && !diffOpen) {
      setDiffOpen(true)
    }
  }, [claude.diffs.length])

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

  // Compute diff stats for title bar
  const diffStats = claude.diffs.length > 0 ? {
    additions: claude.diffs.reduce((sum, f) => sum + f.additions, 0),
    deletions: claude.diffs.reduce((sum, f) => sum + f.deletions, 0),
  } : null

  return (
    <div className="h-screen flex flex-col bg-background text-foreground">
      <TitleBar
        branch={claude.branch || ''}
        projectPath={claude.projectPath}
        theme={theme}
        onToggleTheme={toggleTheme}
        connectionState={claude.connectionState}
        manualApproval={manualApproval}
        onToggleApproval={() => setManualApproval(!manualApproval)}
        sidebarOpen={sidebarOpen}
        onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
        diffStats={diffStats}
        onToggleDiff={() => setDiffOpen(!diffOpen)}
      />
      <div className="flex-1 flex overflow-hidden">
        <Sidebar
          isOpen={sidebarOpen}
          onToggle={() => setSidebarOpen(!sidebarOpen)}
          onNewSession={handleNewSession}
          onResumeSession={handleResumeSession}
          activeSessionId={null}
        />
        {/* Chat — takes remaining space */}
        <div className="flex-1 min-w-0">
          <ChatPanel
            messages={claude.messages}
            pendingApproval={claude.pendingApproval}
            onApprove={(id) => claude.approveRequest(id)}
            onDeny={(id) => claude.denyRequest(id)}
            onSend={claude.sendMessage}
            theme={theme}
            disabled={claude.connectionState !== 'active'}
          />
        </div>
        {/* Diff — collapsible from right */}
        <div className={cn(
          "border-l border-border transition-all duration-300 overflow-hidden",
          diffOpen ? "w-[45%]" : "w-0"
        )}>
          {diffOpen && <DiffPanel files={claude.diffs} theme={theme} />}
        </div>
      </div>
    </div>
  )
}
