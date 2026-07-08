/**
 * 拼音工具函数
 */

/**
 * 声调符号映射
 */
export const TONE_MARKS = ['', 'ā', 'á', 'ǎ', 'à']

/**
 * 获取声调数字对应的符号
 */
export function getToneMark(shengdiao) {
  return TONE_MARKS[shengdiao] || ''
}

/**
 * 声母颜色盘（历史兼容，当前图谱改用层级颜色）
 */
export const SHENGMU_COLORS = {
  'b': '#3b82f6',    // 蓝
  'p': '#ef4444',    // 红
  'm': '#10b981',    // 绿
  'f': '#f59e0b',    // 橙
  'd': '#8b5cf6',    // 紫
  't': '#ec4899',    // 粉
  'n': '#06b6d4',    // 青
  'l': '#f97316',    // 橙红
  'g': '#84cc16',    // 黄绿
  'k': '#6366f1',    // 靛蓝
  'h': '#14b8a6',    // 青绿
  'j': '#e11d48',    // 玫瑰红
  'q': '#0ea5e9',    // 天蓝
  'x': '#a855f7',    // 紫罗兰
  'zh': '#d946ef',   // 粉紫
  'ch': '#22c55e',   // 草绿
  'sh': '#eab308',   // 金黄
  'r': '#f43f5e',    // 珊瑚红
  'z': '#0d9488',    // 深青
  'c': '#7c3aed',    // 深紫
  's': '#ea580c',    // 朱红
  '零声母': '#64748b', // 灰色
}

/**
 * 获取声母对应的颜色（历史兼容）
 */
export function getShengmuColor(shengmu) {
  return SHENGMU_COLORS[shengmu] || '#6b7280'
}

/**
 * 图谱层级颜色方案
 * 按内容层级区分颜色，同一层级内统一颜色
 */
export const LAYER_COLORS = {
  shengmu: '#FF9AA2', // 珊瑚粉 — 声母层
  yunmu: '#B5EAD7',   // 薄荷绿 — 韵母层
  pinyin: '#FFDAC1',  // 奶油黄 — 拼音层
}

/**
 * 根据节点层级获取统一颜色
 */
export function getLayerColor(layer) {
  return LAYER_COLORS[layer] || '#6b7280'
}

/**
 * 将拼音与汉字按音节/汉字一一配对
 * 支持多字多音节场景，例如：pinyin="bà ba", hanzi="爸爸" → [{pinyin:"bà",hanzi:"爸"},{pinyin:"ba",hanzi:"爸"}]
 */
export function splitPinyinHanzi(pinyin, hanzi) {
  if (!pinyin || !hanzi) return []
  const chars = String(hanzi).split('')
  const syllables = String(pinyin).trim().split(/\s+/)

  if (chars.length === 1) {
    return [{ pinyin: String(pinyin).trim(), hanzi: chars[0] }]
  }

  if (syllables.length === chars.length) {
    return chars.map((char, i) => ({ pinyin: syllables[i], hanzi: char }))
  }

  // 兜底：每个汉字都显示完整拼音
  return chars.map((char) => ({ pinyin: String(pinyin).trim(), hanzi: char }))
}

/**
 * 韵母分类颜色
 */
export const YUNMU_CATEGORY_COLORS = {
  '单韵母': '#3b82f6',
  '复韵母': '#10b981',
  '前鼻韵母': '#f59e0b',
  '后鼻韵母': '#8b5cf6',
  '介音韵母': '#ec4899',
  '其他': '#6b7280',
}

/**
 * 获取韵母分类
 */
export function getYunmuCategory(yunmu) {
  const categories = {
    '单韵母': ['a', 'o', 'e', 'i', 'u', 'ü'],
    '复韵母': ['ai', 'ei', 'ui', 'ao', 'ou', 'iu', 'ie', 'üe', 'er'],
    '前鼻韵母': ['an', 'en', 'in', 'un', 'ün'],
    '后鼻韵母': ['ang', 'eng', 'ing', 'ong'],
  }
  for (const [cat, list] of Object.entries(categories)) {
    if (list.includes(yunmu)) return cat
  }
  return '介音韵母'
}

/**
 * 截断字符串
 */
export function truncate(str, maxLen) {
  if (!str) return ''
  if (str.length <= maxLen) return str
  return str.slice(0, maxLen - 1) + '…'
}

/**
 * 数值钳制
 */
export function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v))
}