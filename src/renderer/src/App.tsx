export default function App(): React.JSX.Element {
  return (
    <div className="h-screen flex flex-col bg-background text-foreground">
      <div className="h-12 bg-title-bar border-b border-border flex items-center px-4 pl-20">
        <span className="font-semibold text-sm">Claude Code</span>
      </div>
      <div className="flex-1 flex items-center justify-center text-muted-foreground">
        App shell running
      </div>
    </div>
  )
}
