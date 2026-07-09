import { useCallback, useEffect, useRef, useState } from 'react'

/**
 * useSpeech — 封装浏览器原生 SpeechSynthesis API
 *
 * 优化目标：
 * 1. 语速降至更慢（rate ~0.55），适合儿童学习
 * 2. 自动选择最接近真人的中文语音
 * 3. 提供可用语音列表和当前选中语音
 *
 * 返回值：
 *   speak(text)        — 朗读文本
 *   speakPinyin(pinyin) — 朗读拼音字符串
 *   stop               — 停止朗读
 *   supported          — 浏览器是否支持
 *   voices             — 可用中文语音列表
 *   currentVoice       — 当前使用的语音
 *   setVoice(voiceURI) — 切换指定语音
 */

const DEFAULT_RATE = 0.65
const DEFAULT_PITCH = 1.05
const DEFAULT_VOLUME = 1

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

export default function useSpeech() {
  const utteranceRef = useRef(null)
  const voicesRef = useRef([])
  const currentVoiceRef = useRef(null)
  const [voices, setVoices] = useState([])
  const [currentVoice, setCurrentVoice] = useState(null)

  const supported = typeof window !== 'undefined' && 'speechSynthesis' in window

  const loadVoices = useCallback(() => {
    if (!supported) return
    const allVoices = window.speechSynthesis.getVoices()
    const chineseVoices = allVoices.filter(isChineseVoice)
    // 按真人感优先级排序
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
    // Chrome 语音是异步加载的
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

  const speak = useCallback(
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

  const speakPinyin = useCallback(
    (pinyin) => {
      speak(pinyin)
    },
    [speak]
  )

  const stop = useCallback(() => {
    if (supported) {
      window.speechSynthesis.cancel()
    }
  }, [supported])

  return { speak, speakPinyin, stop, supported, voices, currentVoice, setVoice }
}
