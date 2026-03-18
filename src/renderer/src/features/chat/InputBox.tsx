import { useState, useRef, KeyboardEvent } from 'react'
import { Plus, ChevronDown, ArrowUp } from 'lucide-react'

interface Props {
  onSend: (text: string) => void
  disabled?: boolean
}

export function InputBox({ onSend, disabled = false }: Props) {
  const [value, setValue] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)

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
      <div className="max-w-[52%] mx-auto border border-border rounded-xl overflow-hidden bg-background transition-shadow duration-200 focus-within:shadow-[0_0_0_1px_var(--primary)] focus-within:border-transparent">
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
          <button className="flex items-center gap-1 px-2.5 py-1 ml-1 text-[13px] text-secondary hover:text-foreground transition-colors">
            Claude Opus 4.6
            <ChevronDown className="w-3 h-3 text-muted-foreground" />
          </button>
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
