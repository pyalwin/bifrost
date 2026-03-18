import { useEffect } from 'react'
import { useTheme } from './hooks/use-theme'
import { TitleBar } from './features/title-bar/TitleBar'

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
      <TitleBar
        branch="feature/codex-cta"
        theme={theme}
        onToggleTheme={toggleTheme}
      />
      <div className="flex-1 flex items-center justify-center text-muted-foreground">
        Panels go here
      </div>
    </div>
  )
}
