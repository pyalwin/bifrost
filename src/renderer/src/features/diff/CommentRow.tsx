import { cn } from '../../lib/utils'
import type { InlineComment } from '../../types'

interface Props {
  comment: InlineComment
  onResolve: (id: string) => void
}

export function CommentRow({ comment, onResolve: _onResolve }: Props) {
  return (
    <div className={cn('flex items-center gap-2 font-sans', comment.resolved && 'opacity-50')}>
      <div className="w-5 h-5 bg-blue-100 dark:bg-blue-900/50 rounded-full flex items-center justify-center text-[10px] font-semibold text-blue-600 dark:text-blue-400 shrink-0">
        {comment.author[0]}
      </div>
      <span className="text-[13px] font-semibold text-foreground">{comment.author}</span>
      <span className={cn('text-[13px] text-foreground/80', comment.resolved && 'line-through')}>
        {comment.text}
      </span>
      <span className="text-[12px] text-muted-foreground ml-auto whitespace-nowrap">
        {comment.timestamp}
      </span>
    </div>
  )
}
