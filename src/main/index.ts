import { app, BrowserWindow, dialog, ipcMain, shell } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import Store from 'electron-store'
import { WsBridge } from './ws-bridge'
import { SessionManager } from './session-manager'
import { GitWatcher } from './git-watcher'
import { discoverSessions, discoverAllSessions, discoverProjects, discoverSessionsGrouped } from './session-discovery'
import { loadSessionHistory } from './session-history'

const store = new Store()
const bridge = new WsBridge()
const sessionManager = new SessionManager(bridge)

let mainWindow: BrowserWindow | null = null
let gitWatcher: GitWatcher | null = null

// Edit-related tool names that should trigger a git refresh
const EDIT_TOOLS = new Set(['Edit', 'Write', 'NotebookEdit', 'Bash'])

function createWindow(): void {
  const bounds = store.get('windowBounds', { width: 1400, height: 900 }) as {
    width: number
    height: number
    x?: number
    y?: number
  }

  mainWindow = new BrowserWindow({
    ...bounds,
    minWidth: 1000,
    minHeight: 600,
    titleBarStyle: 'hiddenInset',
    trafficLightPosition: { x: 16, y: 14 },
    show: false,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow!.show()
  })

  mainWindow.on('close', () => {
    store.set('windowBounds', mainWindow!.getBounds())
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  // HMR for renderer based on electron-vite cli.
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

function setupGitWatcher(workingDir: string): void {
  if (gitWatcher) {
    gitWatcher.stop()
    gitWatcher.removeAllListeners()
  }

  gitWatcher = new GitWatcher(workingDir)

  gitWatcher.on('diff-update', (diffs) => {
    console.log(`[Main] Sending ${(diffs as any[]).length} diffs to renderer`)
    safeSend('claude:diff-update', diffs)
  })

  gitWatcher.on('branch-change', (branch) => {
    console.log(`[Main] Branch changed to: ${branch}`)
    safeSend('claude:branch-change', branch)
  })

  gitWatcher.start()

  // Restore persisted base branch for this working directory
  const baseBranches = (store.get('baseBranches', {}) as Record<string, string>)
  const savedBase = baseBranches[workingDir]
  if (savedBase) {
    gitWatcher.setBaseBranch(savedBase)
  }
}

function registerIpcHandlers(): void {
  ipcMain.handle('claude:start-session', async (_event, workingDir: string, model?: string) => {
    setupGitWatcher(workingDir)
    await sessionManager.startSession(workingDir, model)

    const sessionId = sessionManager.sessionId
    const timestamp = Date.now()
    store.set('lastSession', { workingDir, sessionId, timestamp })

    // Persist to the sessions list so Resume Session can find it
    if (sessionId) {
      const sessions = (store.get('sessions', []) as Array<{
        id: string
        workingDir: string
        timestamp: number
      }>)
      // Update existing or push new
      const idx = sessions.findIndex((s) => s.id === sessionId)
      const entry = { id: sessionId, workingDir, timestamp }
      if (idx >= 0) {
        sessions[idx] = entry
      } else {
        sessions.unshift(entry)
      }
      // Keep only the 20 most recent
      store.set('sessions', sessions.slice(0, 20))

      // Store branch association
      try {
        const branch = require('child_process').execSync('git rev-parse --abbrev-ref HEAD', {
          cwd: workingDir, encoding: 'utf-8'
        }).trim()
        const sessionBranches = (store.get('sessionBranches', {}) as Record<string, string>)
        sessionBranches[sessionId] = branch
        store.set('sessionBranches', sessionBranches)
      } catch { /* not a git repo */ }
    }
  })

  ipcMain.handle(
    'claude:resume-session',
    async (_event, sessionId: string, workingDir: string, model?: string) => {
      // Load and send history BEFORE connecting so UI has context immediately
      const history = loadSessionHistory(sessionId, workingDir)
      if (history.length > 0) {
        safeSend('claude:history', history)
      }

      setupGitWatcher(workingDir)
      await sessionManager.resumeSession(sessionId, workingDir, model)

      const timestamp = Date.now()
      store.set('lastSession', { workingDir, sessionId, timestamp })

      // Update timestamp in the sessions list
      const sessions = (store.get('sessions', []) as Array<{
        id: string
        workingDir: string
        timestamp: number
      }>)
      const idx = sessions.findIndex((s) => s.id === sessionId)
      const entry = { id: sessionId, workingDir, timestamp }
      if (idx >= 0) {
        sessions[idx] = entry
      } else {
        sessions.unshift(entry)
      }
      store.set('sessions', sessions.slice(0, 20))

      // Store branch association
      try {
        const branch = require('child_process').execSync('git rev-parse --abbrev-ref HEAD', {
          cwd: workingDir, encoding: 'utf-8'
        }).trim()
        const sessionBranches = (store.get('sessionBranches', {}) as Record<string, string>)
        sessionBranches[sessionId] = branch
        store.set('sessionBranches', sessionBranches)
      } catch { /* not a git repo */ }
    }
  )

  ipcMain.handle('claude:send-message', async (_event, text: string, images?: Array<{ base64: string; mediaType: string }>) => {
    await sessionManager.sendMessage(text, images)
  })

  ipcMain.handle(
    'claude:control-response',
    async (_event, requestId: string, approved: boolean) => {
      sessionManager.sendControlResponse(requestId, approved)
    }
  )

  ipcMain.handle('claude:cancel-turn', async () => {
    await sessionManager.cancelTurn()
  })

  ipcMain.handle('claude:list-sessions', async () => {
    return discoverAllSessions()
  })

  ipcMain.handle('claude:list-sessions-for-dir', async (_event, workingDir: string) => {
    return discoverSessions(workingDir)
  })

  ipcMain.handle('claude:list-projects', async () => {
    return discoverProjects()
  })

  ipcMain.handle('claude:list-sessions-grouped', async () => {
    const sessionBranches = (store.get('sessionBranches', {}) as Record<string, string>)
    const baseBranches = (store.get('baseBranches', {}) as Record<string, string>)
    return discoverSessionsGrouped(sessionBranches, baseBranches)
  })

  ipcMain.handle('claude:select-directory', async () => {
    if (!mainWindow) return null
    const result = await dialog.showOpenDialog(mainWindow, {
      properties: ['openDirectory']
    })
    if (result.canceled || result.filePaths.length === 0) return null
    return result.filePaths[0]
  })

  ipcMain.handle('claude:select-images', async () => {
    if (!mainWindow) return []
    const result = await dialog.showOpenDialog(mainWindow, {
      properties: ['openFile', 'multiSelections'],
      filters: [{ name: 'Images', extensions: ['png', 'jpg', 'jpeg', 'gif', 'webp'] }],
    })
    if (result.canceled || result.filePaths.length === 0) return []

    const { readFileSync } = await import('fs')
    const { extname, basename } = await import('path')

    const mimeTypes: Record<string, string> = {
      '.png': 'image/png',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.gif': 'image/gif',
      '.webp': 'image/webp',
    }

    return result.filePaths.map(fp => ({
      base64: readFileSync(fp).toString('base64'),
      mediaType: mimeTypes[extname(fp).toLowerCase()] ?? 'image/png',
      name: basename(fp),
    }))
  })

  ipcMain.handle('claude:archive-item', async (_event, type: 'project' | 'session', id: string) => {
    const key = type === 'project' ? 'archivedProjects' : 'archivedSessions'
    const archived = (store.get(key, []) as string[])
    if (!archived.includes(id)) {
      store.set(key, [...archived, id])
    }
  })

  ipcMain.handle('claude:unarchive-item', async (_event, type: 'project' | 'session', id: string) => {
    if (type === 'project') {
      // Unarchive the project
      const archivedProjects = (store.get('archivedProjects', []) as string[])
      store.set('archivedProjects', archivedProjects.filter((p) => p !== id))
      // Also unarchive any individually archived sessions within this project
      const allSessions = await discoverSessions(id)
      const sessionIds = new Set(allSessions.map((s) => s.id))
      const archivedSessions = (store.get('archivedSessions', []) as string[])
      store.set('archivedSessions', archivedSessions.filter((s) => !sessionIds.has(s)))
    } else {
      const archivedSessions = (store.get('archivedSessions', []) as string[])
      store.set('archivedSessions', archivedSessions.filter((s) => s !== id))
    }
  })

  ipcMain.handle('claude:get-archived', async () => {
    return {
      projects: store.get('archivedProjects', []) as string[],
      sessions: store.get('archivedSessions', []) as string[],
    }
  })

  ipcMain.handle('claude:get-git-user', async () => {
    const workingDir = sessionManager.workingDir
    if (!workingDir) return { name: 'You', initial: 'Y' }
    try {
      const { execSync } = await import('child_process')
      const name = execSync('git config user.name', { cwd: workingDir, encoding: 'utf-8' }).trim()
      return { name: name || 'You', initial: (name?.[0] ?? 'Y').toUpperCase() }
    } catch {
      return { name: 'You', initial: 'Y' }
    }
  })

  ipcMain.handle('claude:list-branches', async () => {
    const workingDir = sessionManager.workingDir
    if (!workingDir) return []
    try {
      const { execSync } = await import('child_process')
      const output = execSync('git branch --format="%(refname:short)"', {
        cwd: workingDir,
        encoding: 'utf-8',
        maxBuffer: 10 * 1024 * 1024,
      }).trim()
      return output ? output.split('\n') : []
    } catch {
      return []
    }
  })

  ipcMain.handle('claude:checkout-branch', async (_event, branchName: string, createNew: boolean) => {
    const workingDir = sessionManager.workingDir
    if (!workingDir) return { success: false, error: 'No working directory' }
    try {
      const { execSync } = await import('child_process')
      const cmd = createNew ? `git checkout -b ${branchName}` : `git checkout ${branchName}`
      execSync(cmd, { cwd: workingDir, encoding: 'utf-8' })
      return { success: true }
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : String(err) }
    }
  })

  ipcMain.handle('claude:set-base-branch', async (_event, branch: string | null) => {
    if (gitWatcher) {
      gitWatcher.setBaseBranch(branch)
    }
    // Persist per working directory
    const workingDir = sessionManager.workingDir
    if (workingDir) {
      const baseBranches = (store.get('baseBranches', {}) as Record<string, string>)
      if (branch) {
        baseBranches[workingDir] = branch
      } else {
        delete baseBranches[workingDir]
      }
      store.set('baseBranches', baseBranches)
    }
  })

  ipcMain.handle('claude:get-base-branch', async () => {
    const workingDir = sessionManager.workingDir
    if (!workingDir) return null
    const baseBranches = (store.get('baseBranches', {}) as Record<string, string>)
    return baseBranches[workingDir] ?? null
  })

  ipcMain.handle('claude:get-local-diffs', async () => {
    const workingDir = sessionManager.workingDir
    if (!workingDir) return []
    try {
      const { execSync } = await import('child_process')
      const { parseUnifiedDiff } = await import('./diff-parser')
      const unstaged = execSync('git diff', { cwd: workingDir, encoding: 'utf-8', maxBuffer: 10 * 1024 * 1024 }).trim()
      const staged = execSync('git diff --cached', { cwd: workingDir, encoding: 'utf-8', maxBuffer: 10 * 1024 * 1024 }).trim()
      const combined = (unstaged + '\n' + staged).trim()
      return parseUnifiedDiff(combined)
    } catch {
      return []
    }
  })

  ipcMain.handle('claude:get-staged-files', async () => {
    const workingDir = sessionManager.workingDir
    if (!workingDir) return { staged: [], unstaged: [] }
    try {
      const { execSync } = await import('child_process')
      const status = execSync('git status --porcelain', { cwd: workingDir, encoding: 'utf-8' }).trim()
      if (!status) return { staged: [], unstaged: [] }
      const staged: string[] = []
      const unstaged: string[] = []
      for (const line of status.split('\n')) {
        const x = line[0]  // staged status
        const y = line[1]  // unstaged status
        const file = line.slice(3)
        if (x !== ' ' && x !== '?') staged.push(file)
        if (y !== ' ' || x === '?') unstaged.push(file)
      }
      return { staged, unstaged }
    } catch {
      return { staged: [], unstaged: [] }
    }
  })

  ipcMain.handle('claude:generate-commit-message', async () => {
    const workingDir = sessionManager.workingDir
    if (!workingDir) return ''
    try {
      const { execSync } = await import('child_process')
      // Get a compact diff summary
      const diffStat = execSync('git diff --stat HEAD', { cwd: workingDir, encoding: 'utf-8', maxBuffer: 10 * 1024 * 1024 }).trim()
      const diffContent = execSync('git diff HEAD', { cwd: workingDir, encoding: 'utf-8', maxBuffer: 10 * 1024 * 1024 }).trim()

      // Truncate diff to ~4000 chars to keep the prompt small
      const truncatedDiff = diffContent.length > 4000
        ? diffContent.slice(0, 4000) + '\n... (truncated)'
        : diffContent

      if (!diffStat && !truncatedDiff) return ''

      // Use claude CLI in print mode for a one-shot commit message generation
      const prompt = `Generate a concise git commit message (1-2 lines, conventional commits format like "feat:", "fix:", "refactor:") for these changes. Return ONLY the commit message, nothing else.\n\nFiles changed:\n${diffStat}\n\nDiff:\n${truncatedDiff}`

      const { discoverCLI } = await import('./cli-discovery')
      const cli = discoverCLI()

      const env = { ...process.env }
      delete env.CLAUDECODE

      const result = execSync(
        `${cli.path} --print --output-format text --model haiku "${prompt.replace(/"/g, '\\"')}"`,
        { cwd: workingDir, encoding: 'utf-8', timeout: 30000, env, maxBuffer: 10 * 1024 * 1024 }
      ).trim()

      // Clean up — remove quotes, backticks, or extra formatting
      return result.replace(/^["'`]+|["'`]+$/g, '').trim()
    } catch {
      return ''
    }
  })

  ipcMain.handle('claude:stage-all', async () => {
    const workingDir = sessionManager.workingDir
    if (!workingDir) return
    try {
      const { execSync } = await import('child_process')
      execSync('git add -A', { cwd: workingDir, encoding: 'utf-8' })
    } catch { /* ignore */ }
  })

  ipcMain.handle('claude:git-commit', async (_event, message: string) => {
    const workingDir = sessionManager.workingDir
    if (!workingDir) return { success: false, error: 'No working directory' }
    try {
      const { execSync } = await import('child_process')
      const safeMsg = message.replace(/'/g, "'\\''")
      execSync(`git commit -m '${safeMsg}'`, { cwd: workingDir, encoding: 'utf-8' })
      return { success: true }
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : String(err) }
    }
  })

  ipcMain.handle('claude:open-external', async (_event, url: string) => {
    shell.openExternal(url)
  })

  ipcMain.handle('claude:save-reviews', async (_event, data: { reviews: unknown[]; comments: unknown[] }) => {
    const workingDir = sessionManager.workingDir
    if (!workingDir) return
    const allReviews = (store.get('reviewData', {}) as Record<string, unknown>)
    allReviews[workingDir] = data
    store.set('reviewData', allReviews)
  })

  ipcMain.handle('claude:load-reviews', async () => {
    const workingDir = sessionManager.workingDir
    if (!workingDir) return { reviews: [], comments: [] }
    const allReviews = (store.get('reviewData', {}) as Record<string, Record<string, unknown[]>>)
    return allReviews[workingDir] ?? { reviews: [], comments: [] }
  })

  ipcMain.handle('claude:get-git-status', async () => {
    const workingDir = sessionManager.workingDir
    if (!workingDir) return { hasUncommitted: false, unpushedCount: 0 }
    try {
      const { execSync } = await import('child_process')
      const status = execSync('git status --porcelain', { cwd: workingDir, encoding: 'utf-8' }).trim()
      const hasUncommitted = status.length > 0
      let unpushedCount = 0
      try {
        const unpushed = execSync('git log @{push}..HEAD --oneline', { cwd: workingDir, encoding: 'utf-8' }).trim()
        unpushedCount = unpushed ? unpushed.split('\n').length : 0
      } catch { /* no upstream */ }
      return { hasUncommitted, unpushedCount }
    } catch {
      return { hasUncommitted: false, unpushedCount: 0 }
    }
  })

  ipcMain.handle('claude:get-pull-request', async () => {
    const workingDir = sessionManager.workingDir
    if (!workingDir) return null
    try {
      const { execSync } = await import('child_process')
      const output = execSync('gh pr view --json number,title,url,state,isDraft,baseRefName,headRefName,additions,deletions,commits', {
        cwd: workingDir,
        encoding: 'utf-8',
        timeout: 10000,
      }).trim()
      const data = JSON.parse(output)
      return {
        number: data.number,
        title: data.title,
        url: data.url,
        state: data.state,
        isDraft: data.isDraft,
        baseBranch: data.baseRefName,
        headBranch: data.headRefName,
        additions: data.additions,
        deletions: data.deletions,
        commits: Array.isArray(data.commits) ? data.commits.length : (data.commits ?? 0),
      }
    } catch {
      return null
    }
  })

  ipcMain.handle('claude:get-pr-prefill', async () => {
    const workingDir = sessionManager.workingDir
    if (!workingDir) return { title: '', body: '' }
    try {
      const { execSync } = await import('child_process')
      const { readFileSync, existsSync } = await import('fs')
      const { join: joinPath } = await import('path')

      // Get branch name for title
      const branch = execSync('git rev-parse --abbrev-ref HEAD', {
        cwd: workingDir, encoding: 'utf-8',
      }).trim()

      // Generate title from branch name
      const title = branch
        .replace(/^(feat|fix|chore|docs|refactor|test|style|perf|ci|build)\//i, '')
        .replace(/[-_/]/g, ' ')
        .replace(/^\w/, (c: string) => c.toUpperCase())

      // Get base branch
      const baseBranches = (store.get('baseBranches', {}) as Record<string, string>)
      let baseBranch = baseBranches[workingDir] ?? 'main'
      try {
        execSync(`git rev-parse --verify ${baseBranch}`, { cwd: workingDir, encoding: 'utf-8' })
      } catch {
        baseBranch = 'main'
      }

      // Get commit messages for body
      let commits = ''
      try {
        commits = execSync(`git log ${baseBranch}..HEAD --format="- %s" --reverse`, {
          cwd: workingDir, encoding: 'utf-8', maxBuffer: 10 * 1024 * 1024,
        }).trim()
      } catch { /* no commits or base not found */ }

      // Check for PR template
      const templatePaths = [
        '.github/PULL_REQUEST_TEMPLATE.md',
        '.github/pull_request_template.md',
        'PULL_REQUEST_TEMPLATE.md',
        'pull_request_template.md',
        '.github/PULL_REQUEST_TEMPLATE/default.md',
      ]

      let template = ''
      for (const tp of templatePaths) {
        const fullPath = joinPath(workingDir, tp)
        if (existsSync(fullPath)) {
          template = readFileSync(fullPath, 'utf-8')
          break
        }
      }

      // Build body
      let body = ''
      if (template) {
        body = template
        // If template has a placeholder-like section, append commits
        if (commits) {
          body += '\n\n## Commits\n\n' + commits
        }
      } else {
        // Generate a simple body from commits
        if (commits) {
          body = '## Changes\n\n' + commits
        }
      }

      return { title, body }
    } catch {
      return { title: '', body: '' }
    }
  })

  ipcMain.handle('claude:load-plan-file', async (_event, filePath: string) => {
    try {
      const { readFileSync, existsSync } = await import('fs')
      const { join: joinPath, isAbsolute } = await import('path')

      // Resolve relative paths against the working directory
      let resolved = filePath
      if (!isAbsolute(filePath) && sessionManager.workingDir) {
        resolved = joinPath(sessionManager.workingDir, filePath)
      }

      if (!existsSync(resolved)) return null
      return readFileSync(resolved, 'utf-8')
    } catch {
      return null
    }
  })

  ipcMain.handle('claude:list-commits', async () => {
    const workingDir = sessionManager.workingDir
    if (!workingDir) return []
    try {
      const { execSync } = await import('child_process')

      // Get current branch
      const currentBranch = execSync('git rev-parse --abbrev-ref HEAD', {
        cwd: workingDir, encoding: 'utf-8',
      }).trim()

      // Get base branch
      const baseBranches = (store.get('baseBranches', {}) as Record<string, string>)
      let base = baseBranches[workingDir] ?? null

      // Auto-detect base if not set
      if (!base) {
        for (const candidate of ['main', 'master']) {
          try {
            execSync(`git rev-parse --verify ${candidate}`, { cwd: workingDir, encoding: 'utf-8' })
            base = candidate
            break
          } catch { /* not found */ }
        }
      }

      // If on the base branch or no base found, show recent commits instead
      let gitLogCmd: string
      if (!base || currentBranch === base) {
        gitLogCmd = `git log -30 --format="%H%n%s%n%an%n%ar"`
      } else {
        gitLogCmd = `git log ${base}..HEAD --format="%H%n%s%n%an%n%ar" --reverse`
      }

      const output = execSync(gitLogCmd, {
        cwd: workingDir, encoding: 'utf-8', maxBuffer: 10 * 1024 * 1024,
      }).trim()
      if (!output) return []

      // Get remote URL for commit links
      let repoUrl = ''
      try {
        const remote = execSync('git remote get-url origin', { cwd: workingDir, encoding: 'utf-8' }).trim()
        repoUrl = remote
          .replace(/\.git$/, '')
          .replace(/^git@github\.com:/, 'https://github.com/')
          .replace(/^ssh:\/\/git@github\.com\//, 'https://github.com/')
      } catch { /* no remote */ }

      const lines = output.split('\n')
      const commits: Array<{ sha: string; fullSha: string; message: string; author: string; timeAgo: string; url: string }> = []
      for (let i = 0; i < lines.length; i += 4) {
        if (i + 3 < lines.length) {
          const fullSha = lines[i]
          commits.push({
            sha: fullSha.slice(0, 7),
            fullSha,
            message: lines[i + 1],
            author: lines[i + 2],
            timeAgo: lines[i + 3],
            url: repoUrl ? `${repoUrl}/commit/${fullSha}` : '',
          })
        }
      }
      return commits.reverse()  // newest first
    } catch {
      return []
    }
  })

  ipcMain.handle('claude:open-in-ide', async (_event, ide: 'vscode' | 'cursor' | 'pycharm') => {
    const workingDir = sessionManager.workingDir
    if (!workingDir) return
    try {
      const { exec } = await import('child_process')
      const commands: Record<string, string> = {
        vscode: `code "${workingDir}"`,
        cursor: `cursor "${workingDir}" || open -a "Cursor" "${workingDir}"`,
        pycharm: `pycharm "${workingDir}" || open -a "PyCharm" "${workingDir}"`,
      }
      exec(commands[ide] ?? '')
    } catch { /* ignore */ }
  })

  ipcMain.handle('claude:create-pull-request', async (_event, title: string, body: string, baseBranch?: string) => {
    const workingDir = sessionManager.workingDir
    if (!workingDir) return { success: false, error: 'No working directory' }
    try {
      const { execSync } = await import('child_process')
      const safeTitle = title.replace(/'/g, "'\\''")
      const safeBody = body.replace(/'/g, "'\\''")
      let cmd = `gh pr create --title '${safeTitle}' --body '${safeBody}'`
      if (baseBranch) cmd += ` --base '${baseBranch.replace(/'/g, "'\\''")}'`
      execSync(cmd, { cwd: workingDir, encoding: 'utf-8', timeout: 30000 })

      const prOutput = execSync('gh pr view --json number,title,url,state,isDraft,baseRefName,headRefName,additions,deletions,commits', {
        cwd: workingDir,
        encoding: 'utf-8',
        timeout: 10000,
      }).trim()
      const data = JSON.parse(prOutput)
      return {
        success: true,
        pr: {
          number: data.number,
          title: data.title,
          url: data.url,
          state: data.state,
          isDraft: data.isDraft,
          baseBranch: data.baseRefName,
          headBranch: data.headRefName,
          additions: data.additions,
          deletions: data.deletions,
          commits: Array.isArray(data.commits) ? data.commits.length : (data.commits ?? 0),
        }
      }
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : String(err) }
    }
  })
}

function safeSend(channel: string, ...args: unknown[]): void {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send(channel, ...args)
  }
}

function forwardSessionEvents(): void {
  sessionManager.on('cli-event', (event: Record<string, unknown>) => {
    safeSend('claude:message', event)

    // Refresh diffs after edit tools or when a turn completes
    if (event.type === 'tool_use_summary') {
      const toolName = (event.tool_name ?? event.tool ?? '') as string
      console.log(`[Main] tool_use_summary: ${toolName}`)
      if (EDIT_TOOLS.has(toolName)) {
        console.log('[Main] Edit tool detected, forcing git refresh')
        gitWatcher?.forceRefresh()
      }
    }

    // Always refresh diffs when a turn completes — catches any file changes
    if (event.type === 'result') {
      console.log('[Main] Turn complete, refreshing diffs')
      setTimeout(() => gitWatcher?.forceRefresh(), 500)
    }
  })

  sessionManager.on('state-change', (state: string) => {
    safeSend('claude:state-change', state)
  })

  sessionManager.on('cli-error', (error: string) => {
    safeSend('claude:message', { type: 'error', error })
  })
}

async function cleanup(): Promise<void> {
  if (gitWatcher) {
    gitWatcher.stop()
    gitWatcher = null
  }
  await sessionManager.destroy()
  await bridge.stop()
}

// Prevent EPIPE and unhandled rejection crashes
process.on('uncaughtException', (err) => {
  if (err.message.includes('EPIPE') || err.message.includes('write after end')) return
  console.error('[Main] Uncaught exception:', err)
})
process.on('unhandledRejection', (reason) => {
  console.error('[Main] Unhandled rejection:', reason)
})

// Set dock name on macOS (works in dev mode too)
if (process.platform === 'darwin') {
  app.setName('Bifrost')
}

app.whenReady().then(async () => {
  electronApp.setAppUserModelId('com.bifrost.app')

  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  // Start the WS bridge before creating the window
  await bridge.start()
  console.log(`[Main] WsBridge started on port ${bridge.port}`)

  registerIpcHandlers()
  forwardSessionEvents()
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('before-quit', () => {
  cleanup().catch((err) => console.error('[Main] Cleanup error:', err))
})
