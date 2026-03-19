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
  onBranchChange?: () => void
  pullRequest?: { number: number; title: string; url: string; isDraft: boolean; state: string } | null
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
  onBranchChange,
  pullRequest,
}: TitleBarProps) {
  // Extract project name from path (last directory component)
  const projectName = projectPath ? projectPath.split('/').filter(Boolean).pop() ?? '' : ''

  const [showBranchPicker, setShowBranchPicker] = useState(false)
  const [showOpenMenu, setShowOpenMenu] = useState(false)
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
        {pullRequest && (
          <div
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 border rounded-lg text-[11px] font-semibold",
              pullRequest.isDraft
                ? "border-border text-muted-foreground"
                : "border-green-600/50 text-green-500"
            )}
            title={pullRequest.title}
          >
            <svg width="13" height="13" viewBox="0 0 16 16" fill="currentColor"><path d="M1.5 3.25a2.25 2.25 0 013 2.122v5.256a2.251 2.251 0 11-1.5 0V5.372A2.25 2.25 0 011.5 3.25zm5.677-.177L9.573.677A.25.25 0 0110 .854V2.5h1A2.5 2.5 0 0113.5 5v5.628a2.251 2.251 0 11-1.5 0V5a1 1 0 00-1-1h-1v1.646a.25.25 0 01-.427.177L7.177 3.427a.25.25 0 010-.354z"/></svg>
            PR #{pullRequest.number}
            <span className={cn(
              "px-1.5 rounded text-[10px]",
              pullRequest.isDraft ? "bg-muted" : "bg-green-500/15"
            )}>
              {pullRequest.isDraft ? 'Draft' : 'Open'}
            </span>
          </div>
        )}
        <div className="relative">
          <button
            disabled={openDisabled}
            onClick={() => setShowOpenMenu(v => !v)}
            className={cn(
              'flex items-center gap-1.5 px-4 py-1.5 border border-border rounded-lg text-[13px] font-medium bg-background transition-colors',
              openDisabled ? 'opacity-50 cursor-not-allowed' : 'hover:bg-muted'
            )}
          >
            <ExternalLink className="w-3.5 h-3.5" />
            Open
            <ChevronDown className="w-3 h-3 text-muted-foreground/50" />
          </button>
          {showOpenMenu && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setShowOpenMenu(false)} />
              <div className="absolute top-full right-0 mt-1.5 w-36 bg-background border border-border rounded-lg shadow-lg z-50 animate-fade-in-up overflow-hidden py-0.5">
                <button
                  onClick={() => { window.claude?.openInIDE('vscode'); setShowOpenMenu(false) }}
                  className="w-full text-left px-2.5 py-1.5 text-[12px] hover:bg-muted transition-colors flex items-center gap-2"
                >
                  <svg width="14" height="14" viewBox="0 0 100 100" fill="none">
                    <mask id="a" maskUnits="userSpaceOnUse" x="0" y="0" width="100" height="100"><path d="M70.9 97.8l25-12.3c2.5-1.2 4.1-3.7 4.1-6.5V21c0-2.8-1.6-5.3-4.1-6.5l-25-12.3c-3-1.5-6.5-.8-8.8 1.5L29.3 34.2 12.2 21.4c-2-1.5-4.7-1.3-6.5.4L1 26.3c-2 2-2 5.2 0 7.2L16 50 1 66.5c-2 2-2 5.2 0 7.2l4.7 4.5c1.8 1.7 4.5 1.9 6.5.4l17.1-12.8 32.8 30.5c1.5 1.5 3.4 2.2 5.3 2.2.6 0 1.2-.1 1.8-.2z" fill="#fff"/></mask>
                    <g mask="url(#a)"><path d="M96.9 14.5L71 2.2c-3-1.5-6.5-.8-8.8 1.5l-56 52.1c-2 1.8-2 5 .1 6.9l4.5 4.1c1.8 1.6 4.5 1.6 6.3 0L95 1.8c3.5-3 8.8-.5 8.8 4.2v-.6c0-2.7-1.5-5.2-4-6.4z" fill="#0065A9"/><path d="M96.9 85.5L71 97.8c-3 1.5-6.5.8-8.8-1.5l-56-52.1c-2-1.8-2-5 .1-6.9l4.5-4.1c1.8-1.6 4.5-1.6 6.3 0l78 65c3.5 3 8.8.5 8.8-4.2v.6c0 2.7-1.5 5.2-4 6.4z" fill="#007ACC"/><path d="M70.9 97.8c-3 1.5-6.5.8-8.8-1.5 2.8 2.8 7.7.8 7.7-3.1V6.8c0-3.9-4.9-5.9-7.7-3.1 2.3-2.3 5.8-3 8.8-1.5l25 12.3c2.5 1.2 4.1 3.7 4.1 6.5v58c0 2.8-1.6 5.3-4.1 6.5l-25 12.3z" fill="#1F9CF0"/></g>
                  </svg>
                  VS Code
                </button>
                <button
                  onClick={() => { window.claude?.openInIDE('cursor'); setShowOpenMenu(false) }}
                  className="w-full text-left px-2.5 py-1.5 text-[12px] hover:bg-muted transition-colors flex items-center gap-2"
                >
                  <svg width="14" height="14" viewBox="0 0 410 410" fill="none">
                    <path d="M0 205C0 91.8 91.8 0 205 0s205 91.8 205 205-91.8 205-205 205S0 318.2 0 205z" fill="currentColor" fillOpacity="0.15"/>
                    <path d="M168 100l142 105-142 105V100z" fill="currentColor" opacity="0.8"/>
                    <path d="M100 205h210" stroke="currentColor" strokeWidth="24" strokeLinecap="round"/>
                  </svg>
                  Cursor
                </button>
                <button
                  onClick={() => { window.claude?.openInIDE('pycharm'); setShowOpenMenu(false) }}
                  className="w-full text-left px-2.5 py-1.5 text-[12px] hover:bg-muted transition-colors flex items-center gap-2"
                >
                  <svg width="14" height="14" viewBox="0 0 128 128">
                    <rect width="128" height="128" rx="16" fill="#21D789"/>
                    <path d="M18 18h34v7H18zm0 76h50v7H18z" fill="#000"/>
                    <path d="M24 36h14v36H24zm20-8h14v44H44z" fill="#000" opacity="0.85"/>
                    <path d="M68 28c16 0 26 8 26 22s-10 22-26 22" stroke="#000" strokeWidth="8" fill="none" strokeLinecap="round"/>
                  </svg>
                  PyCharm
                </button>
              </div>
            </>
          )}
        </div>
        <button className="flex items-center gap-1.5 px-4 py-1.5 border border-border rounded-lg text-[13px] font-medium bg-background hover:bg-muted transition-colors">
          <GitCommit className="w-3.5 h-3.5" />
          Commit
        </button>
      </div>
    </div>
  )
}
