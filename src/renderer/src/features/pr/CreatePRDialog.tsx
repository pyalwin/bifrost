import { useState, useEffect } from 'react'

interface Props {
  branchName: string
  baseBranch: string
  onSubmit: (title: string, body: string) => void
  onCancel: () => void
  isSubmitting: boolean
  error?: string | null
}

export function CreatePRDialog({ branchName, baseBranch, onSubmit, onCancel, isSubmitting, error }: Props) {
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [loading, setLoading] = useState(true)

  // Fetch prefill data on mount
  useEffect(() => {
    window.claude?.getPRPrefill()
      .then((prefill) => {
        if (prefill) {
          setTitle(prefill.title || branchName)
          setBody(prefill.body || '')
        }
      })
      .catch(() => {
        // Fallback: generate from branch name
        setTitle(
          branchName
            .replace(/^(feat|fix|chore|docs|refactor|test|style|perf|ci|build)\//i, '')
            .replace(/[-_/]/g, ' ')
            .replace(/^\w/, c => c.toUpperCase())
        )
      })
      .finally(() => setLoading(false))
  }, [branchName])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onCancel}>
      <div
        className="w-[520px] bg-background border border-border rounded-xl shadow-2xl animate-fade-in-up"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-5 py-4 border-b border-border">
          <h2 className="text-[15px] font-semibold">Create Pull Request</h2>
          <p className="text-[12px] text-muted-foreground mt-1">
            {branchName} → {baseBranch}
          </p>
        </div>

        <div className="px-5 py-4 space-y-3">
          <div>
            <label className="text-[12px] font-medium text-muted-foreground block mb-1">Title</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && title.trim() && !isSubmitting) onSubmit(title, body)
                if (e.key === 'Escape') onCancel()
              }}
              className="w-full px-3 py-2 text-[13px] bg-muted border border-border rounded-md outline-none focus:border-foreground/30"
              placeholder={loading ? 'Loading...' : 'PR title'}
              autoFocus
            />
          </div>
          <div>
            <label className="text-[12px] font-medium text-muted-foreground block mb-1">Description</label>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Escape') onCancel() }}
              className="w-full px-3 py-2 text-[13px] bg-muted border border-border rounded-md outline-none focus:border-foreground/30 resize-none font-mono"
              rows={10}
              placeholder={loading ? 'Loading...' : 'Describe your changes...'}
            />
          </div>
          {error && (
            <p className="text-[12px] text-red-400 bg-red-400/10 px-3 py-2 rounded-md">{error}</p>
          )}
        </div>

        <div className="px-5 py-3 border-t border-border flex justify-end gap-2">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-[13px] text-muted-foreground hover:text-foreground border border-border rounded-md transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => onSubmit(title, body)}
            disabled={!title.trim() || isSubmitting || loading}
            className="px-4 py-2 text-[13px] font-medium bg-green-600 hover:bg-green-700 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-md transition-colors"
          >
            {isSubmitting ? 'Creating...' : 'Create Pull Request'}
          </button>
        </div>
      </div>
    </div>
  )
}
