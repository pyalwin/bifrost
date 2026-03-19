import { useState, useEffect, useCallback } from 'react'
import { useTheme } from './hooks/use-theme'
import { useClaude } from './hooks/use-claude'
import { TitleBar } from './features/title-bar/TitleBar'
import { Sidebar } from './features/sidebar/Sidebar'
import { ChatPanel } from './features/chat/ChatPanel'
import { FilesChangedView } from './features/diff/FilesChangedView'
import { FileTree } from './features/diff/FileTree'
import { MainTabBar, type TabId } from './features/tabs/MainTabBar'
import type { Review, PullRequest, PlanComment } from './types/index'
import { CreatePRDialog } from './features/pr/CreatePRDialog'
import { PlanReview } from './features/plan/PlanReview'
import { CommitsView } from './features/commits/CommitsView'
import { ReviewsView } from './features/reviews/ReviewsView'

export default function App() {
  const { theme, toggleTheme } = useTheme()
  const claude = useClaude()
  const [manualApproval, setManualApproval] = useState(false)
  const [_sessionError, setSessionError] = useState<string | null>(null)
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [activeTab, setActiveTab] = useState<TabId>('conversation')
  const [model, setModel] = useState(() => localStorage.getItem('bifrost-model') ?? 'sonnet')
  const [reviews, setReviews] = useState<Review[]>([])
  const [activeReviewId, setActiveReviewId] = useState<string | null>(null)
  const [currentPR, setCurrentPR] = useState<PullRequest | null>(null)
  const [showCreatePR, setShowCreatePR] = useState(false)
  const [prCreating, setPrCreating] = useState(false)
  const [prError, setPrError] = useState<string | null>(null)
  const [planReview, setPlanReview] = useState<{ title: string; filePath: string; content: string } | null>(null)
  const [selectedFile, setSelectedFile] = useState<string | null>(null)

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
    console.log('[App] openPlanReview called with:', filePath)
    try {
      const content = await window.claude?.loadPlanFile(filePath)
      console.log('[App] loadPlanFile result:', content ? `${content.length} chars` : 'null')
      if (content) {
        const title = filePath.split('/').pop()?.replace('.md', '').replace(/[-_]/g, ' ').replace(/^\d{4}-\d{2}-\d{2}-?/, '').replace(/^\w/, c => c.toUpperCase()) ?? 'Plan'
        setPlanReview({ title, filePath, content })
      }
    } catch (err) {
      console.error('[App] openPlanReview error:', err)
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

  // Compute diff stats for tab bar
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
        pullRequest={currentPR}
      />
      <div className="flex-1 flex overflow-hidden">
        {/* Left sidebar area — fixed width, content changes per tab */}
        {sidebarOpen && (
          <div className="w-[260px] shrink-0 bg-title-bar border-r border-border overflow-hidden">
            {activeTab === 'conversation' && (
              <Sidebar
                isOpen={true}
                onToggle={() => setSidebarOpen(!sidebarOpen)}
                onNewSession={handleNewSession}
                onResumeSession={handleResumeSession}
                activeSessionId={null}
                currentBranch={claude.branch}
                pullRequest={currentPR}
                onCreatePR={() => setShowCreatePR(true)}
              />
            )}
            {activeTab === 'files' && (
              <FileTree
                files={claude.diffs}
                selectedFile={selectedFile}
                onSelectFile={setSelectedFile}
              />
            )}
            {(activeTab === 'commits' || activeTab === 'reviews') && (
              <div className="flex items-center justify-center h-full text-muted-foreground/30 text-[11px]">
                No sidebar for this view
              </div>
            )}
          </div>
        )}

        {/* Right work pane — tab bar + content, always in the same position */}
        <div className="flex-1 flex flex-col min-w-0">
          <MainTabBar
            activeTab={activeTab}
            onTabChange={setActiveTab}
            filesCount={claude.diffs.length}
            reviewCount={reviews.length}
            diffStats={diffStats}
            disabled={!claude.projectPath}
          />
          <div className="flex-1 overflow-hidden">
            {/* Conversation tab */}
            {activeTab === 'conversation' && (
              <div className="h-full">
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
              </div>
            )}

            {/* Files Changed tab */}
            {activeTab === 'files' && (
              <FilesChangedView
                files={claude.diffs}
                theme={theme}
                reviews={reviews}
                activeReviewId={activeReviewId}
                onSelectReview={setActiveReviewId}
                onSubmitReview={handleSubmitReview}
              />
            )}

            {/* Commits tab */}
            {activeTab === 'commits' && (
              <CommitsView branch={claude.branch || ''} />
            )}

            {/* Reviews tab */}
            {activeTab === 'reviews' && (
              <ReviewsView
                reviews={reviews}
                onStartNewReview={() => setActiveTab('files')}
                onSelectReview={(id) => { setActiveReviewId(id); setActiveTab('files') }}
              />
            )}
          </div>
        </div>
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
