import { watch } from 'chokidar'
import { execSync } from 'child_process'
import { EventEmitter } from 'events'
import { join } from 'path'
import { existsSync } from 'fs'
import { parseUnifiedDiff } from './diff-parser'

export class GitWatcher extends EventEmitter {
  private watcher: ReturnType<typeof watch> | null = null
  private workingDir: string
  private debounceTimer: NodeJS.Timeout | null = null
  private lastBranch: string = ''
  private baseBranchOverride: string | null = null

  constructor(workingDir: string) {
    super()
    this.workingDir = workingDir
  }

  start(): void {
    const gitDir = join(this.workingDir, '.git')
    console.log(`[GitWatcher] Starting for: ${this.workingDir}`)
    if (!existsSync(gitDir)) {
      console.warn('[GitWatcher] Not a git repository:', this.workingDir)
      return
    }

    // Only watch .git/index (staging changes) and .git/HEAD (branch switches)
    // NOT the entire working directory — that causes EMFILE on large repos
    // File-level changes are caught via forceRefresh() after tool_use_summary events
    this.watcher = watch([join(gitDir, 'index'), join(gitDir, 'HEAD')], {
      ignoreInitial: true,
      awaitWriteFinish: { stabilityThreshold: 200 }
    })

    this.watcher.on('all', () => this.debouncedRefresh())

    // Delay initial refresh to ensure renderer IPC listeners are subscribed
    setTimeout(() => this.refresh(), 1000)
  }

  setBaseBranch(branch: string | null): void {
    this.baseBranchOverride = branch
    this.forceRefresh()
  }

  forceRefresh(): void {
    console.log('[GitWatcher] Force refresh triggered')
    if (this.debounceTimer) clearTimeout(this.debounceTimer)
    this.refresh()
  }

  private debouncedRefresh(): void {
    if (this.debounceTimer) clearTimeout(this.debounceTimer)
    this.debounceTimer = setTimeout(() => this.refresh(), 500)
  }

  private execGit(cmd: string): string {
    return execSync(cmd, {
      cwd: this.workingDir,
      encoding: 'utf-8',
      maxBuffer: 10 * 1024 * 1024,
    }).trim()
  }

  private findBaseBranch(): string | null {
    if (this.baseBranchOverride) return this.baseBranchOverride
    // Check if main or master exists as a local branch
    for (const candidate of ['main', 'master']) {
      try {
        this.execGit(`git rev-parse --verify ${candidate}`)
        return candidate
      } catch {
        // Branch doesn't exist
      }
    }
    return null
  }

  private refresh(): void {
    try {
      const branch = this.execGit('git rev-parse --abbrev-ref HEAD')
      if (branch !== this.lastBranch) {
        this.lastBranch = branch
        this.emit('branch-change', branch)
      }

      const baseBranch = this.findBaseBranch()
      const isOnBaseBranch = !baseBranch || branch === baseBranch

      let combinedDiff: string
      if (isOnBaseBranch) {
        // On main/master — show uncommitted changes only
        const unstaged = this.execGit('git diff')
        const staged = this.execGit('git diff --cached')
        combinedDiff = (unstaged + '\n' + staged).trim()
      } else {
        // On feature branch — show all changes since diverging from base
        // Single diff from merge-base to working tree captures committed + staged + unstaged
        const mergeBase = this.execGit(`git merge-base ${baseBranch} HEAD`)
        combinedDiff = this.execGit(`git diff ${mergeBase}`)
      }

      const files = parseUnifiedDiff(combinedDiff)
      console.log(`[GitWatcher] Refresh: ${files.length} changed files (base: ${isOnBaseBranch ? 'self' : baseBranch})`)
      this.emit('diff-update', files)
    } catch {
      this.emit('diff-update', [])
    }
  }

  stop(): void {
    if (this.debounceTimer) clearTimeout(this.debounceTimer)
    if (this.watcher) {
      this.watcher.close()
      this.watcher = null
    }
  }
}
