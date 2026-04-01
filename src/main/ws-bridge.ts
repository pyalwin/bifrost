import { WebSocketServer, WebSocket } from 'ws'
import { EventEmitter } from 'events'
import { createServer } from 'http'

interface ConnectionMeta {
  url: string
  sessionKey: string | null
  connectedAt: number
}

function parseSessionKey(url: string | undefined): string | null {
  if (!url) return null
  const match = url.match(/\/ws\/cli\/([^/?]+)/)
  return match?.[1] ?? null
}

function describeEvent(event: Record<string, unknown>): string {
  const parts = [
    `type=${String(event.type ?? 'unknown')}`,
  ]
  if (typeof event.subtype === 'string') parts.push(`subtype=${event.subtype}`)
  if (typeof event.session_id === 'string') parts.push(`session_id=${event.session_id}`)
  if (typeof event.request_id === 'string') parts.push(`request_id=${event.request_id}`)
  if (typeof event.tool_name === 'string') parts.push(`tool=${event.tool_name}`)
  return parts.join(' ')
}

export class WsBridge extends EventEmitter {
  private wss: WebSocketServer | null = null
  private httpServer: ReturnType<typeof createServer> | null = null
  private connection: WebSocket | null = null
  private connectionMeta: ConnectionMeta | null = null
  public port: number = 0

  async start(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.httpServer = createServer()
      this.wss = new WebSocketServer({ server: this.httpServer })

      this.wss.on('connection', (ws, req) => {
        const url = req.url ?? ''
        const sessionKey = parseSessionKey(url)
        if (this.connection && this.connection.readyState === WebSocket.OPEN) {
          console.warn('[WsBridge] Replacing existing CLI connection', {
            previousSessionKey: this.connectionMeta?.sessionKey,
            nextSessionKey: sessionKey,
          })
        }

        this.connection = ws
        this.connectionMeta = {
          url,
          sessionKey,
          connectedAt: Date.now(),
        }
        console.log('[WsBridge] CLI connected', {
          url,
          sessionKey,
          remoteAddress: req.socket.remoteAddress,
          remotePort: req.socket.remotePort,
        })

        ws.on('message', (data) => {
          const raw = data.toString()
          console.log('[WsBridge] <- raw message', {
            sessionKey: this.connectionMeta?.sessionKey,
            bytes: Buffer.byteLength(raw),
            lines: raw.split('\n').filter(Boolean).length,
          })
          for (const line of raw.split('\n')) {
            if (!line.trim()) continue
            try {
              const event = JSON.parse(line) as Record<string, unknown>
              console.log('[WsBridge] <- event', {
                sessionKey: this.connectionMeta?.sessionKey,
                summary: describeEvent(event),
              })
              this.emit('cli-event', event)
            } catch (err) {
              console.error('[WsBridge] Failed to parse CLI line', {
                sessionKey: this.connectionMeta?.sessionKey,
                line,
                error: err,
              })
            }
          }
        })

        ws.on('close', (code, reason) => {
          const meta = this.connectionMeta
          console.log('[WsBridge] CLI disconnected', {
            sessionKey: meta?.sessionKey,
            code,
            reason: reason.toString() || null,
            lifetimeMs: meta ? Date.now() - meta.connectedAt : null,
          })
          if (this.connection === ws) {
            this.connection = null
            this.connectionMeta = null
            this.emit('disconnected')
          }
        })

        ws.on('error', (err) => {
          console.error('[WsBridge] WebSocket error', {
            sessionKey: this.connectionMeta?.sessionKey,
            error: err,
          })
        })

        this.emit('connected')
      })

      this.httpServer.listen(0, '127.0.0.1', () => {
        const addr = this.httpServer!.address()
        if (addr && typeof addr === 'object') {
          this.port = addr.port
          console.log(`[WsBridge] Listening on ws://127.0.0.1:${this.port}`)
          resolve()
        } else {
          reject(new Error('Failed to bind WsBridge'))
        }
      })

      this.httpServer.on('error', reject)
    })
  }

  sendToClient(data: Record<string, unknown>): void {
    if (!this.connection || this.connection.readyState !== WebSocket.OPEN) {
      console.warn('[WsBridge] No active connection, dropping message', {
        sessionKey: this.connectionMeta?.sessionKey,
        type: data.type,
      })
      return
    }
    const payload = JSON.stringify(data)
    console.log('[WsBridge] -> event', {
      sessionKey: this.connectionMeta?.sessionKey,
      type: data.type,
      bytes: Buffer.byteLength(payload),
      preview: payload.length > 200 ? payload.slice(0, 200) + '...' : payload,
    })
    this.connection.send(payload + '\n')
  }

  get isConnected(): boolean {
    return this.connection?.readyState === WebSocket.OPEN
  }

  async stop(): Promise<void> {
    if (this.connection) {
      console.log('[WsBridge] Closing active connection', {
        sessionKey: this.connectionMeta?.sessionKey,
      })
      this.connection.close()
      this.connection = null
      this.connectionMeta = null
    }
    if (this.wss) {
      console.log('[WsBridge] Closing WebSocket server')
      this.wss.close()
      this.wss = null
    }
    if (this.httpServer) {
      console.log('[WsBridge] Closing HTTP server')
      this.httpServer.close()
      this.httpServer = null
    }
  }
}
