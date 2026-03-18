import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

const claudeAPI = {
  startSession: (workingDir: string, model?: string) => ipcRenderer.invoke('claude:start-session', workingDir, model),
  resumeSession: (sessionId: string, workingDir: string, model?: string) =>
    ipcRenderer.invoke('claude:resume-session', sessionId, workingDir, model),
  listSessions: () => ipcRenderer.invoke('claude:list-sessions'),
  listSessionsForDir: (workingDir: string) => ipcRenderer.invoke('claude:list-sessions-for-dir', workingDir),
  listProjects: () => ipcRenderer.invoke('claude:list-projects'),
  cancelTurn: () => ipcRenderer.invoke('claude:cancel-turn'),
  sendMessage: (text: string) => ipcRenderer.invoke('claude:send-message', text),
  sendControlResponse: (requestId: string, approved: boolean) =>
    ipcRenderer.invoke('claude:control-response', requestId, approved),

  onMessage: (callback: (event: unknown) => void) => {
    const handler = (_: unknown, event: unknown) => callback(event)
    ipcRenderer.on('claude:message', handler)
    return () => ipcRenderer.removeListener('claude:message', handler)
  },
  onConnectionStateChange: (callback: (state: string) => void) => {
    const handler = (_: unknown, state: string) => callback(state)
    ipcRenderer.on('claude:state-change', handler)
    return () => ipcRenderer.removeListener('claude:state-change', handler)
  },
  onDiffUpdate: (callback: (diffs: unknown[]) => void) => {
    const handler = (_: unknown, diffs: unknown[]) => callback(diffs)
    ipcRenderer.on('claude:diff-update', handler)
    return () => ipcRenderer.removeListener('claude:diff-update', handler)
  },
  onBranchChange: (callback: (branch: string) => void) => {
    const handler = (_: unknown, branch: string) => callback(branch)
    ipcRenderer.on('claude:branch-change', handler)
    return () => ipcRenderer.removeListener('claude:branch-change', handler)
  },
  onHistory: (callback: (messages: unknown[]) => void) => {
    const handler = (_: unknown, messages: unknown[]) => callback(messages)
    ipcRenderer.on('claude:history', handler)
    return () => ipcRenderer.removeListener('claude:history', handler)
  },
  selectDirectory: () => ipcRenderer.invoke('claude:select-directory')
}

if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('claude', claudeAPI)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-ignore (define in dts)
  window.electron = electronAPI
  // @ts-ignore (define in dts)
  window.claude = claudeAPI
}
