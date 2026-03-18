import { useState, useRef, KeyboardEvent } from 'react'
import { Plus, ChevronDown, ArrowUp } from 'lucide-react'

interface Props {
  onSend: (text: string) => void
}

export function InputBox({ onSend }: Props) {
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
      <div className="border border-border rounded-xl overflow-hidden bg-background">
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => { setValue(e.target.value); handleInput() }}
          onKeyDown={handleKeyDown}
          placeholder="Ask Claude anything"
          rows={1}
          className="w-full px-4 pt-3.5 pb-2 text-sm bg-transparent resize-none outline-none placeholder:text-muted-foreground/60"
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
            onClick={() => {
              if (value.trim()) { onSend(value.trim()); setValue('') }
            }}
            className="ml-auto w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center hover:opacity-80 transition-opacity"
          >
            <ArrowUp className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  )
}
