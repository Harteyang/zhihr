import { describe, it, expect } from 'vitest'
import {
  OVERVIEW_ITEMS,
  computeOverviewLayout,
  RING_BREAKPOINT,
} from './shengmu-overview'

describe('OVERVIEW_ITEMS', () => {
  it('共 24 项', () => {
    expect(OVERVIEW_ITEMS).toHaveLength(24)
  })

  it('包含所有 21 个声母 b-p-m-f-d-t-n-l-g-k-h-j-q-x-zh-ch-sh-r-z-c-s', () => {
    const expected = [
      'b', 'p', 'm', 'f', 'd', 't', 'n', 'l',
      'g', 'k', 'h', 'j', 'q', 'x',
      'zh', 'ch', 'sh', 'r',
      'z', 'c', 's',
    ]
    const ids = OVERVIEW_ITEMS.filter((i) => !i.virtual).map((i) => i.id)
    expected.forEach((sm) => expect(ids).toContain(sm))
  })

  it('包含零声母', () => {
    expect(OVERVIEW_ITEMS.find((i) => i.id === '零声母')).toBeDefined()
  })

  it('y 和 w 标记为 virtual 并指向零声母', () => {
    const y = OVERVIEW_ITEMS.find((i) => i.id === 'y')
    const w = OVERVIEW_ITEMS.find((i) => i.id === 'w')
    expect(y?.virtual).toBe(true)
    expect(w?.virtual).toBe(true)
    expect(y?.redirect).toBe('零声母')
    expect(w?.redirect).toBe('零声母')
  })

  it('真实声母均非 virtual', () => {
    const realItems = OVERVIEW_ITEMS.filter((i) => i.id !== 'y' && i.id !== 'w')
    realItems.forEach((i) => expect(i.virtual).toBe(false))
  })
})

describe('computeOverviewLayout', () => {
  it('大屏 24 节点使用双环（mode=dual-ring）', () => {
    const result = computeOverviewLayout(24, 1200, 800)
    expect(result).toHaveLength(24)
    result.forEach((p) => expect(p.mode).toBe('dual-ring'))
  })

  it('大屏内环节点等半径', () => {
    const result = computeOverviewLayout(24, 1200, 800)
    const innerNodes = result.filter((p) => p.ring === 'inner')
    const radii = innerNodes.map((p) => Math.hypot(p.x, p.y))
    const first = radii[0]
    radii.forEach((r) => expect(Math.abs(r - first)).toBeLessThan(0.001))
  })

  it('大屏外环节点等半径', () => {
    const result = computeOverviewLayout(24, 1200, 800)
    const outerNodes = result.filter((p) => p.ring === 'outer')
    const radii = outerNodes.map((p) => Math.hypot(p.x, p.y))
    const first = radii[0]
    radii.forEach((r) => expect(Math.abs(r - first)).toBeLessThan(0.001))
  })

  it('双环外环半径大于内环半径', () => {
    const result = computeOverviewLayout(24, 1200, 800)
    const innerR = Math.hypot(result[0].x, result[0].y)
    const outerR = Math.hypot(result[12].x, result[12].y)
    expect(outerR).toBeGreaterThan(innerR)
  })

  it('双环内外环节点数均衡（差 ≤ 1）', () => {
    const result = computeOverviewLayout(24, 1200, 800)
    const innerCount = result.filter((p) => p.ring === 'inner').length
    const outerCount = result.filter((p) => p.ring === 'outer').length
    expect(Math.abs(innerCount - outerCount)).toBeLessThanOrEqual(1)
  })

  it('大屏角度递增（顺时针从 12 点开始）', () => {
    const result = computeOverviewLayout(24, 1200, 800)
    // Canvas y 轴向下：(prev × cur) > 0 表示从 prev 顺时针转到 cur
    for (let i = 1; i < result.length; i++) {
      const prevX = result[i - 1].x
      const prevY = result[i - 1].y
      const curX = result[i].x
      const curY = result[i].y
      const cross = prevX * curY - prevY * curX
      // 顺时针（y 轴向下）：cross > 0
      expect(cross).toBeGreaterThan(0)
    }
  })

  it('第一个节点在 12 点方向（负 y）', () => {
    const result = computeOverviewLayout(24, 1200, 800)
    expect(result[0].x).toBeCloseTo(0, 0)
    expect(result[0].y).toBeLessThan(0)
  })

  it('窄屏（<768px）返回网格坐标（mode=grid）', () => {
    const result = computeOverviewLayout(24, 700, 600)
    expect(result).toHaveLength(24)
    result.forEach((p) => expect(p.mode).toBe('grid'))
  })

  it('窄屏 6 列断点（≥640px）', () => {
    const result = computeOverviewLayout(24, 700, 600)
    // 6 列：4 行
    const ys = [...new Set(result.map((p) => Math.round(p.y)))]
    expect(ys.length).toBe(4)
  })

  it('更窄屏 4 列断点（<640px）', () => {
    const result = computeOverviewLayout(24, 400, 800)
    // 4 列：6 行
    const ys = [...new Set(result.map((p) => Math.round(p.y)))]
    expect(ys.length).toBe(6)
  })

  it('空 count 返回空数组', () => {
    expect(computeOverviewLayout(0, 1200, 800)).toEqual([])
  })

  it('RING_BREAKPOINT = 768', () => {
    expect(RING_BREAKPOINT).toBe(768)
  })

  it('边界：恰好等于 768px 时使用环形布局', () => {
    const result = computeOverviewLayout(24, 768, 800)
    expect(result[0].mode).not.toBe('grid')
  })
})
