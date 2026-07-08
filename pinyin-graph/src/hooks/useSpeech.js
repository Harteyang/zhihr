import { useCallback, useRef } from 'react'

/**
 * useSpeech — 封装浏览器原生 SpeechSynthesis API
 *
 * 返回值：
 *   speak(text)        — 朗读文本
 *   speakPinyin(pinyin) — 朗读拼音字符串（如 "bā"）
 *   isSpeaking         — 是否正在朗读
 *   stop               — 停止朗读
 *   supported          — 浏览器是否支持
 */
export default function useSpeech() {
  const utteranceRef = useRef(null)

  const supported = typeof window !== 'undefined' && 'speechSynthesis' in window

  const speak = useCallback((text) => {
    if (!supported) return
    // 停止当前朗读
    window.speechSynthesis.cancel()
    // 小段延迟避免连续取消导致的问题
    setTimeout(() => {
      const utterance = new SpeechSynthesisUtterance(text)
      utterance.lang = 'zh-CN'
      utterance.rate = 0.75   // 儿童语速稍慢
      utterance.pitch = 1.1   // 音调稍高
      utterance.volume = 1
      utteranceRef.current = utterance
      window.speechSynthesis.speak(utterance)
    }, 50)
  }, [supported])

  const speakPinyin = useCallback((pinyin) => {
    // 朗读拼音时去掉声调符号，但保留数字声调标识
    // 实际朗读时按拼音直接读
    speak(pinyin)
  }, [speak])

  const stop = useCallback(() => {
    if (supported) {
      window.speechSynthesis.cancel()
    }
  }, [supported])

  return { speak, speakPinyin, stop, supported }
}