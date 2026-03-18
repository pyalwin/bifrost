import { useState, useRef, useEffect } from 'react'
import { HelpCircle, Send } from 'lucide-react'

interface Props {
  question: string
  onAnswer: (answer: string) => void
}

export function QuestionPrompt({ question, onAnswer }: Props) {
  const [answer, setAnswer] = useState('')
  const inputRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    // Auto-focus the input when the question appears
    inputRef.current?.focus()
  }, [])

  const handleSubmit = () => {
    if (answer.trim()) {
      onAnswer(answer.trim())
      setAnswer('')
    }
  }

  return (
    <div className="mx-1 my-3 animate-fade-in-up">
      <div className="border border-blue-200 dark:border-blue-800/40 bg-blue-50/50 dark:bg-blue-950/20 rounded-lg overflow-hidden">
        {/* Question header */}
        <div className="flex items-start gap-2.5 px-4 pt-3 pb-2">
          <div className="w-6 h-6 rounded-md bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center shrink-0 mt-0.5">
            <HelpCircle className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <div className="text-[11px] font-medium text-blue-600 dark:text-blue-400 mb-0.5">Claude is asking</div>
            <div className="text-[13px] text-foreground leading-relaxed">{question}</div>
          </div>
        </div>

        {/* Answer input */}
        <div className="px-4 pb-3">
          <div className="flex gap-2 mt-2">
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
              placeholder="Type your answer..."
              rows={1}
              className="flex-1 px-3 py-2 text-[13px] bg-background border border-border rounded-md resize-none outline-none focus:border-blue-400 dark:focus:border-blue-600 transition-colors placeholder:text-muted-foreground/50"
            />
            <button
              onClick={handleSubmit}
              disabled={!answer.trim()}
              className="px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5 text-[12px] font-medium shrink-0"
            >
              <Send className="w-3 h-3" />
              Reply
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
