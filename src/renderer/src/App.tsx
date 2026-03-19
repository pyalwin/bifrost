import { useState, useEffect, useCallback } from 'react'
import { useTheme } from './hooks/use-theme'
import { useClaude } from './hooks/use-claude'
import { TitleBar } from './features/title-bar/TitleBar'
import { Sidebar } from './features/sidebar/Sidebar'
import { ChatPanel } from './features/chat/ChatPanel'
import { DiffPanel } from './features/diff/DiffPanel'
import { ReviewTabsBar } from './features/diff/ReviewTabsBar'
import { cn } from './lib/utils'
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from './components/ui/resizable'
import type { Review, PullRequest, PlanComment } from './types/index'
import { CreatePRDialog } from './features/pr/CreatePRDialog'
import { PlanReview } from './features/plan/PlanReview'

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
  const [currentPR, setCurrentPR] = useState<PullRequest | null>(null)
  const [showCreatePR, setShowCreatePR] = useState(false)
  const [prCreating, setPrCreating] = useState(false)
  const [prError, setPrError] = useState<string | null>(null)
  const [planReview, setPlanReview] = useState<{ title: string; filePath: string; content: string } | null>(null)

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

  // Fetch PR for current branch
  useEffect(() => {
    if (claude.branch) {
      window.claude?.getPullRequest()
        .then(pr => setCurrentPR(pr))
        .catch(() => setCurrentPR(null))
    } else {
      setCurrentPR(null)
    }
  }, [claude.branch])

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

  const handleCreatePR = useCallback(async (title: string, body: string) => {
    setPrCreating(true)
    setPrError(null)
    try {
      const result = await window.claude?.createPullRequest(title, body)
      if (result?.success && result.pr) {
        setCurrentPR(result.pr)
        setShowCreatePR(false)
      } else {
        setPrError(result?.error ?? 'Failed to create PR')
      }
    } catch (err) {
      setPrError(err instanceof Error ? err.message : String(err))
    } finally {
      setPrCreating(false)
    }
  }, [])

  const openPlanReview = useCallback(async (filePath: string) => {
    const content = await window.claude?.loadPlanFile(filePath)
    if (content) {
      const title = filePath.split('/').pop()?.replace('.md', '').replace(/[-_]/g, ' ').replace(/^\d{4}-\d{2}-\d{2}-?/, '').replace(/^\w/, c => c.toUpperCase()) ?? 'Plan'
      setPlanReview({ title, filePath, content })
    }
  }, [])

  const handlePlanApprove = useCallback((comments: PlanComment[]) => {
    let message = 'The plan has been approved. Please proceed with implementation.'
    if (comments.length > 0) {
      message += '\n\nAdditional comments to consider:\n'
      for (const c of comments) {
        message += `- ${c.text}\n`
      }
    }
    setPlanReview(null)
    claude.sendMessage(message)
  }, [claude])

  const handlePlanRevise = useCallback((comments: PlanComment[]) => {
    let message = 'Please revise the plan based on these review comments:\n\n'
    for (const c of comments) {
      message += `- ${c.text}\n`
    }
    message += '\nUpdate the plan file and re-open it for review.'
    setPlanReview(null)
    claude.sendMessage(message)
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
        pullRequest={currentPR}
      />
      <div className="flex-1 flex overflow-hidden">
        <Sidebar
          isOpen={sidebarOpen}
          onToggle={() => setSidebarOpen(!sidebarOpen)}
          onNewSession={handleNewSession}
          onResumeSession={handleResumeSession}
          activeSessionId={null}
          currentBranch={claude.branch}
          pullRequest={currentPR}
          onCreatePR={() => setShowCreatePR(true)}
        />
        <ResizablePanelGroup direction="horizontal">
          {/* Chat panel */}
          <ResizablePanel defaultSize={diffOpen ? 55 : 100} minSize={30}>
            {planReview ? (
              <PlanReview
                title={planReview.title}
                filePath={planReview.filePath}
                content={planReview.content}
                theme={theme}
                onClose={() => setPlanReview(null)}
                onApprove={handlePlanApprove}
                onRevise={handlePlanRevise}
              />
            ) : (
              <ChatPanel
                messages={claude.messages}
                pendingApproval={claude.pendingApproval}
                onApprove={(id) => claude.approveRequest(id)}
                onDeny={(id) => claude.denyRequest(id)}
                onSend={claude.sendMessage}
                onAnswerQuestion={claude.answerQuestion}
                onOpenFile={openPlanReview}
                theme={theme}
                disabled={claude.connectionState !== 'active'}
                model={model}
                onModelChange={(m) => { setModel(m); localStorage.setItem('bifrost-model', m) }}
              />
            )}
          </ResizablePanel>

          {/* Diff panel — resizable */}
          {diffOpen && (
            <>
              <ResizableHandle />
              <ResizablePanel defaultSize={45} minSize={20}>
                <div className="h-full flex flex-col">
                  <ReviewTabsBar
                    reviews={reviews}
                    activeReviewId={activeReviewId}
                    onSelectReview={setActiveReviewId}
                    onStartNewReview={() => {}}
                  />
                  <div className="flex-1 overflow-hidden">
                    <DiffPanel files={claude.diffs} theme={theme} onSubmitReview={handleSubmitReview} />
                  </div>
                </div>
              </ResizablePanel>
            </>
          )}
        </ResizablePanelGroup>
      </div>
      {showCreatePR && (
        <CreatePRDialog
          branchName={claude.branch || ''}
          baseBranch="main"
          onSubmit={handleCreatePR}
          onCancel={() => { setShowCreatePR(false); setPrError(null) }}
          isSubmitting={prCreating}
          error={prError}
        />
      )}
    </div>
  )
}
