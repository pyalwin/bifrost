import { useState, useEffect } from 'react'
import { GitBranch, ExternalLink, GitCommit, Sun, Moon, Shield, ShieldOff, Folder, PanelLeftOpen, PanelLeftClose, ChevronDown, Plus, Search, Check } from 'lucide-react'
import { cn } from '../../lib/utils'
import type { ConnectionState } from '../../types'

interface TitleBarProps {
  branch: string
  projectPath: string
  theme: 'light' | 'dark'
  onToggleTheme: () => void
  openDisabled?: boolean
  connectionState: ConnectionState
  manualApproval: boolean
  onToggleApproval: () => void
  sidebarOpen: boolean
  onToggleSidebar: () => void
  diffStats?: { additions: number; deletions: number } | null
  onToggleDiff?: () => void
  onBranchChange?: () => void
}

const stateColors: Record<ConnectionState, string> = {
  active: 'bg-green-500',
  connecting: 'bg-yellow-400',
  disconnected: 'bg-yellow-400',
  idle: 'bg-gray-400'
}

export function TitleBar({
  branch,
  projectPath,
  theme,
  onToggleTheme,
  openDisabled = true,
  connectionState,
  manualApproval,
  onToggleApproval,
  sidebarOpen,
  onToggleSidebar,
  diffStats,
  onToggleDiff,
  onBranchChange
}: TitleBarProps) {
  // Extract project name from path (last directory component)
  const projectName = projectPath ? projectPath.split('/').filter(Boolean).pop() ?? '' : ''

  const [showBranchPicker, setShowBranchPicker] = useState(false)
  const [showBasePicker, setShowBasePicker] = useState(false)
  const [branches, setBranches] = useState<string[]>([])
  const [baseBranch, setBaseBranch] = useState<string | null>(null)
  const [branchSearch, setBranchSearch] = useState('')
  const [baseSearch, setBaseSearch] = useState('')
  const [newBranchName, setNewBranchName] = useState('')
  const [isCreating, setIsCreating] = useState(false)

  // Load branches when picker opens
  useEffect(() => {
    if (showBranchPicker || showBasePicker) {
      window.claude?.listBranches().then(b => setBranches(b ?? []))
    }
    if (!showBranchPicker) {
      setBranchSearch('')
      setNewBranchName('')
      setIsCreating(false)
    }
    if (!showBasePicker) setBaseSearch('')
  }, [showBranchPicker, showBasePicker])

  // Load saved base branch
  useEffect(() => {
    window.claude?.getBaseBranch().then(b => setBaseBranch(b))
  }, [branch])

  const filteredBranches = branches.filter(b =>
    b.toLowerCase().includes(branchSearch.toLowerCase())
  )
  const filteredBaseBranches = branches.filter(b =>
    b.toLowerCase().includes(baseSearch.toLowerCase())
  )

  const handleCheckout = async (branchName: string, createNew: boolean) => {
    const result = await window.claude?.checkoutBranch(branchName, createNew)
    if (result?.success) {
      setShowBranchPicker(false)
      onBranchChange?.()
    }
  }

  const handleSetBase = async (branchName: string | null) => {
    await window.claude?.setBaseBranch(branchName)
    setBaseBranch(branchName)
    setShowBasePicker(false)
  }

  return (
    <div className="h-12 bg-title-bar border-b border-border flex items-center px-4 pl-20 select-none"
         style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}>
      {/* Sidebar toggle — sits within sidebar width area */}
      <button
        onClick={onToggleSidebar}
        title={sidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}
        className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-muted transition-colors text-muted-foreground/60 hover:text-foreground mr-3"
        style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
      >
        {sidebarOpen ? <PanelLeftClose className="w-4 h-4" /> : <PanelLeftOpen className="w-4 h-4" />}
      </button>

      <span className="font-semibold text-sm tracking-tight flex items-center gap-2">
        Bifrost
        <span className={cn('w-2 h-2 rounded-full', stateColors[connectionState])} />
      </span>

      {/* Project name + branch picker + base branch */}
      {(projectName || branch) && (
        <span className="flex items-center gap-1.5 ml-3.5 text-muted-foreground text-[13px]"
              style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}>
          {projectName && (
            <>
              <Folder className="w-[13px] h-[13px]" />
              <span title={projectPath}>{projectName}</span>
              <span className="text-muted-foreground/40 mx-0.5">/</span>
            </>
          )}

          {/* Current branch — clickable to open picker */}
          {branch && (
            <div className="relative">
              <button
                onClick={() => setShowBranchPicker(v => !v)}
                className="flex items-center gap-1 hover:text-foreground transition-colors"
              >
                <GitBranch className="w-[13px] h-[13px]" />
                <span>{branch}</span>
                <ChevronDown className="w-3 h-3 text-muted-foreground/50" />
              </button>

              {showBranchPicker && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowBranchPicker(false)} />
                  <div className="absolute top-full left-0 mt-2 w-64 bg-background border border-border rounded-lg shadow-lg z-50 animate-fade-in-up overflow-hidden">
                    {/* Search */}
                    <div className="flex items-center gap-2 px-3 py-2 border-b border-border">
                      <Search className="w-3.5 h-3.5 text-muted-foreground/50 shrink-0" />
                      <input
                        type="text"
                        value={branchSearch}
                        onChange={e => setBranchSearch(e.target.value)}
                        placeholder="Find or create a branch..."
                        className="flex-1 text-[13px] bg-transparent outline-none placeholder:text-muted-foreground/40"
                        autoFocus
                      />
                    </div>

                    {/* Branch list */}
                    <div className="max-h-48 overflow-y-auto py-1">
                      {filteredBranches.map(b => (
                        <button
                          key={b}
                          onClick={() => handleCheckout(b, false)}
                          className={cn(
                            "w-full text-left px-3 py-1.5 text-[13px] flex items-center gap-2 hover:bg-muted transition-colors",
                            b === branch && "text-foreground font-medium"
                          )}
                        >
                          <span className="truncate flex-1">{b}</span>
                          {b === branch && <Check className="w-3.5 h-3.5 shrink-0" />}
                        </button>
                      ))}
                    </div>

                    {/* Create new branch */}
                    <div className="border-t border-border">
                      {!isCreating ? (
                        <button
                          onClick={() => setIsCreating(true)}
                          className="w-full text-left px-3 py-2 text-[13px] flex items-center gap-2 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          Create new branch
                        </button>
                      ) : (
                        <div className="px-3 py-2 flex items-center gap-2">
                          <input
                            type="text"
                            value={newBranchName}
                            onChange={e => setNewBranchName(e.target.value)}
                            onKeyDown={e => {
                              if (e.key === 'Enter' && newBranchName.trim()) {
                                handleCheckout(newBranchName.trim(), true)
                              }
                              if (e.key === 'Escape') setIsCreating(false)
                            }}
                            placeholder="Branch name..."
                            className="flex-1 text-[13px] bg-transparent outline-none border-b border-border pb-1 placeholder:text-muted-foreground/40"
                            autoFocus
                          />
                        </div>
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          {/* Base branch selector */}
          {branch && (
            <>
              <span className="text-muted-foreground/30 mx-1">›</span>
              <div className="relative">
                <button
                  onClick={() => setShowBasePicker(v => !v)}
                  className="flex items-center gap-1 hover:text-foreground transition-colors"
                >
                  <span>{baseBranch ?? 'auto'}</span>
                  <ChevronDown className="w-3 h-3 text-muted-foreground/50" />
                </button>

                {showBasePicker && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setShowBasePicker(false)} />
                    <div className="absolute top-full left-0 mt-2 w-56 bg-background border border-border rounded-lg shadow-lg z-50 animate-fade-in-up overflow-hidden">
                      {/* Search */}
                      <div className="flex items-center gap-2 px-3 py-2 border-b border-border">
                        <Search className="w-3.5 h-3.5 text-muted-foreground/50 shrink-0" />
                        <input
                          type="text"
                          value={baseSearch}
                          onChange={e => setBaseSearch(e.target.value)}
                          placeholder="Select base branch..."
                          className="flex-1 text-[13px] bg-transparent outline-none placeholder:text-muted-foreground/40"
                          autoFocus
                        />
                      </div>

                      <div className="max-h-48 overflow-y-auto py-1">
                        {/* Auto-detect option */}
                        <button
                          onClick={() => handleSetBase(null)}
                          className={cn(
                            "w-full text-left px-3 py-1.5 text-[13px] flex items-center gap-2 hover:bg-muted transition-colors",
                            !baseBranch && "text-foreground font-medium"
                          )}
                        >
                          <span className="truncate flex-1 italic">Auto-detect (main/master)</span>
                          {!baseBranch && <Check className="w-3.5 h-3.5 shrink-0" />}
                        </button>

                        {filteredBaseBranches.map(b => (
                          <button
                            key={b}
                            onClick={() => handleSetBase(b)}
                            className={cn(
                              "w-full text-left px-3 py-1.5 text-[13px] flex items-center gap-2 hover:bg-muted transition-colors",
                              b === baseBranch && "text-foreground font-medium"
                            )}
                          >
                            <span className="truncate flex-1">{b}</span>
                            {b === baseBranch && <Check className="w-3.5 h-3.5 shrink-0" />}
                          </button>
                        ))}
                      </div>
                    </div>
                  </>
                )}
              </div>
            </>
          )}
        </span>
      )}

      <div className="ml-auto flex items-center gap-2"
           style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}>
        <button
          onClick={onToggleApproval}
          title={manualApproval ? 'Manual approval on' : 'Auto-approve on'}
          className="w-8 h-8 flex items-center justify-center border border-border rounded-lg bg-background hover:bg-muted transition-colors"
        >
          {manualApproval ? <Shield className="w-4 h-4" /> : <ShieldOff className="w-4 h-4" />}
        </button>
        <button
          onClick={onToggleTheme}
          className="w-8 h-8 flex items-center justify-center border border-border rounded-lg bg-background hover:bg-muted transition-colors"
        >
          {theme === 'light' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </button>
        {diffStats && (
          <button
            onClick={onToggleDiff}
            className="flex items-center gap-1.5 px-3 py-1.5 border border-border rounded-lg text-[13px] font-medium bg-background hover:bg-muted transition-colors font-mono"
          >
            <span className="text-diff-added-text">+{diffStats.additions}</span>
            <span className="text-diff-removed-text">-{diffStats.deletions}</span>
          </button>
        )}
        <button
          disabled={openDisabled}
          className={cn(
            'flex items-center gap-1.5 px-4 py-1.5 border border-border rounded-lg text-[13px] font-medium bg-background transition-colors',
            openDisabled ? 'opacity-50 cursor-not-allowed' : 'hover:bg-muted'
          )}
        >
          <ExternalLink className="w-3.5 h-3.5" />
          Open
        </button>
        <button className="flex items-center gap-1.5 px-4 py-1.5 border border-border rounded-lg text-[13px] font-medium bg-background hover:bg-muted transition-colors">
          <GitCommit className="w-3.5 h-3.5" />
          Commit
        </button>
      </div>
    </div>
  )
}
