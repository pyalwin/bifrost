import { cn } from '../../lib/utils'
import type { Review } from '../../types'

interface Props {
  reviews: Review[]
  onStartNewReview: () => void
  onSelectReview: (id: string) => void
}

export function ReviewsView({ reviews, onStartNewReview, onSelectReview }: Props) {
  const resolvedCount = (r: Review) => r.comments.filter(c => c.resolved).length

  const statusDot = (status: Review['status']) => {
    const colors = {
      drafting: 'bg-amber-500',
      submitted: 'bg-amber-500',
      'in-progress': 'bg-blue-400',
      done: 'bg-green-500',
    }
    return colors[status]
  }

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-[800px] mx-auto px-10 py-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-[16px] font-semibold">Code Reviews</h2>
          <button
            onClick={onStartNewReview}
            className="flex items-center gap-1.5 px-4 py-2 bg-green-500/10 text-green-500 hover:bg-green-500/20 text-[12px] font-semibold rounded-md transition-colors"
          >
            <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor"><path d="M3.5 1.75a.75.75 0 00-1.5 0v11.5c0 .414.336.75.75.75h11.5a.75.75 0 000-1.5H3.5V1.75z"/><path d="M5.22 9.97a.75.75 0 011.06 0l1.97 1.97 4.47-4.47a.75.75 0 011.06 1.06l-5 5a.75.75 0 01-1.06 0l-2.5-2.5a.75.75 0 010-1.06z"/></svg>
            Start New Review
          </button>
        </div>

        {reviews.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-muted-foreground text-[13px]">No reviews yet</p>
            <p className="text-muted-foreground/50 text-[12px] mt-1">Start a review from the Files Changed tab</p>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {reviews.map((review, i) => {
              const resolved = resolvedCount(review)
              const total = review.comments.length
              const progress = total > 0 ? (resolved / total) * 100 : 0

              return (
                <button
                  key={review.id}
                  onClick={() => onSelectReview(review.id)}
                  className={cn(
                    'w-full text-left px-4 py-3.5 bg-muted border border-border rounded-lg flex items-center gap-3 transition-colors hover:border-muted-foreground',
                    review.status === 'done' && 'opacity-70'
                  )}
                >
                  <span className={cn('w-2 h-2 rounded-full shrink-0', statusDot(review.status))} />
                  <div className="flex-1 min-w-0">
                    <div className="text-[14px] font-medium">Review #{i + 1}</div>
                    <div className="text-[11px] text-muted-foreground mt-0.5">
                      {total} comment{total !== 1 ? 's' : ''} · {resolved}/{total} resolved
                    </div>
                  </div>
                  <div className="w-[80px] h-[3px] bg-border rounded-full overflow-hidden shrink-0">
                    <div
                      className="h-full bg-green-500 rounded-full transition-all"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </button>
              )
            })}
          </div>
        )}

        {reviews.length > 0 && (
          <p className="text-[12px] text-muted-foreground/40 text-center mt-8 italic">
            Reviews are tied to this branch and its pull request. Each review creates a focused discussion thread with Claude.
          </p>
        )}
      </div>
    </div>
  )
}
