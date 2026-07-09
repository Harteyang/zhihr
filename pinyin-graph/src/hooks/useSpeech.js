import { useCallback, useEffect, useRef, useState } from 'react'

/**
 * useSpeech — 封装浏览器原生 SpeechSynthesis API
 *
 * 功能特性：
 * 1. 语速降至更慢（rate ~0.65），适合儿童学习
 * 2. 自动选择最接近真人的中文语音
 * 3. 提供完整的播放控制：播放、暂停、继续、停止
 * 4. 语音 fallback 链，确保在各种设备上都能发声
 * 5. 播放超时保护和自动重试机制
 * 6. 音量边界钳制，避免无声问题
 *
 * 返回值：
 *   speak(text)        — 朗读文本
 *   speakPinyin(pinyin) — 朗读拼音字符串
 *   pause              — 暂停朗读
 *   resume             — 继续朗读
 *   stop               — 停止朗读
 *   speaking           — 是否正在播放
 *   paused             — 是否处于暂停状态
 *   supported          — 浏览器是否支持
 *   voices             — 可用中文语音列表
 *   currentVoice       — 当前使用的语音
 *   setVoice(voiceURI) — 切换指定语音
 */

const DEFAULT_RATE = 0.65
const DEFAULT_PITCH = 1.05
const DEFAULT_VOLUME = 1
const PLAYBACK_TIMEOUT = 30000
const MIN_VOICE_READY_DELAY = 100

// 已知真人感较强的中文语音，按优先级排序
const PREFERRED_VOICE_URIS = [
  'com.apple.voice.compact.zh-CN.TingTing',      // macOS/iOS Ting-Ting
  'com.apple.voice.super-compact.zh-CN.TingTing',
  'com.apple.speech.synthesis.voice.ting-ting',
  'Microsoft Yaoyao - Chinese (Simplified, PRC)', // Windows
  'Microsoft Xiaoxiao - Chinese (Simplified, PRC)',
  'Microsoft Xiaoyi - Chinese (Simplified, PRC)',
  'Microsoft Yunxi - Chinese (Simplified, PRC)',
  'Microsoft Yunjian - Chinese (Simplified, PRC)',
  'Google 普通话（中国大陆）',                    // Chrome
  'Google 普通話（香港）',
  'Google 國語（臺灣）',
  'zh-CN',                                        // 通用兜底
  'cmn-Hans-CN',
]

function isChineseVoice(voice) {
  const lang = (voice.lang || '').toLowerCase()
  return lang.startsWith('zh') || lang.startsWith('cmn') || lang.startsWith('cmn-hans') || lang.startsWith('cmn-hant')
}

function scoreVoice(voice) {
  const uri = voice.voiceURI || ''
  const name = voice.name || ''
  const combined = `${uri} ${name}`.toLowerCase()

  for (let i = 0; i < PREFERRED_VOICE_URIS.length; i++) {
    const pref = PREFERRED_VOICE_URIS[i].toLowerCase()
    if (combined.includes(pref)) return PREFERRED_VOICE_URIS.length - i
  }
  return 0
}

function selectBestVoice(voices) {
  if (!voices || voices.length === 0) return null
  
  const sorted = [...voices].sort((a, b) => scoreVoice(b) - scoreVoice(a))
  return sorted[0] || null
}

