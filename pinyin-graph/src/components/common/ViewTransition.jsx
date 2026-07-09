/**
 * ViewTransition — 视图切换淡入淡出容器
 * 切换 viewKey 时：opacity 1→0 等待 300ms，再挂载新 children、opacity 0→1
 */
import { useState, useEffect, useRef } from 'react'

export const TRANSITION_DURATION = 300

export default function ViewTransition({ viewKey, children }) {
  const [shown, setShown] = useState(viewKey)
  const [opacity, setOpacity] = useState(1)
  const [ready, setReady] = useState(true)
  const timerRef = useRef(null)

  useEffect(() => {
    if (viewKey === shown) return
    setOpacity(0)
    setReady(false)
    timerRef.current = setTimeout(() => {
      setShown(viewKey)
      setOpacity(1)
      setReady(true)
    }, TRANSITION_DURATION)
    return () => clearTimeout(timerRef.current)
  }, [viewKey, shown])

  return (
    <div
      className="transition-opacity ease-out"
      style={{
        opacity,
        transitionDuration: `${TRANSITION_DURATION}ms`,
      }}
      aria-busy={!ready}
    >
      {children}
    </div>
  )
}
