import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

const claudeAPI = {
  startSession: (workingDir: string, model?: string) => ipcRenderer.invoke('claude:start-session', workingDir, model),
  resumeSession: (sessionId: string, workingDir: string, model?: string) =>
    ipcRenderer.invoke('claude:resume-session', sessionId, workingDir, model),
  listSessions: () => ipcRenderer.invoke('claude:list-sessions'),
  listSessionsGrouped: () => ipcRenderer.invoke('claude:list-sessions-grouped'),
  listSessionsForDir: (workingDir: string) => ipcRenderer.invoke('claude:list-sessions-for-dir', workingDir),
  listProjects: () => ipcRenderer.invoke('claude:list-projects'),
  cancelTurn: () => ipcRenderer.invoke('claude:cancel-turn'),
  sendMessage: (text: string, images?: Array<{ base64: string; mediaType: string; name: string }>) =>
    ipcRenderer.invoke('claude:send-message', text, images),
  selectImages: () => ipcRenderer.invoke('claude:select-images'),
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
  selectDirectory: () => ipcRenderer.invoke('claude:select-directory'),
  archiveItem: (type: 'project' | 'session', id: string) =>
    ipcRenderer.invoke('claude:archive-item', type, id),
  unarchiveItem: (type: 'project' | 'session', id: string) =>
    ipcRenderer.invoke('claude:unarchive-item', type, id),
  getArchived: () => ipcRenderer.invoke('claude:get-archived'),
  getGitUser: () => ipcRenderer.invoke('claude:get-git-user'),
  listBranches: () => ipcRenderer.invoke('claude:list-branches'),
  checkoutBranch: (branchName: string, createNew: boolean) =>
    ipcRenderer.invoke('claude:checkout-branch', branchName, createNew),
  setBaseBranch: (branch: string | null) => ipcRenderer.invoke('claude:set-base-branch', branch),
  getBaseBranch: () => ipcRenderer.invoke('claude:get-base-branch'),
  openInIDE: (ide: 'vscode' | 'cursor' | 'pycharm') => ipcRenderer.invoke('claude:open-in-ide', ide),
  getPRPrefill: () => ipcRenderer.invoke('claude:get-pr-prefill'),
  getPullRequest: () => ipcRenderer.invoke('claude:get-pull-request'),
  createPullRequest: (title: string, body: string, baseBranch?: string) =>
    ipcRenderer.invoke('claude:create-pull-request', title, body, baseBranch),
  loadPlanFile: (filePath: string) => ipcRenderer.invoke('claude:load-plan-file', filePath),
  listCommits: () => ipcRenderer.invoke('claude:list-commits'),
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
