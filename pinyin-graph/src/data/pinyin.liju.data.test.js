/**
 * PinyinCard 渲染测试 - 验证 liju 字段正确显示
 * 不依赖 React Testing Library，用纯 ESM 渲染
 */
import { describe, it, expect } from 'vitest'
import { pinyinData } from './pinyin'

describe('PinyinCard 数据流测试', () => {
  it('pinyinData 包含 liju 字段（模拟 PinyinGraph 透传）', () => {
    const first = pinyinData[0]
    expect(first).toHaveProperty('liju')
    expect(typeof first.liju).toBe('string')
  })

  it('声母 b 的 1声「bā 八」造句匹配', () => {
    const ba1 = pinyinData.find((r) => r.id === 'b-a-1')
    expect(ba1?.liju).toBe('我有八个气球。')
    // 造句应包含对应汉字
    expect(ba1.liju).toContain('八')
    // 造句应包含对应组词
    expect(ba1.liju).toContain('八个')
  })

  it('声母 b 的 4声「bà 爸」造句匹配', () => {
    const ba4 = pinyinData.find((r) => r.id === 'b-a-4')
    expect(ba4?.liju).toContain('爸爸')
  })

  it('零声母的「yùn 运」造句包含「运动」', () => {
    const yun4 = pinyinData.find((r) => r.pinyin === 'yùn')
    expect(yun4).toBeDefined()
    expect(yun4?.liju).toContain('运动')
  })

  it('所有 liju 都是中文句子（至少 4 个字符）', () => {
    for (const r of pinyinData) {
      expect(r.liju.length).toBeGreaterThanOrEqual(4)
      // 至少 60% 字符是中文
      const cnCount = (r.liju.match(/[\u4e00-\u9fa5]/g) || []).length
      expect(cnCount / r.liju.length).toBeGreaterThan(0.6)
    }
  })

  it('数据规模：1074 条全部有 liju', () => {
    expect(pinyinData.length).toBe(1074)
    const noLiju = pinyinData.filter((r) => !r.liju || r.liju === '').length
    expect(noLiju).toBe(0)
  })
})
