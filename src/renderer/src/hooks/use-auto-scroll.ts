import { useRef, useEffect, useCallback } from 'react'

export function useAutoScroll<T extends HTMLElement>(deps: unknown[]) {
  const ref = useRef<T>(null)
  const isAtBottom = useRef(true)

  const handleScroll = useCallback(() => {
    if (!ref.current) return
    const { scrollTop, scrollHeight, clientHeight } = ref.current
    isAtBottom.current = scrollHeight - scrollTop - clientHeight < 30
  }, [])

  useEffect(() => {
    if (isAtBottom.current && ref.current) {
      ref.current.scrollTop = ref.current.scrollHeight
    }
  }, deps)

  return { ref, onScroll: handleScroll }
}
