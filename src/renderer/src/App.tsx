import { useState, useEffect } from 'react'
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
import { mockConversation } from './mocks/conversations'
import { DiffPanel } from './features/diff/DiffPanel'
import { mockDiffs } from './mocks/diffs'

export default function App() {
  const { theme, toggleTheme } = useTheme()
  const claude = useClaude()
  const [manualApproval, setManualApproval] = useState(false)

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

  const handleNewSession = async () => {
    const dir = await window.claude?.selectDirectory()
    if (dir) await claude.startSession(dir)
  }

  if (claude.connectionState === 'idle') {
    return (
      <div className="h-screen flex flex-col bg-background text-foreground">
        <TitleBar
          branch=""
          theme={theme}
          onToggleTheme={toggleTheme}
          connectionState={claude.connectionState}
          manualApproval={manualApproval}
          onToggleApproval={() => setManualApproval(!manualApproval)}
        />
        <StartScreen
          onNewSession={handleNewSession}
          onResumeSession={() => console.log('Resume session — future work')}
        />
      </div>
    )
  }

  const displayDiffs = claude.diffs.length > 0 ? claude.diffs : mockDiffs

  return (
    <div className="h-screen flex flex-col bg-background text-foreground">
      <TitleBar
        branch={claude.branch || 'main'}
        theme={theme}
        onToggleTheme={toggleTheme}
        connectionState={claude.connectionState}
        manualApproval={manualApproval}
        onToggleApproval={() => setManualApproval(!manualApproval)}
      />
      <ResizablePanelGroup orientation="horizontal" className="flex-1">
        <ResizablePanel defaultSize={46} minSize={25}>
          <ChatPanel
            messages={claude.messages.length > 0 ? claude.messages : mockConversation.messages}
            streamingText={claude.streamingText}
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
          <DiffPanel files={displayDiffs} theme={theme} />
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  )
}
