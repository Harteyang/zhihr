import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import useSpeech from './useSpeech'

// Mock 讯飞 TTS 模块
vi.mock('../utils/iflytek-tts', () => ({
  speakWithIflytek: vi.fn(),
}))

import { speakWithIflytek } from '../utils/iflytek-tts'

describe('useSpeech', () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    // 模拟 SpeechSynthesis
    global.speechSynthesis = {
      cancel: vi.fn(),
      speak: vi.fn(),
      getVoices: vi.fn(() => []),
    }
    global.SpeechSynthesisUtterance = vi.fn(function (text) {
      this.text = text
      this.lang = ''
      this.rate = 1
      this.pitch = 1
      this.volume = 1
      this.voice = null
    })
  })

  afterEach(() => {
    vi.clearAllMocks()
    vi.useRealTimers()
  })

  it('默认启用讯飞 TTS', () => {
    const { result } = renderHook(() => useSpeech())
    expect(result.current.iflytekEnabled).toBe(true)
  })

  it('讯飞成功时直接返回，不调用原生 TTS', async () => {
    speakWithIflytek.mockResolvedValueOnce()
    const { result } = renderHook(() => useSpeech())

    await act(async () => {
      await result.current.speak('你好')
    })

    expect(speakWithIflytek).toHaveBeenCalledWith('你好')
    expect(speechSynthesis.speak).not.toHaveBeenCalled()
    expect(result.current.fallbackLog).toHaveLength(0)
  })

  it('讯飞失败时自动回退到原生 TTS，并记录日志', async () => {
    speakWithIflytek.mockRejectedValueOnce(new Error('network error'))
    const { result } = renderHook(() => useSpeech())

    await act(async () => {
      await result.current.speak('你好')
    })

    // 等待 setTimeout 执行原生 TTS
    act(() => {
      vi.advanceTimersByTime(100)
    })

    expect(speakWithIflytek).toHaveBeenCalledWith('你好')
    expect(speechSynthesis.speak).toHaveBeenCalled()
    expect(result.current.fallbackLog).toHaveLength(1)
    expect(result.current.fallbackLog[0].text).toBe('你好')
    expect(result.current.fallbackLog[0].reason).toBe('network error')
    expect(result.current.fallbackLog[0].autoDisabled).toBe(false)
  })

  it('连续失败 3 次后自动禁用讯飞 TTS', async () => {
    speakWithIflytek.mockRejectedValue(new Error('service unavailable'))
    const { result } = renderHook(() => useSpeech())

    for (let i = 0; i < 3; i++) {
      await act(async () => {
        await result.current.speak(`test${i}`)
      })
      act(() => {
        vi.advanceTimersByTime(100)
      })
    }

    await waitFor(() => {
      expect(result.current.iflytekEnabled).toBe(false)
    })

    expect(result.current.fallbackLog).toHaveLength(3)
    expect(result.current.fallbackLog[0].autoDisabled).toBe(true)
  })

  it('手动禁用讯飞后只使用原生 TTS', async () => {
    const { result } = renderHook(() => useSpeech())

    act(() => {
      result.current.disableIflytek()
    })

    await act(async () => {
      await result.current.speak('你好')
    })

    act(() => {
      vi.advanceTimersByTime(100)
    })

    expect(speakWithIflytek).not.toHaveBeenCalled()
    expect(speechSynthesis.speak).toHaveBeenCalled()
  })

  it('手动重新启用讯飞后重置失败计数', async () => {
    speakWithIflytek.mockRejectedValueOnce(new Error('temp error'))
    const { result } = renderHook(() => useSpeech())

    await act(async () => {
      await result.current.speak('你好')
    })
    act(() => {
      vi.advanceTimersByTime(100)
    })

    act(() => {
      result.current.enableIflytek()
    })

    expect(result.current.iflytekEnabled).toBe(true)
    expect(result.current.iflytekError).toBeNull()

    speakWithIflytek.mockResolvedValueOnce()
    await act(async () => {
      await result.current.speak('世界')
    })

    expect(speakWithIflytek).toHaveBeenLastCalledWith('世界')
  })

  it('清空回退日志', async () => {
    speakWithIflytek.mockRejectedValueOnce(new Error('error'))
    const { result } = renderHook(() => useSpeech())

    await act(async () => {
      await result.current.speak('你好')
    })

    act(() => {
      result.current.clearFallbackLog()
    })

    expect(result.current.fallbackLog).toHaveLength(0)
  })
})
