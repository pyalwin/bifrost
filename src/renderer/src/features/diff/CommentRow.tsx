import { cn } from '../../lib/utils'
import type { InlineComment } from '../../types'

interface Props {
  comment: InlineComment
  onResolve: (id: string) => void
}

export function CommentRow({ comment, onResolve: _onResolve }: Props) {
  return (
    <div className={cn('flex items-baseline gap-1.5 font-sans', comment.resolved && 'opacity-50')}>
      <span className="text-[11px] font-semibold text-amber-700 dark:text-amber-400">{comment.author}</span>
      <span className={cn('text-[11px] text-foreground/80', comment.resolved && 'line-through')}>
        {comment.text}
      </span>
      <span className="text-[10px] text-muted-foreground ml-auto whitespace-nowrap">
        {comment.timestamp}
      </span>
    </div>
  )
}
