import { app, BrowserWindow, dialog, ipcMain, shell } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import Store from 'electron-store'
import { WsBridge } from './ws-bridge'
import { SessionManager } from './session-manager'
import { GitWatcher } from './git-watcher'

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
    mainWindow?.webContents.send('claude:diff-update', diffs)
  })

  gitWatcher.on('branch-change', (branch) => {
    mainWindow?.webContents.send('claude:branch-change', branch)
  })

  gitWatcher.start()
}

function registerIpcHandlers(): void {
  ipcMain.handle('claude:start-session', async (_event, workingDir: string) => {
    setupGitWatcher(workingDir)
    await sessionManager.startSession(workingDir)

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
    }
  })

  ipcMain.handle(
    'claude:resume-session',
    async (_event, sessionId: string, workingDir: string) => {
      setupGitWatcher(workingDir)
      await sessionManager.resumeSession(sessionId, workingDir)

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
    }
  )

  ipcMain.handle('claude:send-message', async (_event, text: string) => {
    sessionManager.sendMessage(text)
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
    const sessions = (store.get('sessions', []) as Array<{
      id: string
      workingDir: string
      timestamp: number
    }>)
    // Return sorted newest-first
    return sessions.sort((a, b) => b.timestamp - a.timestamp)
  })

  ipcMain.handle('claude:select-directory', async () => {
    if (!mainWindow) return null
    const result = await dialog.showOpenDialog(mainWindow, {
      properties: ['openDirectory']
    })
    if (result.canceled || result.filePaths.length === 0) return null
    return result.filePaths[0]
  })
}

function forwardSessionEvents(): void {
  sessionManager.on('cli-event', (event: Record<string, unknown>) => {
    mainWindow?.webContents.send('claude:message', event)

    // If it's a tool_use summary for an edit tool, refresh git diffs
    if (
      event.type === 'tool_use_summary' &&
      typeof event.tool === 'string' &&
      EDIT_TOOLS.has(event.tool)
    ) {
      gitWatcher?.forceRefresh()
    }
  })

  sessionManager.on('state-change', (state: string) => {
    mainWindow?.webContents.send('claude:state-change', state)
  })

  sessionManager.on('cli-error', (error: string) => {
    mainWindow?.webContents.send('claude:message', { type: 'error', error })
  })
}

async function cleanup(): Promise<void> {
  if (gitWatcher) {
    gitWatcher.stop()
    gitWatcher = null
  }
  await bridge.stop()
  // SessionManager's cancelTurn kills the CLI process
  await sessionManager.cancelTurn()
}

app.whenReady().then(async () => {
  electronApp.setAppUserModelId('com.electron')

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
