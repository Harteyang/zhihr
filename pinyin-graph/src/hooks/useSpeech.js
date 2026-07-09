import { useCallback, useEffect, useRef, useState } from 'react'
import { speakWithIflytek } from '../utils/iflytek-tts'

/**
 * useSpeech — 语音合成 Hook
 *
 * 策略：讯飞 TTS 为主要方案；出现任何失败时自动、无缝回退到浏览器原生
 * SpeechSynthesis，并记录失败原因与切换事件供后续分析。
 *
 * 返回值：
 *   speak(text)             — 朗读文本
 *   speakPinyin(pinyin)     — 朗读拼音字符串
 *   stop                    — 停止朗读
 *   supported               — 浏览器是否支持 TTS
 *   voices                  — 可用浏览器原生中文语音列表
 *   currentVoice            — 当前浏览器语音
 *   setVoice(voiceURI)      — 切换浏览器语音
 *   iflytekEnabled          — 讯飞 TTS 是否启用（自动/手动均可控制）
 *   enableIflytek()         — 手动重新启用讯飞 TTS
 *   disableIflytek()        — 手动禁用它并强制使用本地 TTS
 *   fallbackLog             — 回退事件日志数组
 *   clearFallbackLog()      — 清空日志
 *   iflytekError            — 最近一次讯飞错误信息
 */

const DEFAULT_RATE = 0.55
const DEFAULT_PITCH = 1.05
const DEFAULT_VOLUME = 1

// 连续失败阈值：超过此次数后自动禁用讯飞，避免反复失败影响体验
const IFLYTEK_AUTO_DISABLE_THRESHOLD = 3

// 已知真人感较强的中文语音，按优先级排序
const PREFERRED_VOICE_URIS = [
  'com.apple.voice.compact.zh-CN.TingTing', // macOS/iOS Ting-Ting
  'com.apple.voice.super-compact.zh-CN.TingTing',
  'com.apple.speech.synthesis.voice.ting-ting',
  'Microsoft Yaoyao - Chinese (Simplified, PRC)', // Windows
  'Microsoft Xiaoxiao - Chinese (Simplified, PRC)',
  'Microsoft Xiaoyi - Chinese (Simplified, PRC)',
  'Microsoft Yunxi - Chinese (Simplified, PRC)',
  'Microsoft Yunjian - Chinese (Simplified, PRC)',
  'Google 普通话（中国大陆）', // Chrome
  'Google 普通話（香港）',
  'Google 國語（臺灣）',
  'zh-CN', // 通用兜底
  'cmn-Hans-CN',
]

function isChineseVoice(voice) {
  const lang = (voice.lang || '').toLowerCase()
  return (
    lang.startsWith('zh') || lang.startsWith('cmn') || lang.startsWith('cmn-hans') || lang.startsWith('cmn-hant')
  )
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

export default function useSpeech() {
  const utteranceRef = useRef(null)
  const voicesRef = useRef([])
  const currentVoiceRef = useRef(null)
  const iflytekFailCountRef = useRef(0)

  const [voices, setVoices] = useState([])
  const [currentVoice, setCurrentVoice] = useState(null)
  const [iflytekEnabled, setIflytekEnabled] = useState(true)
  const [iflytekError, setIflytekError] = useState(null)
  const [fallbackLog, setFallbackLog] = useState([])

  const supported = typeof window !== 'undefined' && 'speechSynthesis' in window

  const loadVoices = useCallback(() => {
    if (!supported) return
    const allVoices = window.speechSynthesis.getVoices()
    const chineseVoices = allVoices.filter(isChineseVoice)
    chineseVoices.sort((a, b) => scoreVoice(b) - scoreVoice(a))

    voicesRef.current = chineseVoices
    setVoices(chineseVoices)

    if (!currentVoiceRef.current && chineseVoices.length > 0) {
      currentVoiceRef.current = chineseVoices[0]
      setCurrentVoice(chineseVoices[0])
    }
  }, [supported])

  useEffect(() => {
    if (!supported) return
    loadVoices()
    window.speechSynthesis.onvoiceschanged = loadVoices
    return () => {
      window.speechSynthesis.onvoiceschanged = null
    }
  }, [supported, loadVoices])

  const setVoice = useCallback((voiceURI) => {
    const found = voicesRef.current.find((v) => v.voiceURI === voiceURI)
    if (found) {
      currentVoiceRef.current = found
      setCurrentVoice(found)
    }
  }, [])

  const recordFallback = useCallback((text, reason, autoDisabled) => {
    const entry = {
      timestamp: new Date().toISOString(),
      text,
      reason,
      autoDisabled,
    }
    setFallbackLog((prev) => [entry, ...prev].slice(0, 50))
    // 同时输出到控制台，便于开发者排查
    // eslint-disable-next-line no-console
    console.warn('[useSpeech] iFlytek TTS fallback:', entry)
  }, [])

  const enableIflytek = useCallback(() => {
    iflytekFailCountRef.current = 0
    setIflytekEnabled(true)
    setIflytekError(null)
  }, [])

  const disableIflytek = useCallback(() => {
    setIflytekEnabled(false)
    setIflytekError(' manually disabled')
  }, [])

  const clearFallbackLog = useCallback(() => {
    setFallbackLog([])
  }, [])

  const stop = useCallback(() => {
    if (supported) {
      window.speechSynthesis.cancel()
    }
  }, [supported])

  const speakNative = useCallback(
    (text) => {
      if (!supported || !text) return

      window.speechSynthesis.cancel()

      setTimeout(() => {
        const utterance = new SpeechSynthesisUtterance(text)
        utterance.lang = 'zh-CN'
        utterance.rate = DEFAULT_RATE
        utterance.pitch = DEFAULT_PITCH
        utterance.volume = DEFAULT_VOLUME

        if (currentVoiceRef.current) {
          utterance.voice = currentVoiceRef.current
        }

        utteranceRef.current = utterance
        window.speechSynthesis.speak(utterance)
      }, 50)
    },
    [supported]
  )

  const speak = useCallback(
    async (text) => {
      if (!text) return

      if (iflytekEnabled) {
        try {
          await speakWithIflytek(text)
          // 成功一次后重置连续失败计数
          if (iflytekFailCountRef.current > 0) {
            iflytekFailCountRef.current = 0
          }
          setIflytekError(null)
          return
        } catch (err) {
          const reason = err instanceof Error ? err.message : String(err)
          iflytekFailCountRef.current += 1
          setIflytekError(reason)

          // 超过阈值则自动禁用讯飞，避免反复失败影响体验
          const shouldAutoDisable = iflytekFailCountRef.current >= IFLYTEK_AUTO_DISABLE_THRESHOLD
          if (shouldAutoDisable) {
            setIflytekEnabled(false)
          }

          recordFallback(text, reason, shouldAutoDisable)
          speakNative(text)
        }
      } else {
        speakNative(text)
      }
    },
    [iflytekEnabled, speakNative, recordFallback]
  )

  const speakPinyin = useCallback(
    (pinyin) => {
      speak(pinyin)
    },
    [speak]
  )

  return {
    speak,
    speakPinyin,
    stop,
    supported,
    voices,
    currentVoice,
    setVoice,
    iflytekEnabled,
    enableIflytek,
    disableIflytek,
    fallbackLog,
    clearFallbackLog,
    iflytekError,
  }
}
