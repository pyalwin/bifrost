import { ElectronAPI } from '@electron-toolkit/preload'

interface ClaudeAPI {
  startSession: (workingDir: string) => Promise<void>
  resumeSession: (sessionId: string, workingDir: string) => Promise<void>
  listSessions: () => Promise<Array<{ id: string; workingDir: string; timestamp: number }>>
  cancelTurn: () => Promise<void>
  sendMessage: (text: string) => Promise<void>
  sendControlResponse: (requestId: string, approved: boolean) => Promise<void>

  onMessage: (callback: (event: unknown) => void) => () => void
  onConnectionStateChange: (callback: (state: string) => void) => () => void
  onDiffUpdate: (callback: (diffs: unknown[]) => void) => () => void
  onBranchChange: (callback: (branch: string) => void) => () => void
  selectDirectory: () => Promise<string | null>
}

declare global {
  interface Window {
    electron: ElectronAPI
    api: unknown
    claude: ClaudeAPI
  }
}
