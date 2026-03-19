interface Props {
  fileCount: number
  additions: number
  deletions: number
  reviewMode: boolean
  reviewCommentCount: number
  onStartReview: () => void
  onSubmitReview: () => void
  onCancelReview: () => void
}

export function DiffSummaryHeader({
  fileCount, additions, deletions,
  reviewMode, reviewCommentCount, onStartReview, onSubmitReview, onCancelReview
}: Props) {
  return (
    <div className="px-4 py-2.5 border-b border-border flex items-center gap-2.5 bg-muted">
      <span className="font-semibold text-[13px]">{fileCount} files changed</span>
      <span className="text-diff-added-text text-[13px] font-medium">+{additions}</span>
      <span className="text-diff-removed-text text-[13px] font-medium">-{deletions}</span>
      <span className="ml-auto flex gap-2 items-center">
        {!reviewMode ? (
          <button
            onClick={onStartReview}
            className="flex items-center gap-1.5 px-3 py-1 bg-green-600 hover:bg-green-700 text-white text-[12px] font-medium rounded-md transition-colors"
          >
            Start Review
          </button>
        ) : (
          <>
            {reviewCommentCount > 0 && (
              <span className="text-[11px] font-medium text-amber-400 bg-amber-400/15 px-2 py-0.5 rounded-full">
                {reviewCommentCount} comment{reviewCommentCount !== 1 ? 's' : ''}
              </span>
            )}
            <button
              onClick={onCancelReview}
              className="px-3 py-1 text-[12px] text-muted-foreground hover:text-foreground border border-border rounded-md transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={onSubmitReview}
              disabled={reviewCommentCount === 0}
              className="flex items-center gap-1.5 px-3 py-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed text-white text-[12px] font-medium rounded-md transition-colors"
            >
              Submit Review ({reviewCommentCount})
            </button>
          </>
        )}
      </span>
    </div>
  )
}
