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
  public manualApproval = false

  constructor(bridge: WsBridge) {
    super()
    this.bridge = bridge

    bridge.on('connected', () => {
      this.setState('active')
      this.reconnectAttempts = 0
    })

    bridge.on('disconnected', () => {
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
        this.bridge.sendToClient({
          type: 'control_response',
          response: { response: { behavior: 'allow', updatedInput: null } }
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
    await this.killProcess()
    this._workingDir = workingDir
    this._sessionId = null
    this.setState('connecting')
    await this.spawnCLI(workingDir, model)
  }

  async resumeSession(sessionId: string, workingDir: string, model?: string): Promise<void> {
    await this.killProcess()
    this._workingDir = workingDir
    this._sessionId = sessionId
    this.setState('connecting')
    await this.spawnCLI(workingDir, model, sessionId)
  }

  async sendMessage(text: string): Promise<void> {
    // In --print mode, the CLI exits after each turn.
    // If process is dead, re-spawn with --resume before sending.
    if (!this.process && this._sessionId && this._workingDir) {
      console.log('[SessionManager] Re-spawning CLI for next turn')
      await this.spawnCLI(this._workingDir, undefined, this._sessionId)
    }

    this.bridge.sendToClient({
      type: 'user',
      message: { role: 'user', content: text },
      parent_tool_use_id: null,
      session_id: this._sessionId
    })
  }

  sendControlResponse(_requestId: string, approved: boolean): void {
    if (approved) {
      this.bridge.sendToClient({
        type: 'control_response',
        response: { response: { behavior: 'allow', updatedInput: null } }
      })
    } else {
      this.bridge.sendToClient({
        type: 'control_response',
        response: { response: { behavior: 'deny' } }
      })
    }
  }

  async cancelTurn(): Promise<void> {
    await this.killProcess()
    if (this._sessionId && this._workingDir) {
      this.setState('connecting')
      await this.spawnCLI(this._workingDir, undefined, this._sessionId)
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

    this.process = spawn(cli.path, args, {
      cwd: workingDir,
      env,
      stdio: ['pipe', 'pipe', 'pipe']
    })

    this.process.on('exit', (code) => {
      console.log(`[SessionManager] CLI exited with code ${code}`)
      if (this._state === 'connecting' && code !== 0) {
        this.emit('cli-error', `CLI exited with code ${code}`)
        this.setState('idle')
      }
    })

    this.process.stderr?.on('data', (data: Buffer) => {
      try {
        console.error('[SessionManager] CLI stderr:', data.toString())
      } catch {
        // Ignore EPIPE errors when logging
      }
    })

    this.process.on('error', (err) => {
      console.error('[SessionManager] Process error:', err.message)
    })

    // Handle broken pipe on stdin/stdout/stderr
    this.process.stdin?.on('error', () => {})
    this.process.stdout?.on('error', () => {})
    this.process.stderr?.on('error', () => {})

    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('CLI connection timeout (10s)'))
        this.killProcess()
      }, 10000)

      this.bridge.once('connected', () => {
        clearTimeout(timeout)
        resolve()
      })
      this.process!.once('exit', (code) => {
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
        await this.spawnCLI(this._workingDir, undefined, this._sessionId)
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
      try {
        this.process.kill('SIGTERM')
      } catch {
        // Process may already be dead
      }
      this.process = null
    }
  }
}
