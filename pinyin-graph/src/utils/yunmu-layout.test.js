import { describe, it, expect } from 'vitest'
import {
  YUNMU_ORDER,
  sortByCognitiveOrder,
  distributeRings,
  computeYunmuLayout,
} from './yunmu-layout'

describe('sortByCognitiveOrder', () => {
  it('按认知顺序排列：单韵母 → 复韵母 → 前鼻 → 后鼻 → 介音', () => {
    const input = ['ang', 'a', 'ai', 'an']
    const result = sortByCognitiveOrder(input)
    expect(result).toEqual(['a', 'ai', 'an', 'ang'])
  })

  it('保持单韵母内部顺序 a o e i u ü', () => {
    const input = ['ü', 'u', 'i', 'e', 'o', 'a']
    const result = sortByCognitiveOrder(input)
    expect(result).toEqual(['a', 'o', 'e', 'i', 'u', 'ü'])
  })

  it('未知韵母排在已知韵母之后，按字母序排列', () => {
    const input = ['a', 'zz', 'i', 'xx']
    const result = sortByCognitiveOrder(input)
    expect(result).toEqual(['a', 'i', 'xx', 'zz'])
  })

  it('不修改原数组', () => {
    const input = ['e', 'a', 'i']
    sortByCognitiveOrder(input)
    expect(input).toEqual(['e', 'a', 'i'])
  })
})

describe('distributeRings', () => {
  it('节点数 ≤ limit 时返回单环', () => {
    expect(distributeRings(5, 8)).toEqual([{ count: 5, startIndex: 0 }])
  })

  it('节点数 > limit 时均衡分配，各环差不超过 1', () => {
    const rings = distributeRings(15, 8)
    expect(rings).toHaveLength(2)
    expect(rings[0].count).toBe(8)
    expect(rings[1].count).toBe(7)
    expect(rings[0].startIndex).toBe(0)
    expect(rings[1].startIndex).toBe(8)
  })

  it('三环分配正确', () => {
    const rings = distributeRings(20, 8)
    expect(rings).toHaveLength(3)
    const total = rings.reduce((s, r) => s + r.count, 0)
    expect(total).toBe(20)
    for (let i = 1; i < rings.length; i++) {
      expect(Math.abs(rings[i].count - rings[i - 1].count)).toBeLessThanOrEqual(1)
    }
  })
})

describe('computeYunmuLayout — 顺时针排序核心逻辑', () => {
  it('从 12 点钟方向开始（angle = -π/2）', () => {
    const layout = computeYunmuLayout(['a'])
    const pos = layout.get('a')
    expect(pos.angle).toBeCloseTo(-Math.PI / 2, 10)
    expect(pos.x).toBeCloseTo(0, 5)
    expect(pos.y).toBeCloseTo(-120, 5) // minRadius=120, 正上方
  })

  it('角度按顺时针递增（屏幕坐标系 y 轴向下）', () => {
    const labels = ['a', 'o', 'e', 'i']
    const layout = computeYunmuLayout(labels)
    const angles = labels.map((l) => layout.get(l).angle)
    for (let i = 1; i < angles.length; i++) {
      expect(angles[i]).toBeGreaterThan(angles[i - 1])
    }
  })

  it('第一个节点在正上方，第二个节点在右侧（顺时针）', () => {
    const labels = ['a', 'o', 'e', 'i']
    const layout = computeYunmuLayout(labels)
    const a = layout.get('a')
    const o = layout.get('o')
    // a 在正上方：x≈0, y<0
    expect(a.x).toBeCloseTo(0, 5)
    expect(a.y).toBeLessThan(0)
    // o 在右侧：x>0（顺时针第二个位置）
    expect(o.x).toBeGreaterThan(0)
  })

  it('所有节点设置 fx/fy 固定位置，防止力模拟打乱布局', () => {
    const labels = ['a', 'o', 'e', 'i', 'u']
    const layout = computeYunmuLayout(labels)
    for (const label of labels) {
      const pos = layout.get(label)
      expect(pos.fx).toBeDefined()
      expect(pos.fy).toBeDefined()
      expect(pos.fx).toBeCloseTo(pos.x, 10)
      expect(pos.fy).toBeCloseTo(pos.y, 10)
    }
  })

  it('完整绕环一周角度覆盖 2π', () => {
    const labels = ['a', 'o', 'e', 'i', 'u', 'ü', 'ai', 'ei']
    const layout = computeYunmuLayout(labels)
    const positions = labels.map((l) => layout.get(l))
    const firstAngle = positions[0].angle
    const lastAngle = positions[positions.length - 1].angle
    // 8 个节点均匀分布，首尾角度差应接近 2π - step
    const angleStep = (2 * Math.PI) / 8
    expect(lastAngle - firstAngle).toBeCloseTo(2 * Math.PI - angleStep, 5)
  })

  it('多环分配时各环节点数差不超过 1', () => {
    // 15 个韵母 → 2 环 (8 + 7)
    const labels = YUNMU_ORDER.slice(0, 15)
    const layout = computeYunmuLayout(labels)
    const ringCounts = new Map()
    for (const [, pos] of layout) {
      ringCounts.set(pos.ring, (ringCounts.get(pos.ring) || 0) + 1)
    }
    const counts = Array.from(ringCounts.values())
    expect(Math.max(...counts) - Math.min(...counts)).toBeLessThanOrEqual(1)
  })

  it('认知顺序连续的韵母在环上位置也连续（同环内）', () => {
    const labels = ['a', 'o', 'e', 'i', 'u', 'ü']
    const layout = computeYunmuLayout(labels)
    const positions = labels.map((l) => layout.get(l))
    // 同一环内，ringOffset 应递增
    for (let i = 1; i < positions.length; i++) {
      expect(positions[i].ring).toBe(positions[0].ring)
      expect(positions[i].ringOffset).toBe(positions[i - 1].ringOffset + 1)
    }
  })

  it('空数组返回空 Map', () => {
    expect(computeYunmuLayout([]).size).toBe(0)
  })

  it('所有韵母在 YUNMU_ORDER 中都能正确排序', () => {
    // 测试所有标准韵母
    const layout = computeYunmuLayout(YUNMU_ORDER)
    expect(layout.size).toBe(YUNMU_ORDER.length)
    // 验证每个韵母都有有效坐标
    for (const label of YUNMU_ORDER) {
      const pos = layout.get(label)
      expect(pos).toBeDefined()
      expect(isFinite(pos.x)).toBe(true)
      expect(isFinite(pos.y)).toBe(true)
      expect(isFinite(pos.fx)).toBe(true)
      expect(isFinite(pos.fy)).toBe(true)
    }
  })

  it('节点间距均匀（同环内相邻节点角度差恒定）', () => {
    const labels = ['a', 'o', 'e', 'i', 'u', 'ü', 'ai', 'ei']
    const layout = computeYunmuLayout(labels)
    const positions = labels.map((l) => layout.get(l))
    const expectedStep = (2 * Math.PI) / 8
    for (let i = 1; i < positions.length; i++) {
      const diff = positions[i].angle - positions[i - 1].angle
      expect(diff).toBeCloseTo(expectedStep, 5)
    }
  })
})
