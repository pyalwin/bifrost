import { useState, useRef, KeyboardEvent } from 'react'
import { Plus, ChevronDown, ArrowUp, Check } from 'lucide-react'
import { cn } from '../../lib/utils'

const MODELS = [
  { id: 'opus', label: 'Claude Opus 4.6', description: 'Most capable' },
  { id: 'sonnet', label: 'Claude Sonnet 4.6', description: 'Fast & smart' },
  { id: 'haiku', label: 'Claude Haiku 4.5', description: 'Fastest' },
]

interface Props {
  onSend: (text: string) => void
  disabled?: boolean
  model: string
  onModelChange: (model: string) => void
}

export function InputBox({ onSend, disabled = false, model, onModelChange }: Props) {
  const [value, setValue] = useState('')
  const [showModelPicker, setShowModelPicker] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const selectedModel = MODELS.find(m => m.id === model) ?? MODELS[0]

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      if (value.trim()) {
        onSend(value.trim())
        setValue('')
        if (textareaRef.current) textareaRef.current.style.height = 'auto'
      }
    }
  }

  const handleInput = () => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px'
    }
  }

  return (
    <div className="px-5 pb-4 pt-3 border-t border-border">
      <div className="max-w-3xl mx-auto border border-border rounded-xl bg-background transition-shadow duration-200 focus-within:shadow-[0_0_0_1px_var(--primary)] focus-within:border-transparent">
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => { setValue(e.target.value); handleInput() }}
          onKeyDown={handleKeyDown}
          placeholder={disabled ? 'Connecting...' : 'Ask Claude anything'}
          disabled={disabled}
          rows={1}
          className="w-full px-4 pt-3.5 pb-2 text-sm bg-transparent resize-none outline-none placeholder:text-muted-foreground/60 disabled:opacity-50 disabled:cursor-not-allowed"
        />
        <div className="flex items-center px-3 pb-2.5">
          <button className="w-[30px] h-[30px] flex items-center justify-center text-muted-foreground hover:text-secondary transition-colors">
            <Plus className="w-[18px] h-[18px]" />
          </button>

          {/* Model selector */}
          <div className="relative ml-1">
            <button
              onClick={() => setShowModelPicker(v => !v)}
              className="flex items-center gap-1 px-2.5 py-1 text-[13px] text-secondary hover:text-foreground transition-colors"
            >
              {selectedModel.label}
              <ChevronDown className={cn("w-3 h-3 text-muted-foreground transition-transform", showModelPicker && "rotate-180")} />
            </button>

            {showModelPicker && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowModelPicker(false)} />
                <div className="absolute bottom-full left-0 mb-2 w-56 bg-background border border-border rounded-lg shadow-lg z-50 py-1 animate-fade-in-up">
                  {MODELS.map(m => (
                    <button
                      key={m.id}
                      onClick={() => { onModelChange(m.id); setShowModelPicker(false) }}
                      className={cn(
                        "w-full text-left px-3 py-2 flex items-center gap-2 hover:bg-muted transition-colors",
                        m.id === model && "bg-muted/50"
                      )}
                    >
                      <div className="flex-1">
                        <div className="text-[13px] text-foreground">{m.label}</div>
                        <div className="text-[11px] text-muted-foreground">{m.description}</div>
                      </div>
                      {m.id === model && <Check className="w-3.5 h-3.5 text-foreground shrink-0" />}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>

          <button
            disabled={disabled}
            onClick={() => {
              if (value.trim() && !disabled) { onSend(value.trim()); setValue('') }
            }}
            className="ml-auto w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center hover:opacity-80 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ArrowUp className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  )
}
