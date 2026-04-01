import { spawn, ChildProcess } from 'child_process'
import { EventEmitter } from 'events'
import { randomUUID } from 'crypto'
import { WsBridge } from './ws-bridge'
import { discoverCLI } from './cli-discovery'

export type SessionState = 'idle' | 'connecting' | 'active' | 'disconnected'

export class SessionManager extends EventEmitter {
  private bridge: WsBridge
  private process: ChildProcess | null = null
  private _state: SessionState = 'idle'
  private _sessionId: string | null = null
  private _workingDir: string | null = null
  private reconnectAttempts = 0
  private maxReconnectAttempts = 3
  private _expectingDisconnect = false
  private _model: string | undefined = undefined
  private suppressedDisconnects = 0
  private intentionallyStoppedProcesses = new WeakSet<ChildProcess>()
  public manualApproval = false

  constructor(bridge: WsBridge) {
    super()
    this.bridge = bridge

    bridge.on('connected', () => {
      this.setState('active')
      this.reconnectAttempts = 0
    })

    bridge.on('disconnected', () => {
      if (this.suppressedDisconnects > 0) {
        this.suppressedDisconnects--
        console.log('[SessionManager] Ignoring intentional disconnect')
        this.process = null
        return
      }
      if (this._expectingDisconnect) {
        // Normal disconnect after --print mode turn completion.
        // Stay "active" and re-spawn for next turn silently.
        this._expectingDisconnect = false
        console.log('[SessionManager] Turn complete, ready for next message')
        this.process = null
        // Don't change state — stay active so user can send next message
        return
      }
      if (this._state === 'active') {
        this.setState('disconnected')
        this.attemptReconnect()
      }
    })

    bridge.on('cli-event', (event: Record<string, unknown>) => {
      if (event.type === 'result' && event.session_id) {
        this._sessionId = event.session_id as string
        // In --print mode, CLI exits after each turn.
        // Mark that we expect a disconnect so we re-spawn cleanly.
        this._expectingDisconnect = true
      }
      if (event.type === 'control_request' && !this.manualApproval) {
        // request_id is at TOP LEVEL, tool details are nested in event.request
        const requestId = (event as any).request_id ?? ''
        const req = (event as any).request ?? {}
        const toolInput = req.input ?? req.tool_input ?? {}

        console.log('[SessionManager] Auto-approving tool:', req.tool_name ?? req.tool, 'request_id:', requestId)

        this.bridge.sendToClient({
          type: 'control_response',
          response: {
            subtype: 'success',
            request_id: requestId,
            response: { behavior: 'allow', updatedInput: toolInput }
          }
        })
        return
      }
      this.emit('cli-event', event)
    })
  }

  get state(): SessionState {
    return this._state
  }
  get sessionId(): string | null {
    return this._sessionId
  }
  get workingDir(): string | null {
    return this._workingDir
  }

  private setState(state: SessionState): void {
    this._state = state
    this.emit('state-change', state)
  }

  async startSession(workingDir: string, model?: string): Promise<void> {
    console.log('[SessionManager] startSession', { workingDir, model })
    await this.killProcess()
    this._workingDir = workingDir
    this._sessionId = null
    this._model = model
    this.setState('connecting')
    await this.spawnCLI(workingDir, model)
  }

  async setModel(model: string): Promise<void> {
    console.log('[SessionManager] setModel', { model, currentModel: this._model })
    const oldModel = this._model
    this._model = model
    // If a process is alive (waiting for first message, or mid-turn), kill it so
    // the next sendMessage spawns a fresh CLI with the new model.
    // Don't re-spawn here — in --print mode sendMessage handles spawning.
    // Don't setState either — no "connecting" flash, input stays enabled.
    if (this.process && oldModel !== model) {
      await this.killProcess()
    }
  }

  async resumeSession(sessionId: string, workingDir: string, model?: string): Promise<void> {
    console.log('[SessionManager] resumeSession', { sessionId, workingDir, model })
    await this.killProcess()
    this._workingDir = workingDir
    this._sessionId = sessionId
    this._model = model
    this.setState('connecting')
    await this.spawnCLI(workingDir, model, sessionId)
  }

  async sendMessage(text: string, images?: Array<{ base64: string; mediaType: string }>, model?: string): Promise<void> {
    console.log('[SessionManager] sendMessage', {
      model,
      currentModel: this._model,
      state: this._state,
      sessionId: this._sessionId,
      hasProcess: !!this.process,
      textLength: text.length,
      imageCount: images?.length ?? 0,
    })
    const modelChanged = typeof model === 'string' && model !== this._model
    if (typeof model === 'string') {
      this._model = model
    }

    if (this.process && modelChanged && this._workingDir) {
      console.log('[SessionManager] Re-spawning CLI to apply updated model:', model)
      await this.killProcess()
      this.setState('connecting')
      await this.spawnCLI(this._workingDir, this._model, this._sessionId ?? undefined)
    }

    // In --print mode, the CLI exits after each turn.
    // If process is dead, re-spawn with --resume before sending.
    if (!this.process && this._workingDir) {
      console.log('[SessionManager] Re-spawning CLI for next turn')
      await this.spawnCLI(this._workingDir, this._model, this._sessionId ?? undefined)
    }

    let content: unknown = text
    if (images && images.length > 0) {
      content = [
        { type: 'text', text },
        ...images.map(img => ({
          type: 'image',
          source: { type: 'base64', media_type: img.mediaType, data: img.base64 },
        })),
      ]
    }

    this.bridge.sendToClient({
      type: 'user',
      message: { role: 'user', content },
      parent_tool_use_id: null,
      session_id: this._sessionId
    })
  }

