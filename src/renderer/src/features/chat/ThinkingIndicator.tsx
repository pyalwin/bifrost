interface Props { seconds: number }

export function ThinkingIndicator({ seconds }: Props) {
  return (
    <div className="text-[13px] text-muted-foreground mb-1.5">
      Thought {seconds}s
    </div>
  )
}
