import type { Review } from '../../types'
import { cn } from '../../lib/utils'

interface Props {
  reviews: Review[]
  activeReviewId?: string | null
  onSelectReview: (id: string) => void
  onStartNewReview: () => void
}

export function ReviewTabsBar({ reviews, activeReviewId, onSelectReview, onStartNewReview }: Props) {
  if (reviews.length === 0) return null

  const statusDot = (status: Review['status']) => {
    const colors = {
      drafting: 'bg-amber-400',
      submitted: 'bg-amber-400',
      'in-progress': 'bg-blue-400',
      done: 'bg-green-500',
    }
    return <span className={cn('w-1.5 h-1.5 rounded-full shrink-0', colors[status])} />
  }

  const resolvedCount = (r: Review) => r.comments.filter(c => c.resolved).length

  return (
    <div className="flex items-center bg-background border-b border-border px-3 text-[12px] overflow-x-auto">
      <span className="text-[10px] font-bold text-muted-foreground/40 uppercase tracking-wider px-2 shrink-0">Reviews</span>
      {reviews.map((r, i) => (
        <button
          key={r.id}
          onClick={() => onSelectReview(r.id)}
          className={cn(
            'flex items-center gap-1.5 px-3 py-2 border-b-2 transition-colors shrink-0',
            r.id === activeReviewId
              ? 'border-blue-500 text-foreground'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          )}
        >
          {statusDot(r.status)}
          Review #{i + 1}
          <span className="text-[10px] text-muted-foreground/50">
            {resolvedCount(r)}/{r.comments.length}
          </span>
        </button>
      ))}
      <button
        onClick={onStartNewReview}
        className="flex items-center gap-1 px-2 py-2 text-green-500 hover:text-green-400 shrink-0 transition-colors"
      >
        + New Review
      </button>
    </div>
  )
}
