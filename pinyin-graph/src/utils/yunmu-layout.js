/**
 * 韵母环形布局纯函数
 *
 * 将韵母按认知顺序排序后，沿顺时针方向均匀分布到同心环上。
 * 每个节点返回固定坐标 (fx/fy)，防止 d3-force 模拟打乱布局。
 */

// 韵母认知顺序：单韵母 → 复韵母 → 前鼻韵母 → 后鼻韵母 → 介音韵母
export const YUNMU_ORDER = [
  'a', 'o', 'e', 'i', 'u', 'ü',
  'ai', 'ei', 'ui', 'ao', 'ou', 'iu', 'ie', 'üe', 'er',
  'an', 'en', 'in', 'un', 'ün',
  'ang', 'eng', 'ing', 'ong',
  'ia', 'iao', 'ian', 'iang', 'iong',
  'ua', 'uo', 'uai', 'uan', 'uang', 'üan',
]

export const LAYOUT_DEFAULTS = {
  minRadius: 120,
  maxRadius: 240, // 内外环比 2:1，避免外圈连线过长
  maxPerRing: 8,
}

/**
 * 按认知顺序对韵母标签排序
 * @param {string[]} labels - 韵母标签数组
 * @returns {string[]} 排序后的标签数组
 */
export function sortByCognitiveOrder(labels) {
  return [...labels].sort((a, b) => {
    const idxA = YUNMU_ORDER.indexOf(a)
    const idxB = YUNMU_ORDER.indexOf(b)
    if (idxA === -1 && idxB === -1) return a.localeCompare(b)
    if (idxA === -1) return 1
    if (idxB === -1) return -1
    return idxA - idxB
  })
}

/**
 * 将 count 个节点均衡分配到若干环，使各环节点数差不超过 1
 * @param {number} count - 节点总数
 * @param {number} limit - 每环最多节点数
 * @returns {{count: number, startIndex: number}[]}
 */
export function distributeRings(count, limit) {
  const rings = Math.ceil(count / limit)
  if (rings <= 1) return [{ count, startIndex: 0 }]
  const base = Math.floor(count / rings)
  const remainder = count % rings
  const result = []
  let idx = 0
  for (let i = 0; i < rings; i++) {
    const c = base + (i < remainder ? 1 : 0)
    result.push({ count: c, startIndex: idx })
    idx += c
  }
  return result
}

/**
 * 计算韵母环形布局
 *
 * 顺时针规则：从 12 点钟方向（-π/2）开始，角度递增方向为顺时针
 * （Canvas 坐标系 y 轴向下，sin 值递增 → 屏幕下方 → 顺时针）。
 *
 * @param {string[]} yunmuLabels - 需要布局的韵母标签
 * @param {object} [options] - 布局参数
 * @param {number} [options.minRadius] - 内环半径
 * @param {number} [options.maxRadius] - 外环半径
 * @param {number} [options.maxPerRing] - 每环最大节点数
 * @returns {Map<string, {x: number, y: number, fx: number, fy: number, angle: number, ring: number, ringOffset: number}>}
 */
export function computeYunmuLayout(yunmuLabels, options = {}) {
  const { minRadius, maxRadius, maxPerRing } = { ...LAYOUT_DEFAULTS, ...options }

  const sorted = sortByCognitiveOrder(yunmuLabels)
  const count = sorted.length
  if (count === 0) return new Map()

  const ringLayout = distributeRings(count, maxPerRing)
  const radiusStep = ringLayout.length > 1 ? (maxRadius - minRadius) / (ringLayout.length - 1) : 0

  const result = new Map()

  sorted.forEach((label, i) => {
    const ringIndex = ringLayout.findIndex((r) => i >= r.startIndex && i < r.startIndex + r.count)
    const ring = ringLayout[ringIndex]
    const ringOffset = i - ring.startIndex
    const ringRadius = minRadius + ringIndex * radiusStep
    const ringNodeCount = ring.count
    const angleStep = (2 * Math.PI) / Math.max(1, ringNodeCount)
    // 相邻环错位半个步长，避免视觉拥挤
    const angleOffset = (ringIndex % 2) * (angleStep / 2)
    // -π/2 = 12 点钟方向；角度递增 = 屏幕顺时针
    const angle = ringOffset * angleStep + angleOffset - Math.PI / 2

    const x = ringRadius * Math.cos(angle)
    const y = ringRadius * Math.sin(angle)

    result.set(label, {
      x,
      y,
      fx: x, // 固定位置，防止力模拟打乱布局
      fy: y,
      angle,
      ring: ringIndex,
      ringOffset,
      ringRadius,
    })
  })

  return result
}
