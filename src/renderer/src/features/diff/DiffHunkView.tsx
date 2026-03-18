import { useState, useEffect } from 'react'
import type { DiffHunk, DiffLine, InlineComment } from '../../types'
import { cn } from '../../lib/utils'
import { InlineCommentThread } from './InlineCommentThread'
import { highlightLine } from './highlighter'

interface Props {
  hunks: DiffHunk[]
  language: string
  theme: 'light' | 'dark'
  commentsByLine?: Map<number, InlineComment[]>
  onLineClick?: (lineNumber: number) => void
  onResolve?: (id: string) => void
  onReply?: (parentId: string, text: string) => void
}

function LineRow({
  line,
  language,
  theme,
  onGutterClick
}: {
  line: DiffLine
  language: string
  theme: 'light' | 'dark'
  onGutterClick?: () => void
}) {
  const [html, setHtml] = useState<string | null>(null)
  const shikiTheme = theme === 'dark' ? 'github-dark' : 'github-light'

  useEffect(() => {
    highlightLine(line.content, language, shikiTheme).then(setHtml)
  }, [line.content, language, shikiTheme])

  return (
    <div
      className={cn(
        'flex px-4',
        line.type === 'removed' && 'bg-diff-removed-bg text-diff-removed-text',
        line.type === 'added' && 'bg-diff-added-bg text-diff-added-text',
        line.type === 'context' && 'text-foreground'
      )}
    >
      <span
        className="inline-block w-10 text-right mr-4 select-none text-muted-foreground shrink-0 cursor-pointer hover:text-foreground transition-colors"
        onClick={onGutterClick}
      >
        {line.type === 'removed' ? '\u2212' : line.type === 'added' ? '+' : ''}
      </span>
      {html ? (
        <span className="whitespace-pre" dangerouslySetInnerHTML={{ __html: html }} />
      ) : (
        <span className="whitespace-pre">{line.content}</span>
      )}
    </div>
  )
}

export function DiffHunkView({
  hunks,
  language,
  theme,
  commentsByLine,
  onLineClick,
  onResolve,
  onReply
}: Props) {
  return (
    <div className="font-mono text-xs leading-[1.85]">
      {hunks.map((hunk, hi) => (
        <div key={hi}>
          {hi > 0 && <div className="h-3" />}
          {hunk.lines.map((line, li) => {
            const lineNum = line.newLineNumber
            const lineComments = lineNum ? commentsByLine?.get(lineNum) : undefined
            return (
              <div key={`${hi}-${li}`}>
                <LineRow
                  line={line}
                  language={language}
                  theme={theme}
                  onGutterClick={
                    onLineClick && lineNum ? () => onLineClick(lineNum) : undefined
                  }
                />
                {lineComments && lineComments.length > 0 && onResolve && onReply && (
                  <InlineCommentThread
                    comments={lineComments}
                    onResolve={onResolve}
                    onReply={onReply}
                  />
                )}
              </div>
            )
          })}
        </div>
      ))}
    </div>
  )
}
