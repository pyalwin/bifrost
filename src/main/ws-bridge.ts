import { WebSocketServer, WebSocket } from 'ws'
import { EventEmitter } from 'events'
import { createServer } from 'http'

export class WsBridge extends EventEmitter {
  private wss: WebSocketServer | null = null
  private httpServer: ReturnType<typeof createServer> | null = null
  private connection: WebSocket | null = null
  public port: number = 0

  async start(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.httpServer = createServer()
      this.wss = new WebSocketServer({ server: this.httpServer })

      this.wss.on('connection', (ws, req) => {
        console.log('[WsBridge] CLI connected:', req.url)
        this.connection = ws

        ws.on('message', (data) => {
          const raw = data.toString()
          for (const line of raw.split('\n')) {
            if (!line.trim()) continue
            try {
              const event = JSON.parse(line)
              this.emit('cli-event', event)
            } catch (err) {
              console.error('[WsBridge] Failed to parse:', line, err)
            }
          }
        })

        ws.on('close', () => {
          console.log('[WsBridge] CLI disconnected')
          this.connection = null
          this.emit('disconnected')
        })

        ws.on('error', (err) => {
          console.error('[WsBridge] WebSocket error:', err)
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
      console.warn('[WsBridge] No active connection, dropping message')
      return
    }
    this.connection.send(JSON.stringify(data) + '\n')
  }

  get isConnected(): boolean {
    return this.connection?.readyState === WebSocket.OPEN
  }

  async stop(): Promise<void> {
    if (this.connection) {
      this.connection.close()
      this.connection = null
    }
    if (this.wss) {
      this.wss.close()
      this.wss = null
    }
    if (this.httpServer) {
      this.httpServer.close()
      this.httpServer = null
    }
  }
}
