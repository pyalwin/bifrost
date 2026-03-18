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

  constructor(workingDir: string) {
    super()
    this.workingDir = workingDir
  }

  start(): void {
    const gitDir = join(this.workingDir, '.git')
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
    this.refresh()
  }

  forceRefresh(): void {
    if (this.debounceTimer) clearTimeout(this.debounceTimer)
    this.refresh()
  }

  private debouncedRefresh(): void {
    if (this.debounceTimer) clearTimeout(this.debounceTimer)
    this.debounceTimer = setTimeout(() => this.refresh(), 500)
  }

  private refresh(): void {
    try {
      const diffOutput = execSync('git diff HEAD', {
        cwd: this.workingDir,
        encoding: 'utf-8',
        maxBuffer: 10 * 1024 * 1024
      })
      const files = parseUnifiedDiff(diffOutput)
      this.emit('diff-update', files)

      const branch = execSync('git rev-parse --abbrev-ref HEAD', {
        cwd: this.workingDir,
        encoding: 'utf-8'
      }).trim()
      if (branch !== this.lastBranch) {
        this.lastBranch = branch
        this.emit('branch-change', branch)
      }
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
