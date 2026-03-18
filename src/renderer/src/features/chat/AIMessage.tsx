import { useState, useEffect } from 'react'
import type { Message } from '../../types'
import { ToolUsageItem } from './ToolUsageItem'
import { MarkdownRenderer } from './MarkdownRenderer'
import { StreamingIndicator } from './StreamingIndicator'

interface Props {
  message: Message
  theme: 'light' | 'dark'
}

// Two-word combo generator inspired by Claude Code CLI's quirky progress text.
// Picks a random verb + noun and pairs them for an endlessly varied feel.
const VERBS = [
  'Pondering', 'Untangling', 'Decoding', 'Inspecting', 'Traversing',
  'Mapping', 'Parsing', 'Scanning', 'Tracing', 'Unraveling',
  'Consulting', 'Examining', 'Digesting', 'Navigating', 'Assembling',
  'Sketching', 'Brewing', 'Distilling', 'Weighing', 'Sifting',
  'Chasing', 'Collecting', 'Aligning', 'Compiling', 'Resolving',
  'Deciphering', 'Orchestrating', 'Polishing', 'Refining', 'Synthesizing',
]

const NOUNS = [
  'the logic', 'the architecture', 'possibilities', 'the codebase',
  'the patterns', 'the details', 'the connections', 'the structure',
  'the context', 'the approach', 'the dependencies', 'the threads',
  'the evidence', 'the implications', 'the abstractions', 'the flow',
  'the signals', 'the constraints', 'the layers', 'the edges',
  'the pieces', 'the strategy', 'the fundamentals', 'the pathways',
]

function generatePhrase(): string {
  const verb = VERBS[Math.floor(Math.random() * VERBS.length)]
  const noun = NOUNS[Math.floor(Math.random() * NOUNS.length)]
  return `${verb} ${noun}`
}

function ThinkingDots() {
  const [phrase, setPhrase] = useState(generatePhrase)

  useEffect(() => {
    const interval = setInterval(() => {
      setPhrase(generatePhrase())
    }, 3000)
    return () => clearInterval(interval)
  }, [])

  return (
    <div className="flex items-center gap-3 py-2 animate-fade-in">
      <div className="flex items-center gap-[5px]">
        <span className="thinking-dot block w-[5px] h-[5px] rounded-full bg-muted-foreground/60" />
        <span className="thinking-dot block w-[5px] h-[5px] rounded-full bg-muted-foreground/60" />
        <span className="thinking-dot block w-[5px] h-[5px] rounded-full bg-muted-foreground/60" />
      </div>
      <span key={phrase} className="text-[13px] text-muted-foreground animate-fade-in">
        {phrase}
      </span>
    </div>
  )
}

function WorkingShimmer() {
  return (
    <div className="mt-2 space-y-2 animate-fade-in">
      <div className="shimmer-line h-[10px] w-3/4" />
      <div className="shimmer-line h-[10px] w-1/2" />
    </div>
  )
}

export function AIMessage({ message, theme }: Props) {
  const tools = message.tools ?? []
  const hasContent = !!message.content
  const isThinkingOnly = message.isThinking && !hasContent && tools.length === 0

  return (
    <div className="mb-5 animate-fade-in-up">
      {/* Thinking state — animated dots shown immediately */}
      {isThinkingOnly && <ThinkingDots />}

      {/* Intermediary section — tools, visually grouped */}
      {tools.length > 0 && (
        <div className="mb-3">
          {message.thinkingTime && (
            <div className="text-[13px] text-muted-foreground mb-1.5 animate-fade-in">
              Thought {message.thinkingTime}s
            </div>
          )}

          <div className="flex flex-col stagger-children">
            {tools.map((tool, i) => (
              <ToolUsageItem key={i} tool={tool} />
            ))}
          </div>

          {/* Shimmer loading — after tools, before text */}
          {message.isStreaming && !hasContent && <WorkingShimmer />}
        </div>
      )}

      {/* Response text — markdown rendered, fades in */}
      {hasContent && (
        <div className="text-sm leading-[1.65] text-foreground animate-fade-in">
          <MarkdownRenderer content={message.content} theme={theme} />
          {message.isStreaming && <StreamingIndicator />}
        </div>
      )}
    </div>
  )
}
