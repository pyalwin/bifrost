import { useEffect } from 'react'
import { useTheme } from './hooks/use-theme'
import { TitleBar } from './features/title-bar/TitleBar'
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle
} from './components/ui/resizable'

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
      <ResizablePanelGroup direction="horizontal" className="flex-1">
        <ResizablePanel defaultSize={46} minSize={25}>
          <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
            Chat Panel
          </div>
        </ResizablePanel>
        <ResizableHandle withHandle />
        <ResizablePanel defaultSize={54} minSize={30}>
          <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
            Diff Panel
          </div>
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  )
}