export default function useSpeech() {
  const utteranceRef = useRef(null)
  const voicesRef = useRef([])
  const currentVoiceRef = useRef(null)
  const retryCountRef = useRef(0)
  const timeoutRef = useRef(null)
  const [voices, setVoices] = useState([])
  const [currentVoice, setCurrentVoice] = useState(null)
  const [speaking, setSpeaking] = useState(false)
  const [paused, setPaused] = useState(false)

  const supported = typeof window !== 'undefined' && 'speechSynthesis' in window

  const loadVoices = useCallback(() => {
    if (!supported) return
    const allVoices = window.speechSynthesis.getVoices()
    const chineseVoices = allVoices.filter(isChineseVoice)
    chineseVoices.sort((a, b) => scoreVoice(b) - scoreVoice(a))

    voicesRef.current = chineseVoices
    setVoices(chineseVoices)

    if (!currentVoiceRef.current && chineseVoices.length > 0) {
      const best = selectBestVoice(chineseVoices)
      currentVoiceRef.current = best
      setCurrentVoice(best)
    }
  }, [supported])

  useEffect(() => {
    if (!supported) return
    loadVoices()
    window.speechSynthesis.onvoiceschanged = loadVoices
    return () => {
      window.speechSynthesis.onvoiceschanged = null
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [supported, loadVoices])

  const setVoice = useCallback((voiceURI) => {
    const found = voicesRef.current.find((v) => v.voiceURI === voiceURI)
    if (found) {
      currentVoiceRef.current = found
      setCurrentVoice(found)
    }
  }, [])

  const clearTimeoutRef = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
      timeoutRef.current = null
    }
  }, [])

  const setupUtteranceEvents = useCallback((utterance, text) => {
    utterance.onstart = () => {
      setSpeaking(true)
      setPaused(false)
      retryCountRef.current = 0
      clearTimeoutRef()
      timeoutRef.current = setTimeout(() => {
        window.speechSynthesis.cancel()
        setSpeaking(false)
      }, PLAYBACK_TIMEOUT)
    }

    utterance.onend = () => {
      setSpeaking(false)
      setPaused(false)
      clearTimeoutRef()
    }

    utterance.onpause = () => {
      setPaused(true)
    }

    utterance.onresume = () => {
      setPaused(false)
    }

    utterance.onerror = (event) => {
      setSpeaking(false)
      setPaused(false)
      clearTimeoutRef()

      if (retryCountRef.current < 2) {
        retryCountRef.current++
        const fallbackVoice = selectBestVoice(voicesRef.current)
        if (fallbackVoice && fallbackVoice.voiceURI !== (currentVoiceRef.current?.voiceURI)) {
          currentVoiceRef.current = fallbackVoice
          setCurrentVoice(fallbackVoice)
          setTimeout(() => speak(text), 100)
        }
      }
    }
  }, [clearTimeoutRef])

  const speak = useCallback(
    (text) => {
      if (!supported || !text) return

      clearTimeoutRef()

      const isSpeaking = window.speechSynthesis.speaking
      const isPending = window.speechSynthesis.pending

      if (isSpeaking || isPending) {
        window.speechSynthesis.cancel()
      }

      setTimeout(() => {
        const utterance = new SpeechSynthesisUtterance(text)
        utterance.lang = 'zh-CN'
        utterance.rate = Math.max(0.1, Math.min(2, DEFAULT_RATE))
        utterance.pitch = Math.max(0.5, Math.min(2, DEFAULT_PITCH))
        utterance.volume = Math.max(0, Math.min(1, DEFAULT_VOLUME))

        if (!currentVoiceRef.current && voicesRef.current.length > 0) {
          currentVoiceRef.current = selectBestVoice(voicesRef.current)
          setCurrentVoice(currentVoiceRef.current)
        }

        if (currentVoiceRef.current) {
          utterance.voice = currentVoiceRef.current
        }

        setupUtteranceEvents(utterance, text)

        utteranceRef.current = utterance
        window.speechSynthesis.speak(utterance)
      }, MIN_VOICE_READY_DELAY)
    },
    [supported, setupUtteranceEvents, clearTimeoutRef]
  )

  const speakPinyin = useCallback(
    (pinyin) => {
      speak(pinyin)
    },
    [speak]
  )

  const pause = useCallback(() => {
    if (supported && window.speechSynthesis.speaking) {
      window.speechSynthesis.pause()
    }
  }, [supported])

  const resume = useCallback(() => {
    if (supported && window.speechSynthesis.paused) {
      window.speechSynthesis.resume()
    }
  }, [supported])

  const stop = useCallback(() => {
    if (supported) {
      window.speechSynthesis.cancel()
      setSpeaking(false)
      setPaused(false)
      clearTimeoutRef()
    }
  }, [supported, clearTimeoutRef])

  return {
    speak,
    speakPinyin,
    pause,
    resume,
    stop,
    speaking,
    paused,
    supported,
    voices,
    currentVoice,
    setVoice,
  }
}
