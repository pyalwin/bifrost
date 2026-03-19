import { cn } from '../../lib/utils'
import { MessageSquare, FileCode, GitCommit, CheckSquare } from 'lucide-react'

export type TabId = 'conversation' | 'files' | 'commits' | 'reviews'

interface TabDef {
  id: TabId
  label: string
  icon: React.ComponentType<{ className?: string }>
  count?: number
}

interface Props {
  activeTab: TabId
  onTabChange: (tab: TabId) => void
  filesCount?: number
  commitCount?: number
  reviewCount?: number
  conversationCount?: number
  diffStats?: { additions: number; deletions: number }
  onStartReview?: () => void
  reviewMode?: boolean
}

export function MainTabBar({
  activeTab, onTabChange, filesCount = 0, commitCount = 0, reviewCount = 0,
  conversationCount = 0, diffStats,
}: Props) {
  const tabs: TabDef[] = [
    { id: 'conversation', label: 'Conversation', icon: MessageSquare, count: conversationCount || undefined },
    { id: 'files', label: 'Files changed', icon: FileCode, count: filesCount || undefined },
    { id: 'commits', label: 'Commits', icon: GitCommit, count: commitCount || undefined },
    { id: 'reviews', label: 'Reviews', icon: CheckSquare, count: reviewCount || undefined },
  ]

  return (
    <div className="flex items-center bg-title-bar border-b border-border px-4 shrink-0">
      {tabs.map(tab => (
        <button
          key={tab.id}
          onClick={() => onTabChange(tab.id)}
          className={cn(
            'flex items-center gap-1.5 px-4 py-2.5 text-[13px] font-medium border-b-2 transition-colors',
            tab.id === activeTab
              ? 'text-foreground border-foreground'
              : 'text-muted-foreground border-transparent hover:text-foreground'
          )}
        >
          <tab.icon className="w-[14px] h-[14px]" />
          {tab.label}
          {tab.count !== undefined && tab.count > 0 && (
            <span className={cn(
              'text-[11px] font-semibold px-1.5 rounded-full min-w-[18px] text-center',
              tab.id === activeTab
                ? 'bg-foreground text-background'
                : 'bg-accent text-muted-foreground'
            )}>
              {tab.count}
            </span>
          )}
        </button>
      ))}
      <div className="ml-auto flex items-center gap-3">
        {diffStats && (diffStats.additions > 0 || diffStats.deletions > 0) && (
          <span className="text-[12px] font-mono">
            <span className="text-diff-added-text">+{diffStats.additions}</span>
            {' '}
            <span className="text-diff-removed-text">-{diffStats.deletions}</span>
          </span>
        )}
      </div>
    </div>
  )
}
