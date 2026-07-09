/**
 * PlayButton — 发音按钮
 */
import { useState, useCallback } from 'react'

export default function PlayButton({ onPlay, size = 'md', className = '' }) {
  const [playing, setPlaying] = useState(false)

  const handleClick = useCallback(() => {
    setPlaying(true)
    onPlay?.()
    // 1 秒后恢复状态
    setTimeout(() => setPlaying(false), 1000)
  }, [onPlay])

  const sizeClasses = {
    sm: 'w-7 h-7 text-caption',
    md: 'w-9 h-9 text-body',
    lg: 'w-11 h-11 text-h3',
  }

  return (
    <button
      onClick={handleClick}
      className={`
        inline-flex items-center justify-center rounded-full
        transition-all duration-150
        ${playing
          ? 'bg-state-info/10 text-state-info animate-pulse ring-2 ring-state-info/30'
          : 'bg-surface text-content-secondary hover:bg-divider hover:text-content-primary'
        }
        ${sizeClasses[size]}
        ${className}
      `}
      title="播放发音"
    >
      {playing ? '🔊' : '▶'}
    </button>
  )
}