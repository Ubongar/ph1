import { useEffect, useRef } from 'react'

export function useSimulatedPolling(intervalMs: number, callback: () => void): void {
  const callbackRef = useRef(callback)

  useEffect(() => {
    callbackRef.current = callback
  })

  useEffect(() => {
    const id = setInterval(() => callbackRef.current(), intervalMs)
    return () => clearInterval(id)
  }, [intervalMs])
}
