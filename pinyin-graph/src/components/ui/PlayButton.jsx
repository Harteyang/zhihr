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
    sm: 'w-7 h-7 text-sm',
    md: 'w-9 h-9 text-base',
    lg: 'w-11 h-11 text-lg',
  }

  return (
    <button
      onClick={handleClick}
      className={`
        inline-flex items-center justify-center rounded-full
        transition-all duration-150
        ${playing
          ? 'bg-blue-100 text-blue-500 animate-pulse ring-2 ring-blue-300'
          : 'bg-gray-100 text-gray-500 hover:bg-gray-200 hover:text-gray-700'
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