  sendControlResponse(requestId: string, approved: boolean, toolInput?: Record<string, unknown>): void {
    if (approved) {
      this.bridge.sendToClient({
        type: 'control_response',
        response: {
          subtype: 'success',
          request_id: requestId,
          response: { behavior: 'allow', updatedInput: toolInput ?? {} }
        }
      })
    } else {
      this.bridge.sendToClient({
        type: 'control_response',
        response: {
          subtype: 'success',
          request_id: requestId,
          response: { behavior: 'deny', message: 'Denied by user' }
        }
      })
    }
  }

  async cancelTurn(): Promise<void> {
    await this.killProcess()
    if (this._sessionId && this._workingDir) {
      this.setState('connecting')
      await this.spawnCLI(this._workingDir, this._model, this._sessionId)
    } else {
      this.setState('idle')
    }
  }

  private async spawnCLI(workingDir: string, model?: string, resumeId?: string): Promise<void> {
    const cli = discoverCLI()
    const sessionKey = randomUUID()

    const args = [
      '--sdk-url',
      `ws://127.0.0.1:${this.bridge.port}/ws/cli/${sessionKey}`,
      '--print',
      '--output-format',
      'stream-json',
      '--input-format',
      'stream-json',
      '--verbose'
    ]

    if (resumeId) args.push('--resume', resumeId)
    if (model) args.push('--model', model)
    console.log('[SessionManager] spawnCLI', {
      workingDir,
      model,
      resumeId,
      args,
    })

    if (!this.manualApproval) {
      args.push(
        '--allowedTools',
        'Read',
        'Glob',
        'Grep',
        'Bash(git:*)',
        'Bash(ls:*)',
        'Bash(cat:*)'
      )
    }

    const env = { ...process.env }
    delete env.CLAUDECODE

    const child = spawn(cli.path, args, {
      cwd: workingDir,
      env,
      stdio: ['pipe', 'pipe', 'pipe']
    })
    this.process = child

    child.on('exit', (code) => {
      if (this.intentionallyStoppedProcesses.has(child)) {
        this.intentionallyStoppedProcesses.delete(child)
        console.log(`[SessionManager] Ignoring intentional CLI exit with code ${code}`)
        return
      }
      if (this.process !== child) {
        console.log(`[SessionManager] Ignoring stale CLI exit with code ${code}`)
        return
      }
      console.log(`[SessionManager] CLI exited with code ${code}`)
      if (this._state === 'connecting' && code !== 0) {
        this.emit('cli-error', `CLI exited with code ${code}`)
        this.setState('idle')
      }
    })

    child.stderr?.on('data', (data: Buffer) => {
      try {
        console.error('[SessionManager] CLI stderr:', data.toString())
      } catch {
        // Ignore EPIPE errors when logging
      }
    })

    child.on('error', (err) => {
      console.error('[SessionManager] Process error:', err.message)
    })

    // Handle broken pipe on stdin/stdout/stderr
    child.stdin?.on('error', () => {})
    child.stdout?.on('error', () => {})
    child.stderr?.on('error', () => {})

    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('CLI connection timeout (10s)'))
        this.killProcess()
      }, 10000)

      this.bridge.once('connected', () => {
        clearTimeout(timeout)
        resolve()
      })
      child.once('exit', (code) => {
        if (this.intentionallyStoppedProcesses.has(child) || this.process !== child) {
          clearTimeout(timeout)
          return
        }
        if (code !== 0) {
          clearTimeout(timeout)
          reject(new Error(`CLI exited with code ${code} during startup`))
        }
      })
    })
  }

  private async attemptReconnect(): Promise<void> {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      this.setState('idle')
      this.emit('reconnect-failed')
      return
    }
    this.reconnectAttempts++
    await new Promise((resolve) => setTimeout(resolve, 2000))
    if (this._sessionId && this._workingDir) {
      try {
        await this.spawnCLI(this._workingDir, this._model, this._sessionId)
      } catch {
        this.attemptReconnect()
      }
    }
  }

  /** Kill process and clean up — for app quit, does NOT re-spawn */
  async destroy(): Promise<void> {
    this.removeAllListeners()
    await this.killProcess()
    this.setState('idle')
  }

  private async killProcess(): Promise<void> {
    if (this.process) {
      const child = this.process
      try {
        this.suppressedDisconnects++
        this.intentionallyStoppedProcesses.add(child)
        child.kill('SIGTERM')
      } catch {
        // Process may already be dead
      }
      this.process = null
    }
  }
}
