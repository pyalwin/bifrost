import { useState, useRef, KeyboardEvent } from 'react'
import { Plus, ChevronDown, ArrowUp, Check } from 'lucide-react'
import { cn } from '../../lib/utils'
import type { ConnectionState } from '../../types'

const MODELS = [
  { id: 'opus', label: 'Claude Opus 4.6', description: 'Most capable' },
  { id: 'sonnet', label: 'Claude Sonnet 4.6', description: 'Fast & smart' },
  { id: 'haiku', label: 'Claude Haiku 4.5', description: 'Fastest' },
]

interface Props {
  onSend: (text: string, images?: Array<{ base64: string; mediaType: string; name: string }>) => void
  connectionState: ConnectionState
  model: string
  onModelChange: (model: string) => void
  isSwitchingModel?: boolean
}

function getPlaceholder(connectionState: ConnectionState, isSwitchingModel: boolean): string {
  if (isSwitchingModel) {
    return 'Switching model...'
  }
  switch (connectionState) {
    case 'connecting':
      return 'Connecting...'
    case 'disconnected':
      return 'Disconnected. Reconnect or start a new session.'
    case 'idle':
      return 'Session unavailable. Check Claude CLI logs.'
    case 'active':
    default:
      return 'Ask Claude anything'
  }
}

export function InputBox({ onSend, connectionState, model, onModelChange, isSwitchingModel = false }: Props) {
  const [value, setValue] = useState('')
  const [showModelPicker, setShowModelPicker] = useState(false)
  const [attachments, setAttachments] = useState<Array<{ base64: string; mediaType: string; name: string }>>([])
  const [isDragging, setIsDragging] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const MAX_IMAGES = 20
  const ACCEPTED_TYPES = ['image/png', 'image/jpeg', 'image/gif', 'image/webp']
  const disabled = connectionState !== 'active' || isSwitchingModel

  const selectedModel = MODELS.find(m => m.id === model) ?? MODELS[0]

  const addFiles = (files: FileList | File[]) => {
    const imageFiles = Array.from(files).filter(f => ACCEPTED_TYPES.includes(f.type))
    const remaining = MAX_IMAGES - attachments.length
    const toAdd = imageFiles.slice(0, remaining)

    for (const file of toAdd) {
      const reader = new FileReader()
      reader.onload = () => {
        const result = reader.result as string
        const base64 = result.split(',')[1]
        setAttachments(prev => {
          if (prev.length >= MAX_IMAGES) return prev
          return [...prev, { base64, mediaType: file.type, name: file.name }]
        })
      }
      reader.readAsDataURL(file)
    }
  }

  const removeAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index))
  }

  const handleSend = () => {
    if (value.trim() || attachments.length > 0) {
      onSend(value.trim(), attachments.length > 0 ? attachments : undefined)
      setValue('')
      setAttachments([])
      if (textareaRef.current) textareaRef.current.style.height = 'auto'
    }
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const handleInput = () => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px'
    }
  }

  return (
    <div
      className="px-5 pb-4 pt-3 border-t border-border"
      onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={(e) => {
        e.preventDefault()
        setIsDragging(false)
        if (e.dataTransfer.files.length > 0) addFiles(e.dataTransfer.files)
      }}
    >
      <div className={cn(
        "max-w-3xl mx-auto border rounded-xl bg-background transition-shadow duration-200 focus-within:shadow-[0_0_0_1px_var(--primary)] focus-within:border-transparent",
        isDragging ? "border-primary shadow-[0_0_0_1px_var(--primary)]" : "border-border"
      )}>
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => { setValue(e.target.value); handleInput() }}
          onKeyDown={handleKeyDown}
          onPaste={(e) => {
            const items = e.clipboardData.items
            const imageItems = Array.from(items).filter(item => ACCEPTED_TYPES.includes(item.type))
            if (imageItems.length > 0) {
              e.preventDefault()
              const files = imageItems.map(item => item.getAsFile()).filter((f): f is File => f !== null)
              addFiles(files)
            }
          }}
          placeholder={getPlaceholder(connectionState, isSwitchingModel)}
          disabled={disabled}
          rows={1}
          className="w-full px-4 pt-3.5 pb-2 text-sm bg-transparent resize-none outline-none placeholder:text-muted-foreground/60 disabled:opacity-50 disabled:cursor-not-allowed"
        />
        {attachments.length > 0 && (
          <div className="flex flex-wrap gap-2 px-3 pt-1 pb-2">
            {attachments.map((att, i) => (
              <div key={i} className="relative group">
                <img
                  src={`data:${att.mediaType};base64,${att.base64}`}
                  alt={att.name}
                  className="w-12 h-12 rounded-lg object-cover border border-border"
                />
                <button
                  onClick={() => removeAttachment(i)}
                  className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-foreground text-background rounded-full flex items-center justify-center text-[10px] opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}
        <div className="flex items-center px-3 pb-2.5">
          <button
            onClick={async () => {
              const images = await window.claude?.selectImages()
              if (images && images.length > 0) {
                setAttachments(prev => {
                  const remaining = MAX_IMAGES - prev.length
                  return [...prev, ...images.slice(0, remaining)]
                })
              }
            }}
            disabled={attachments.length >= MAX_IMAGES}
            className="w-[30px] h-[30px] flex items-center justify-center text-muted-foreground hover:text-secondary transition-colors disabled:opacity-30"
          >
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
            onClick={() => { if (!disabled) handleSend() }}
            className="ml-auto w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center hover:opacity-80 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ArrowUp className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  )
}
