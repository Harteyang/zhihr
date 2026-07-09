import { useEffect, useState } from 'react'

const COLORS = ['#4ade80', '#22c55e', '#16a34a', '#86efac', '#facc15', '#60a5fa']

function createConfetti(count = 24) {
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    x: 50 + (Math.random() - 0.5) * 60,
    y: 50 + (Math.random() - 0.5) * 40,
    vx: (Math.random() - 0.5) * 12,
    vy: -8 - Math.random() * 8,
    size: 4 + Math.random() * 6,
    color: COLORS[Math.floor(Math.random() * COLORS.length)],
    rotation: Math.random() * 360,
    rotationSpeed: (Math.random() - 0.5) * 20,
  }))
}

export default function SuccessFeedback({ duration = 1200, onComplete }) {
  const [visible, setVisible] = useState(true)
  const [confetti, setConfetti] = useState(() => createConfetti())
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    const startTime = Date.now()
    let rafId

    const animate = () => {
      const elapsed = Date.now() - startTime
      const p = Math.min(1, elapsed / duration)
      setProgress(p)

      setConfetti(prev =>
        prev.map(c => ({
          ...c,
          x: c.x + c.vx * 0.04,
          y: c.y + c.vy * 0.04,
          vy: c.vy + 0.35,
          rotation: c.rotation + c.rotationSpeed * 0.04,
          opacity: 1 - p,
        }))
      )

      if (elapsed < duration) {
        rafId = requestAnimationFrame(animate)
      } else {
        setVisible(false)
        onComplete?.()
      }
    }

    rafId = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(rafId)
  }, [duration, onComplete])

  if (!visible) return null

  return (
    <div className="fixed inset-0 pointer-events-none z-40 flex items-center justify-center">
      {/* 对勾 */}
      <div
        className="relative z-10 flex items-center justify-center w-24 h-24 rounded-full bg-green-500 shadow-lg"
        style={{
          transform: `scale(${Math.min(1, progress * 2)})`,
          opacity: progress < 0.85 ? 1 : 1 - (progress - 0.85) / 0.15,
          boxShadow: '0 0 40px rgba(34, 197, 94, 0.5)',
        }}
      >
        <svg
          className="w-14 h-14 text-white"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path
            d="M5 13l4 4L19 7"
            style={{
              strokeDasharray: 24,
              strokeDashoffset: Math.max(0, 24 - progress * 48),
            }}
          />
        </svg>
      </div>

      {/* 彩带 */}
      {confetti.map(c => (
        <div
          key={c.id}
          className="absolute rounded-sm"
          style={{
            left: `${c.x}%`,
            top: `${c.y}%`,
            width: `${c.size}px`,
            height: `${c.size}px`,
            backgroundColor: c.color,
            transform: `rotate(${c.rotation}deg)`,
            opacity: c.opacity,
          }}
        />
      ))}
    </div>
  )
}
