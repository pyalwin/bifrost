import { useState, useEffect, useCallback } from 'react'
import { useTheme } from './hooks/use-theme'
import { useClaude } from './hooks/use-claude'
import { TitleBar } from './features/title-bar/TitleBar'
import { Sidebar } from './features/sidebar/Sidebar'
import { ChatPanel } from './features/chat/ChatPanel'
import { DiffPanel } from './features/diff/DiffPanel'
import { ReviewTabsBar } from './features/diff/ReviewTabsBar'
import { cn } from './lib/utils'
import type { Review } from './types/index'

export default function App() {
  const { theme, toggleTheme } = useTheme()
  const claude = useClaude()
  const [manualApproval, setManualApproval] = useState(false)
  const [_sessionError, setSessionError] = useState<string | null>(null)
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [diffOpen, setDiffOpen] = useState(false)
  const [model, setModel] = useState(() => localStorage.getItem('bifrost-model') ?? 'sonnet')
  const [reviews, setReviews] = useState<Review[]>([])
  const [activeReviewId, setActiveReviewId] = useState<string | null>(null)

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

  const handleSubmitReview = useCallback(async (review: Review) => {
    // Store the review for tracking
    setReviews(prev => [...prev, review])
    setActiveReviewId(review.id)

    const workingDir = claude.projectPath
    if (!workingDir) return

    // Build the review context message
    const commentsByFile = new Map<string, typeof review.comments>()
    for (const c of review.comments) {
      const existing = commentsByFile.get(c.filename) ?? []
      commentsByFile.set(c.filename, [...existing, c])
    }

    let message = `Please address the following code review comments:\n\n`
    for (const [filename, comments] of commentsByFile) {
      message += `**${filename}:**\n`
      for (const c of comments) {
        message += `- Line ${c.lineNumber}: ${c.text}\n`
      }
      message += '\n'
    }
    message += `Please fix each issue and explain what you changed.`

    await claude.startReviewSession(workingDir, message)
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

  // Compute diff stats for title bar — always show so user can toggle the pane
  const diffStats = {
    additions: claude.diffs.reduce((sum, f) => sum + f.additions, 0),
    deletions: claude.diffs.reduce((sum, f) => sum + f.deletions, 0),
  }

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
          currentBranch={claude.branch}
        />
        {/* Chat — takes remaining space */}
        <div className="flex-1 min-w-0">
          <ChatPanel
            messages={claude.messages}
            pendingApproval={claude.pendingApproval}
            onApprove={(id) => claude.approveRequest(id)}
            onDeny={(id) => claude.denyRequest(id)}
            onSend={claude.sendMessage}
            onAnswerQuestion={claude.answerQuestion}
            theme={theme}
            disabled={claude.connectionState !== 'active'}
            model={model}
            onModelChange={(m) => { setModel(m); localStorage.setItem('bifrost-model', m) }}
          />
        </div>
        {/* Diff — collapsible from right */}
        <div className={cn(
          "border-l border-border transition-all duration-300 overflow-hidden flex flex-col",
          diffOpen ? "w-[45%]" : "w-0"
        )}>
          {diffOpen && (
            <>
              <ReviewTabsBar
                reviews={reviews}
                activeReviewId={activeReviewId}
                onSelectReview={setActiveReviewId}
                onStartNewReview={() => {}}
              />
              <div className="flex-1 overflow-hidden">
                <DiffPanel files={claude.diffs} theme={theme} onSubmitReview={handleSubmitReview} />
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
