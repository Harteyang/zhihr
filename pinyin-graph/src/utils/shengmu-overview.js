/**
 * shengmu-overview — 声母总览图数据与布局
 *
 * 提供：
 *   OVERVIEW_ITEMS — 24 个声母节点（22 真实声母 + 零声母 + 虚拟 y、w）
 *   computeOverviewLayout(count, containerW, containerH) — 环形（≥1024px）或网格布局坐标
 */

import { SHENGMU_GROUPS } from '../components/graph/ShengmuSelector'

export const OVERVIEW_ITEMS = [
  ...SHENGMU_GROUPS.flatMap((g) =>
    g.items.map((id) => ({ id, label: id, virtual: false, group: g.label }))
  ),
  { id: 'y', label: 'y', virtual: true, redirect: '零声母', group: '零声母' },
  { id: 'w', label: 'w', virtual: true, redirect: '零声母', group: '零声母' },
]

export const RING_BREAKPOINT = 768

/**
 * 为 count 个节点计算布局坐标
 * 大屏（≥768px）：环形布局（>16 节点用双环避免重叠）
 * 窄屏：网格布局
 *
 * @returns {Array<{x:number, y:number, mode:'ring'|'dual-ring'|'grid'}>}
 */
export function computeOverviewLayout(count, containerW, containerH) {
  if (count === 0) return []

  if (containerW >= RING_BREAKPOINT) {
    // 大屏环形：单环最大 12 节点，超出则双环
    if (count <= 12) {
      const radius = Math.min(containerW, containerH) / 2 - 80
      return Array.from({ length: count }, (_, i) => {
        const angle = -Math.PI / 2 + (2 * Math.PI * i) / count
        return {
          x: Math.cos(angle) * radius,
          y: Math.sin(angle) * radius,
          mode: 'ring',
        }
      })
    }

    // 双环：前 half 在内环，后 half 在外环
    const innerCount = Math.ceil(count / 2)
    const outerCount = count - innerCount
    const innerR = Math.min(containerW, containerH) / 2 * 0.45
    const outerR = Math.min(containerW, containerH) / 2 * 0.85
    return Array.from({ length: count }, (_, i) => {
      if (i < innerCount) {
        const angle = -Math.PI / 2 + (2 * Math.PI * i) / innerCount
        return { x: Math.cos(angle) * innerR, y: Math.sin(angle) * innerR, mode: 'dual-ring', ring: 'inner' }
      }
      const j = i - innerCount
      // 外环与内环错半格起始角
      const angle = -Math.PI / 2 + Math.PI / outerCount + (2 * Math.PI * j) / outerCount
      return { x: Math.cos(angle) * outerR, y: Math.sin(angle) * outerR, mode: 'dual-ring', ring: 'outer' }
    })
  }

  const cols = containerW >= 640 ? 6 : 4
  const rows = Math.ceil(count / cols)
  const cellW = containerW / cols
  const cellH = Math.max(80, (containerH - 40) / rows)
  return Array.from({ length: count }, (_, i) => ({
    x: (i % cols + 0.5) * cellW,
    y: Math.floor(i / cols) * cellH + cellH / 2,
    mode: 'grid',
  }))
}
