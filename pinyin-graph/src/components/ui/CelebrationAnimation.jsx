import { useEffect, useState, useRef } from 'react'

const COLORS = ['#ff6b6b', '#4ecdc4', '#45b7d1', '#96ceb4', '#ffeaa7', '#dfe6e9', '#fd79a8', '#a29bfe']

function createConfetti(count = 50) {
  const confetti = []
  for (let i = 0; i < count; i++) {
    confetti.push({
      id: i,
      x: Math.random() * 100,
      y: -10 - Math.random() * 20,
      size: 6 + Math.random() * 8,
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      rotation: Math.random() * 360,
      rotationSpeed: (Math.random() - 0.5) * 10,
      fallSpeed: 2 + Math.random() * 3,
      sway: (Math.random() - 0.5) * 2,
      delay: Math.random() * 2,
    })
  }
  return confetti
}

export default function CelebrationAnimation({ duration = 5000, onComplete }) {
  const [confetti, setConfetti] = useState([])
  const [isVisible, setIsVisible] = useState(true)
  const animationRef = useRef(null)
  const startTimeRef = useRef(null)

  useEffect(() => {
    setConfetti(createConfetti(80))
    startTimeRef.current = Date.now()

    const animate = () => {
      const elapsed = Date.now() - startTimeRef.current
      
      if (elapsed >= duration) {
        setIsVisible(false)
        setTimeout(() => {
          onComplete?.()
        }, 500)
        return
      }

      setConfetti(prev => prev.map(p => ({
        ...p,
        y: p.y + p.fallSpeed * 0.15,
        x: p.x + Math.sin(elapsed / 500 + p.id) * p.sway * 0.1,
        rotation: p.rotation + p.rotationSpeed * 0.5,
        opacity: Math.max(0, 1 - elapsed / duration),
      })))

      animationRef.current = requestAnimationFrame(animate)
    }

    animationRef.current = requestAnimationFrame(animate)

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
    }
  }, [duration, onComplete])

  if (!isVisible) return null

  return (
    <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
      {confetti.map(p => (
        <div
          key={p.id}
          className="absolute rounded-sm"
          style={{
            left: `${p.x}%`,
            top: `${p.y}%`,
            width: `${p.size}px`,
            height: `${p.size}px`,
            backgroundColor: p.color,
            transform: `rotate(${p.rotation}deg)`,
            opacity: p.opacity,
            transition: 'opacity 0.5s ease-out',
            boxShadow: `0 0 4px ${p.color}`,
          }}
        />
      ))}
      
      <div className="absolute inset-0 pointer-events-none">
        {[...Array(20)].map((_, i) => (
          <div
            key={`sparkle-${i}`}
            className="absolute text-yellow-300"
            style={{
              left: `${10 + Math.random() * 80}%`,
              top: `${10 + Math.random() * 80}%`,
              animation: `sparkle 1s ease-in-out ${Math.random() * 2}s infinite`,
              fontSize: `${16 + Math.random() * 20}px`,
            }}
          >
            ✨
          </div>
        ))}
      </div>

      <style>{`
        @keyframes sparkle {
          0%, 100% { opacity: 0; transform: scale(0.5); }
          50% { opacity: 1; transform: scale(1.2); }
        }
      `}</style>
    </div>
  )
}