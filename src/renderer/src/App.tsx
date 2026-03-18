import { useEffect } from 'react'
import { useTheme } from './hooks/use-theme'

export default function App() {
  const { theme, toggleTheme } = useTheme()

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'd') {
        e.preventDefault()
        toggleTheme()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [toggleTheme])

  return (
    <div className="h-screen flex flex-col bg-background text-foreground">
      <div className="h-12 bg-title-bar border-b border-border flex items-center px-4 pl-20">
        <span className="font-semibold text-sm">Claude Code</span>
        <button onClick={toggleTheme} className="ml-auto text-sm">
          {theme === 'light' ? '☀️' : '🌙'}
        </button>
      </div>
      <div className="flex-1 flex items-center justify-center text-muted-foreground">
        Theme: {theme}
      </div>
    </div>
  )
}
