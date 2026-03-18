import { useState, useRef, useEffect } from 'react'
import { HelpCircle, Send } from 'lucide-react'
import { cn } from '../../lib/utils'

interface Option {
  label: string
  description?: string
}

interface Props {
  question: string
  header?: string
  options?: Option[]
  onAnswer: (answer: string) => void
}

export function QuestionPrompt({ question, header, options, onAnswer }: Props) {
  const [answer, setAnswer] = useState('')
  const [selectedOption, setSelectedOption] = useState<string | null>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (!options?.length) inputRef.current?.focus()
  }, [options])

  const handleSubmit = () => {
    const text = selectedOption || answer.trim()
    if (text) {
      onAnswer(text)
      setAnswer('')
      setSelectedOption(null)
    }
  }

  return (
    <div className="my-3 animate-fade-in-up">
      <div className="border border-blue-200 dark:border-blue-800/40 bg-blue-50/50 dark:bg-blue-950/20 rounded-lg overflow-hidden">
        {/* Question */}
        <div className="flex items-start gap-2.5 px-4 pt-3 pb-2">
          <div className="w-6 h-6 rounded-md bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center shrink-0 mt-0.5">
            <HelpCircle className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            {header && (
              <div className="text-[11px] font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wide mb-0.5">
                {header}
              </div>
            )}
            <div className="text-[13px] text-foreground leading-relaxed">{question}</div>
          </div>
        </div>

        {/* Options (if provided) */}
        {options && options.length > 0 && (
          <div className="px-4 pb-2 space-y-1.5">
            {options.map((opt, i) => (
              <button
                key={i}
                onClick={() => {
                  setSelectedOption(opt.label)
                  onAnswer(opt.label)
                }}
                className={cn(
                  'w-full text-left px-3 py-2.5 rounded-md border transition-colors',
                  'hover:border-blue-300 dark:hover:border-blue-700 hover:bg-blue-50/80 dark:hover:bg-blue-950/30',
                  selectedOption === opt.label
                    ? 'border-blue-400 bg-blue-50 dark:border-blue-600 dark:bg-blue-950/40'
                    : 'border-border bg-background'
                )}
              >
                <div className="text-[13px] font-medium text-foreground">{opt.label}</div>
                {opt.description && (
                  <div className="text-[11px] text-muted-foreground mt-0.5">{opt.description}</div>
                )}
              </button>
            ))}
          </div>
        )}

        {/* Free-text input (always shown, useful for custom answers even with options) */}
        <div className="px-4 pb-3">
          <div className="flex gap-2 mt-1">
            <textarea
              ref={inputRef}
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  handleSubmit()
                }
              }}
              placeholder={options?.length ? 'Or type a custom answer...' : 'Type your answer...'}
              rows={1}
              className="flex-1 px-3 py-2 text-[13px] bg-background border border-border rounded-md resize-none outline-none focus:border-blue-400 dark:focus:border-blue-600 transition-colors placeholder:text-muted-foreground/40"
            />
            <button
              onClick={handleSubmit}
              disabled={!answer.trim() && !selectedOption}
              className="px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5 text-[12px] font-medium shrink-0"
            >
              <Send className="w-3 h-3" />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
