import { useState, useEffect } from 'react'
import { cn } from '../../lib/utils'

interface Props {
  onClose: () => void
  onCommitted: () => void
}

export function CommitDialog({ onClose, onCommitted }: Props) {
  const [message, setMessage] = useState('')
  const [staged, setStaged] = useState<string[]>([])
  const [unstaged, setUnstaged] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [committing, setCommitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (typeof window.claude?.getStagedFiles !== 'function') {
      setLoading(false)
      return
    }
    window.claude.getStagedFiles()
      .then((result) => {
        setStaged(result.staged)
        setUnstaged(result.unstaged)
        if (result.suggestedMessage && !message) {
          setMessage(result.suggestedMessage)
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const handleStageAll = async () => {
    if (typeof window.claude?.stageAll !== 'function') return
    await window.claude.stageAll()
    // Refresh
    if (typeof window.claude?.getStagedFiles === 'function') {
      const { staged, unstaged } = await window.claude.getStagedFiles()
      setStaged(staged)
      setUnstaged(unstaged)
    }
  }

  const handleCommit = async () => {
    if (!message.trim()) return
    setCommitting(true)
    setError(null)

    // Auto-stage if nothing staged
    if (staged.length === 0 && unstaged.length > 0) {
      await handleStageAll()
    }

    if (typeof window.claude?.gitCommit !== 'function') {
      setError('Commit not available — restart the app')
      setCommitting(false)
      return
    }

    const result = await window.claude.gitCommit(message.trim())
    if (result.success) {
      onCommitted()
      onClose()
    } else {
      setError(result.error ?? 'Commit failed')
    }
    setCommitting(false)
  }

  const totalFiles = staged.length + unstaged.length

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div
        className="w-[480px] bg-background border border-border rounded-xl shadow-2xl animate-fade-in-up"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-5 py-4 border-b border-border">
          <h2 className="text-[15px] font-semibold">Commit Changes</h2>
          <p className="text-[12px] text-muted-foreground mt-1">
            {totalFiles} file{totalFiles !== 1 ? 's' : ''} changed
          </p>
        </div>

        <div className="px-5 py-4 space-y-3">
          {/* Commit message */}
          <div>
            <label className="text-[12px] font-medium text-muted-foreground block mb-1">Commit message</label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && (e.metaKey || e.ctrlKey) && message.trim()) handleCommit()
                if (e.key === 'Escape') onClose()
              }}
              className="w-full px-3 py-2 text-[13px] bg-muted border border-border rounded-md outline-none focus:border-foreground/30 resize-none font-mono"
              rows={3}
              placeholder="Describe your changes..."
              autoFocus
            />
          </div>

          {/* File list */}
          {loading ? (
            <div className="text-[12px] text-muted-foreground">Loading files...</div>
          ) : (
            <div className="max-h-[200px] overflow-y-auto">
              {staged.length > 0 && (
                <div className="mb-2">
                  <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                    Staged ({staged.length})
                  </div>
                  {staged.map(f => (
                    <div key={f} className="text-[12px] font-mono text-green-500/80 py-0.5 truncate">{f}</div>
                  ))}
                </div>
              )}
              {unstaged.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                      Unstaged ({unstaged.length})
                    </span>
                    <button
                      onClick={handleStageAll}
                      className="text-[10px] text-blue-400 hover:text-blue-300 transition-colors"
                    >
                      Stage all
                    </button>
                  </div>
                  {unstaged.map(f => (
                    <div key={f} className="text-[12px] font-mono text-amber-500/80 py-0.5 truncate">{f}</div>
                  ))}
                </div>
              )}
            </div>
          )}

          {error && (
            <p className="text-[12px] text-red-400 bg-red-400/10 px-3 py-2 rounded-md">{error}</p>
          )}
        </div>

        <div className="px-5 py-3 border-t border-border flex items-center justify-between">
          <span className="text-[11px] text-muted-foreground/50">⌘⏎ to commit</span>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-[13px] text-muted-foreground hover:text-foreground border border-border rounded-md transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleCommit}
              disabled={!message.trim() || committing || totalFiles === 0}
              className={cn(
                "px-4 py-2 text-[13px] font-medium rounded-md transition-colors",
                "bg-foreground text-background hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
              )}
            >
              {committing ? 'Committing...' : 'Commit'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
