import { cn } from '../../lib/utils'
import type { InlineComment } from '../../types'

interface Props {
  comment: InlineComment
}

export function CommentRow({ comment }: Props) {
  return (
    <div className={cn('flex gap-3 py-2.5 font-sans', comment.resolved && 'opacity-50')}>
      {/* Avatar */}
      <div className="w-7 h-7 bg-muted-foreground/15 rounded-full flex items-center justify-center text-[11px] font-semibold text-muted-foreground shrink-0 mt-0.5">
        {comment.author[0]}
      </div>
      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <span className="text-[13px] font-semibold text-foreground">{comment.author}</span>
          <span className="text-[12px] text-muted-foreground">{comment.timestamp}</span>
        </div>
        <div className={cn('text-[13px] text-foreground/80 leading-relaxed', comment.resolved && 'line-through')}>
          {comment.text}
        </div>
      </div>
    </div>
  )
}
