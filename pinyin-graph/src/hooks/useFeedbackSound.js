import { useCallback, useRef, useState, useEffect } from 'react'

const DEFAULT_VOLUME = 0.6
const STORAGE_KEY = 'pinyin-feedback-sound-enabled'
const STORAGE_VOLUME_KEY = 'pinyin-feedback-sound-volume'

/**
 * useFeedbackSound — 练习反馈音效
 *
 * 提供：
 * - playCorrectSound()：短促正确答案提示音
 * - playVictorySound()：满分庆祝背景音乐
 * - stopVictorySound()：停止背景音乐
 * - enabled：音效开关状态
 * - toggle()：切换开关
 * - volume：音量 0-1
 * - setVolume(v)：设置音量
 */
export default function useFeedbackSound() {
  const [enabled, setEnabled] = useState(() => {
    if (typeof window === 'undefined') return true
    const stored = window.localStorage.getItem(STORAGE_KEY)
    return stored === null ? true : stored === 'true'
  })

  const [volume, setVolumeState] = useState(() => {
    if (typeof window === 'undefined') return DEFAULT_VOLUME
    const stored = window.localStorage.getItem(STORAGE_VOLUME_KEY)
    return stored ? Math.max(0, Math.min(1, parseFloat(stored))) : DEFAULT_VOLUME
  })

  const audioCtxRef = useRef(null)
  const victoryOscRef = useRef(null)
  const victoryGainRef = useRef(null)
  const victoryTimeoutRef = useRef(null)

  useEffect(() => {
    if (typeof window === 'undefined') return
    window.localStorage.setItem(STORAGE_KEY, String(enabled))
  }, [enabled])

  useEffect(() => {
    if (typeof window === 'undefined') return
    window.localStorage.setItem(STORAGE_VOLUME_KEY, String(volume))
  }, [volume])

  const getAudioContext = useCallback(() => {
    if (!audioCtxRef.current) {
      const AC = window.AudioContext || /** @type {any} */ (window).webkitAudioContext
      if (!AC) return null
      audioCtxRef.current = new AC()
    }
    if (audioCtxRef.current.state === 'suspended') {
      audioCtxRef.current.resume()
    }
    return audioCtxRef.current
  }, [])

  const playCorrectSound = useCallback(() => {
    if (!enabled) return
    const ctx = getAudioContext()
    if (!ctx) return

    const now = ctx.currentTime
    const duration = 0.55
    const notes = [523.25, 659.25, 783.99] // C5, E5, G5

    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = 'sine'
      osc.frequency.setValueAtTime(freq, now + i * 0.08)
      gain.gain.setValueAtTime(0, now + i * 0.08)
      gain.gain.linearRampToValueAtTime(volume * 0.25, now + i * 0.08 + 0.03)
      gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.08 + 0.18)
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.start(now + i * 0.08)
      osc.stop(now + i * 0.08 + 0.2)
    })
  }, [enabled, volume, getAudioContext])

  const stopVictorySound = useCallback(() => {
    if (victoryOscRef.current) {
      try {
        victoryOscRef.current.stop()
      } catch {}
      victoryOscRef.current = null
    }
    if (victoryGainRef.current) {
      try {
        const ctx = audioCtxRef.current
        if (ctx) {
          victoryGainRef.current.gain.cancelScheduledValues(ctx.currentTime)
          victoryGainRef.current.gain.setValueAtTime(victoryGainRef.current.gain.value, ctx.currentTime)
          victoryGainRef.current.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5)
        }
      } catch {}
      victoryGainRef.current = null
    }
    if (victoryTimeoutRef.current) {
      clearTimeout(victoryTimeoutRef.current)
      victoryTimeoutRef.current = null
    }
  }, [])

  const playVictorySound = useCallback(() => {
    if (!enabled) return
    stopVictorySound()

    const ctx = getAudioContext()
    if (!ctx) return

    const now = ctx.currentTime
    const melodyDuration = 4.5
    const baseFreq = 523.25 // C5
    const melody = [0, 4, 7, 12, 7, 4, 0, 12]

    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = 'triangle'

    melody.forEach((semi, i) => {
      const freq = baseFreq * Math.pow(2, semi / 12)
      const time = now + i * 0.5
      osc.frequency.setValueAtTime(freq, time)
    })

    gain.gain.setValueAtTime(0, now)
    gain.gain.linearRampToValueAtTime(volume * 0.18, now + 0.2)
    gain.gain.setValueAtTime(volume * 0.18, now + melodyDuration - 0.5)
    gain.gain.exponentialRampToValueAtTime(0.001, now + melodyDuration)

    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.start(now)
    osc.stop(now + melodyDuration)

    victoryOscRef.current = osc
    victoryGainRef.current = gain

    victoryTimeoutRef.current = setTimeout(() => {
      victoryOscRef.current = null
      victoryGainRef.current = null
    }, melodyDuration * 1000)
  }, [enabled, volume, getAudioContext, stopVictorySound])

  const toggle = useCallback(() => {
    setEnabled(prev => !prev)
  }, [])

  const setVolume = useCallback((v) => {
    setVolumeState(Math.max(0, Math.min(1, v)))
  }, [])

  return {
    enabled,
    volume,
    toggle,
    setVolume,
    playCorrectSound,
    playVictorySound,
    stopVictorySound,
  }
}
