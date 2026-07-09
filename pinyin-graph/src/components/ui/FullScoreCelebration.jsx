import { useEffect, useState } from 'react'

const COLORS = ['#ff6b6b', '#feca57', '#48dbfb', '#1dd1a1', '#ff9ff3', '#54a0ff']

function createConfetti(count = 120) {
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    y: -10 - Math.random() * 30,
    size: 6 + Math.random() * 10,
    color: COLORS[Math.floor(Math.random() * COLORS.length)],
    rotation: Math.random() * 360,
    rotationSpeed: (Math.random() - 0.5) * 12,
    fallSpeed: 2 + Math.random() * 4,
    sway: (Math.random() - 0.5) * 3,
    delay: Math.random() * 1.5,
  }))
}

function createFireworks(count = 5) {
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    x: 15 + Math.random() * 70,
    y: 20 + Math.random() * 40,
    color: COLORS[Math.floor(Math.random() * COLORS.length)],
    delay: i * 0.6 + Math.random() * 0.4,
  }))
}

export default function FullScoreCelebration({ duration = 4500, onComplete }) {
  const [visible, setVisible] = useState(true)
  const [confetti, setConfetti] = useState(() => createConfetti())
  const [fireworks] = useState(() => createFireworks())
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
          y: c.y + c.fallSpeed * 0.12,
          x: c.x + Math.sin(elapsed / 400 + c.id) * c.sway * 0.08,
          rotation: c.rotation + c.rotationSpeed * 0.04,
          opacity: Math.max(0, 1 - elapsed / duration),
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
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-hidden bg-black/40 backdrop-blur-sm">
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
            boxShadow: `0 0 6px ${c.color}`,
          }}
        />
      ))}

      {/* 烟花 */}
      {fireworks.map(fw => {
        const active = progress * duration / 1000 >= fw.delay && progress * duration / 1000 < fw.delay + 0.8
        const fwProgress = active ? Math.min(1, (progress * duration / 1000 - fw.delay) / 0.8) : 0
        return (
          <div
            key={fw.id}
            className="absolute"
            style={{
              left: `${fw.x}%`,
              top: `${fw.y}%`,
              opacity: fwProgress,
              transform: `scale(${fwProgress})`,
            }}
          >
            {[...Array(12)].map((_, i) => (
              <div
                key={i}
                className="absolute w-2 h-2 rounded-full"
                style={{
                  backgroundColor: fw.color,
                  transform: `rotate(${i * 30}deg) translateX(${fwProgress * 80}px)`,
                  boxShadow: `0 0 8px ${fw.color}`,
                }}
              />
            ))}
          </div>
        )
      })}

      {/* 中央庆祝内容 */}
      <div
        className="relative z-10 text-center px-6"
        style={{
          transform: `scale(${Math.min(1, progress * 3)})`,
          opacity: progress < 0.9 ? 1 : 1 - (progress - 0.9) / 0.1,
        }}
      >
        <div className="text-8xl mb-4 animate-bounce">🏆</div>
        <h2 className="text-4xl md:text-6xl font-bold text-white mb-3 drop-shadow-lg">
          满分！
        </h2>
        <p className="text-xl md:text-2xl text-yellow-300 font-medium drop-shadow-md">
          太棒了，全部答对！
        </p>
        <div className="mt-6 flex justify-center gap-2">
          {[...Array(5)].map((_, i) => (
            <span
              key={i}
              className="text-3xl"
              style={{
                animation: `starPop 0.6s ease-out ${i * 0.15}s infinite alternate`,
              }}
            >
              ⭐
            </span>
          ))}
        </div>
      </div>

      <style>{`
        @keyframes starPop {
          0% { transform: scale(0.8); opacity: 0.6; }
          100% { transform: scale(1.3); opacity: 1; }
        }
      `}</style>
    </div>
  )
}
