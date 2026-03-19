import { useState, useEffect } from 'react'
import { ExternalLink } from 'lucide-react'

interface Commit {
  sha: string
  fullSha?: string
  message: string
  author: string
  timeAgo: string
  url?: string
}

interface Props {
  branch: string
}

export function CommitsView({ branch }: Props) {
  const [commits, setCommits] = useState<Commit[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    window.claude?.listCommits()
      .then(c => setCommits(c ?? []))
      .catch(() => setCommits([]))
      .finally(() => setLoading(false))
  }, [branch])

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center text-muted-foreground text-[13px]">
        Loading commits...
      </div>
    )
  }

  if (commits.length === 0) {
    return (
      <div className="h-full flex items-center justify-center text-muted-foreground text-[13px]">
        No commits on this branch yet
      </div>
    )
  }

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-[800px] mx-auto px-10 py-8">
        <div className="text-[12px] text-muted-foreground mb-6">
          {commits.length} commit{commits.length !== 1 ? 's' : ''} on {branch}
        </div>
        <div className="flex flex-col">
          {commits.map((commit, i) => (
            <div
              key={commit.sha}
              className="flex items-start gap-3 py-3 border-b border-border last:border-b-0"
            >
              {/* Timeline dot + line */}
              <div className="flex flex-col items-center pt-1.5 shrink-0">
                <div className="w-2 h-2 rounded-full bg-green-500" />
                {i < commits.length - 1 && (
                  <div className="w-px flex-1 bg-border mt-1" style={{ minHeight: 20 }} />
                )}
              </div>
              {/* Commit info */}
              <div className="flex-1 min-w-0">
                <div className="text-[14px] font-medium text-foreground leading-snug">{commit.message}</div>
                <div className="text-[11px] text-muted-foreground mt-1">{commit.author} · {commit.timeAgo}</div>
              </div>
              {/* SHA */}
              {commit.url ? (
                <button
                  onClick={() => typeof window.claude?.openExternal === 'function' && window.claude.openExternal(commit.url!)}
                  className="text-[11px] font-mono text-blue-400 shrink-0 pt-0.5 hover:underline flex items-center gap-1 cursor-pointer"
                  title="Open on GitHub"
                >
                  {commit.sha}
                  <ExternalLink className="w-2.5 h-2.5 opacity-50" />
                </button>
              ) : (
                <span className="text-[11px] font-mono text-blue-400 shrink-0 pt-0.5">{commit.sha}</span>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
