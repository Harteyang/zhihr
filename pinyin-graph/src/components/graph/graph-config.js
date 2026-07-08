/**
 * 拼音图谱力导向参数配置
 */

// 图谱层级结构
// 声母(center) → 韵母(inner ring) → 拼音(outer ring)

/** 各层节点类型 */
export const NODE_TYPES = {
  SHENGMU: 'shengmu',
  YUNMU: 'yunmu',
  PINYIN: 'pinyin',
}

/** 各层节点大小 (val) */
export const NODE_VALUES = {
  [NODE_TYPES.SHENGMU]: 24,   // 声母中心节点，最大
  [NODE_TYPES.YUNMU]: 14,    // 韵母节点
  [NODE_TYPES.PINYIN]: 8,    // 拼音节点
}

/** 声母节点半径 */
export const SHENGMU_RADIUS = 36

/** 韵母节点半径 */
export const YUNMU_RADIUS = 26

/** 拼音节点半径 */
export const PINYIN_RADIUS = 18

/** 韵母基础环绕半径（距离中心） */
export const YUNMU_RING_RADIUS = 180

/** 韵母最大半径（用于计算边界） */
export const YUNMU_MAX_RADIUS = 400

/** 拼音环绕半径（距离中心） */
export const PINYIN_RING_RADIUS = 320

/** 韵母展开时拼音节点距离韵母节点的半径 */
export const YUNMU_EXPAND_RADIUS = 90

/** 力模拟参数 */
export const FORCE_CONFIG = {
  // 斥力强度（按节点类型）
  charge: {
    [NODE_TYPES.SHENGMU]: -500,
    [NODE_TYPES.YUNMU]: -250,
    [NODE_TYPES.PINYIN]: -100,
  },
  // 碰撞检测
  collide: {
    strength: 0.7,
    iterations: 2,
  },
  // 速度衰减
  velocityDecay: 0.38,
  // 预热步数
  warmupTicks: 40,
  // 冷却步数上限
  cooldownTicks: 100,
  // 边距离
  linkDistance: {
    shengmuYunmu: 160,
    yunmuPinyin: 130,
  },
}

/** 图谱边界 padding */
export const BOUNDARY_PADDING = 24

/** 可读缩放阈值 */
export const MIN_READABLE = 0.7
export const MIN_ZOOM_FLOOR = 0.25

/** 最大缩放 */
export const MAX_ZOOM = 10

/** 声母渲染元信息 */
export function getShengmuRenderMeta() {
  return { fontSize: 18, fontWeight: '700', maxChars: 6 }
}

/** 韵母渲染元信息 */
export function getYunmuRenderMeta() {
  return { fontSize: 14, fontWeight: '600', maxChars: 8 }
}

/** 拼音渲染元信息 */
export function getPinyinRenderMeta() {
  return { fontSize: 12, fontWeight: '500', maxChars: 6 }
}