import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, resolve } from 'path'

// 通过直接解析数据文件验证 liju 字段
const __dirname = dirname(fileURLToPath(import.meta.url))
const dataFile = resolve(__dirname, '../data/pinyin.js')
const content = readFileSync(dataFile, 'utf-8')

describe('liju 字段数据完整性', () => {
  // 用正则提取所有 liju 字段值
  const lijuMatches = content.match(/"liju":\s*"((?:[^"\\]|\\.)*)"/g) || []

  it('每条数据都包含 liju 字段', () => {
    // pinyinData 共 1074 条（不含 byShengmu/byYunmu 内的 liju）
    // 但 byShengmu/byYunmu 内部没有 liju 字段（手写索引不带 liju）
    // 实际：pinyinData 1074 + 索引 0 = 1074
    const inDataArray = content.indexOf('export const pinyinData')
    const endOfArray = content.indexOf('export const byShengmu')
    const dataSection = content.slice(inDataArray, endOfArray)
    const inData = (dataSection.match(/"liju":\s*"((?:[^"\\]|\\.)*)"/g) || []).length
    expect(inData).toBe(1074)
  })

  it('所有 liju 不为空字符串', () => {
    const emptyCount = lijuMatches.filter((m) => m.includes('""')).length
    expect(emptyCount).toBe(0)
  })

  it('所有 liju 长度 ≥ 4（含中文标点）', () => {
    for (const m of lijuMatches) {
      const value = m.match(/"liju":\s*"((?:[^"\\]|\\.)*)"/)[1]
      // 解码 unicode 转义
      const decoded = JSON.parse('"' + value + '"')
      expect(decoded.length).toBeGreaterThanOrEqual(4)
    }
  })

  it('典型样例：b-a-1（bā 八）的 liju 是「我有八个气球。」', () => {
    // 找到 id 为 b-a-1 的对象
    const idx = content.indexOf('"id": "b-a-1"')
    expect(idx).toBeGreaterThan(-1)
    const block = content.slice(idx, idx + 300)
    expect(block).toContain('"liju": "我有八个气球。"')
  })

  it('典型样例：b-a-4（bà 爸）的 liju 包含「爸爸」', () => {
    const idx = content.indexOf('"id": "b-a-4"')
    const block = content.slice(idx, idx + 300)
    expect(block).toContain('爸爸')
  })

  it('数据格式与原结构兼容（保留 id, shengmu, yunmu, hanzi, zuci 字段）', () => {
    expect(content).toMatch(/"id":\s*"b-a-1"/)
    expect(content).toMatch(/"shengmu":\s*"b"/)
    expect(content).toMatch(/"yunmu":\s*"a"/)
    expect(content).toMatch(/"hanzi":\s*"八"/)
    expect(content).toMatch(/"zuci":\s*"八个"/)
  })
})
