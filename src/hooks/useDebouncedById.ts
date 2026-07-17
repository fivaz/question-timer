import { useEffect, useRef } from 'react'

/** Debounce calls keyed by id so parallel block edits do not cancel each other. */
export function useDebouncedById<T>(
  callback: (id: string, value: T) => void,
  delayMs: number,
) {
  const callbackRef = useRef(callback)
  const timersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map())

  useEffect(() => {
    callbackRef.current = callback
  }, [callback])

  useEffect(() => {
    const timers = timersRef.current
    return () => {
      for (const timer of timers.values()) clearTimeout(timer)
      timers.clear()
    }
  }, [])

  return (id: string, value: T) => {
    const existing = timersRef.current.get(id)
    if (existing) clearTimeout(existing)
    const timer = setTimeout(() => {
      timersRef.current.delete(id)
      callbackRef.current(id, value)
    }, delayMs)
    timersRef.current.set(id, timer)
  }
}
