import { cn } from '../../lib/utils'
import type { InlineComment } from '../../types'

interface Props {
  comment: InlineComment
  onResolve: (id: string) => void
}

export function CommentRow({ comment, onResolve }: Props) {
  return (
    <div className={cn('flex items-baseline gap-1.5 font-sans', comment.resolved && 'opacity-50')}>
      <span className="text-[11px] font-semibold">{comment.author}</span>
      <span className={cn('text-[11px] text-secondary', comment.resolved && 'line-through')}>
        {comment.text}
      </span>
      <span className="text-[10px] text-muted-foreground ml-auto whitespace-nowrap">
        {comment.timestamp}
      </span>
    </div>
  )
}
