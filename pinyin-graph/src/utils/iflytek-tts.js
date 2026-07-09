/**
 * 讯飞 TTS 前端调用封装
 *
 * 通过本地 dev server 代理 /api/tts?text=xxx 请求讯飞合成服务，
 * 避免将 API 密钥暴露到前端。
 */

const TTS_PROXY_URL = '/api/tts'

/**
 * 调用讯飞 TTS 合成文本并播放
 * @param {string} text - 需要朗读的文本
 * @returns {Promise<HTMLAudioElement>} 返回正在播放的 audio 元素
 */
export async function speakWithIflytek(text) {
  if (!text) return null

  const url = new URL(TTS_PROXY_URL, window.location.origin)
  url.searchParams.set('text', text)

  const response = await fetch(url.toString())
  if (!response.ok) {
    const err = await response.json().catch(() => ({ error: 'TTS request failed' }))
    throw new Error(err.error || `TTS request failed: ${response.status}`)
  }

  const blob = await response.blob()
  const audioUrl = URL.createObjectURL(blob)
  const audio = new Audio(audioUrl)

  return new Promise((resolve, reject) => {
    audio.onended = () => {
      URL.revokeObjectURL(audioUrl)
      resolve(audio)
    }
    audio.onerror = () => {
      URL.revokeObjectURL(audioUrl)
      reject(new Error('Audio playback failed'))
    }
    audio.play().catch(reject)
  })
}

/**
 * 检查讯飞 TTS 是否可用（仅检测代理是否配置，不保证网络）
 */
export async function checkIflytekAvailable() {
  try {
    const response = await fetch('/api/tts?text=test', { method: 'HEAD' })
    return response.status !== 503
  } catch {
    return false
  }
}
