/**
 * 拼音 CSV 数据转换脚本
 *
 * 用法：
 *   node scripts/convert-csv.js <输入CSV路径> [输出JS路径]
 *
 * 默认：
 *   输入：/Users/yq/Downloads/拼音.csv
 *   输出：src/data/pinyin.js
 */

import { readFileSync, writeFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))

const INPUT_PATH = process.argv[2] || '/Users/yq/Downloads/拼音.csv'
const OUTPUT_PATH = process.argv[3] || resolve(__dirname, '../src/data/pinyin.js')

// 韵母分类
const YUNMU_CATEGORIES = {
  '单韵母': ['a', 'o', 'e', 'i', 'u', 'ü'],
  '复韵母': ['ai', 'ei', 'ui', 'ao', 'ou', 'iu', 'ie', 'üe', 'er'],
  '前鼻韵母': ['an', 'en', 'in', 'un', 'ün'],
  '后鼻韵母': ['ang', 'eng', 'ing', 'ong'],
}

function getYunmuCategory(yunmu) {
  for (const [cat, list] of Object.entries(YUNMU_CATEGORIES)) {
    if (list.includes(yunmu)) return cat
  }
  // 处理带介音的韵母
  if (yunmu.startsWith('i') || yunmu.startsWith('u') || yunmu.startsWith('ü')) {
    return '介音韵母'
  }
  return '其他'
}

// 将声调字符串转为数字
function parseShengdiao(sd) {
  const m = String(sd).match(/(\d)/)
  return m ? parseInt(m[1]) : 0
}

function parseCSV(content) {
  const lines = content.trim().split('\n')
  const headers = lines[0].split(',').map(h => h.trim())
  const records = []

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim()
    if (!line) continue

    // 简单 CSV 解析（不处理引号内逗号，因为数据中不含）
    const values = line.split(',').map(v => v.trim())
    const record = {}
    headers.forEach((h, idx) => {
      record[h] = values[idx] || ''
    })

    const shengmu = record['声母']
    const yunmu = record['韵母']
    const shengdiaoStr = record['声调']
    const pinyin = record['拼音']
    const hanzi = record['常用字']
    const zuci = record['组词']

    if (!pinyin) continue

    records.push({
      id: `${shengmu}-${yunmu}-${parseShengdiao(shengdiaoStr)}`,
      shengmu,
      yunmu,
      yunmuCategory: getYunmuCategory(yunmu),
      shengdiao: parseShengdiao(shengdiaoStr),
      pinyin,
      hanzi: hanzi || '',
      zuci: zuci || '',
    })
  }

  return records
}

function buildIndexes(records) {
  const byShengmu = {}
  const byYunmu = {}
  const validPinyinSet = new Set()
  const shengmuOrder = [
    'b', 'p', 'm', 'f', 'd', 't', 'n', 'l',
    'g', 'k', 'h', 'j', 'q', 'x',
    'zh', 'ch', 'sh', 'r', 'z', 'c', 's',
    '零声母',
  ]
  const yunmuSet = new Set()

  for (const r of records) {
    // 按声母分组
    if (!byShengmu[r.shengmu]) byShengmu[r.shengmu] = []
    byShengmu[r.shengmu].push(r)

    // 按韵母分组
    if (!byYunmu[r.yunmu]) byYunmu[r.yunmu] = []
    byYunmu[r.yunmu].push(r)

    // 合法拼音集合
    validPinyinSet.add(r.pinyin)
    yunmuSet.add(r.yunmu)
  }

  return {
    byShengmu,
    byYunmu,
    validPinyinList: Array.from(validPinyinSet).sort(),
    shengmuList: shengmuOrder.filter(s => byShengmu[s]),
    yunmuList: shengmuOrder
      .filter(s => byShengmu[s])
      .flatMap(s => {
        const yunmus = new Set(byShengmu[s].map(r => r.yunmu))
        return Array.from(yunmus)
      })
      .filter((v, i, a) => a.indexOf(v) === i),
  }
}

function generateJS(records, indexes) {
  const { byShengmu, byYunmu, validPinyinList, shengmuList, yunmuList } = indexes

  return `// 拼音数据 — 由 convert-csv.js 自动生成
// 生成时间：${new Date().toISOString()}
// 数据来源：拼音.csv
// 记录数：${records.length}

export const pinyinData = ${JSON.stringify(records, null, 2)}

// 按声母分组索引
export const byShengmu = ${JSON.stringify(byShengmu, null, 2)}

// 按韵母分组索引
export const byYunmu = ${JSON.stringify(byYunmu, null, 2)}

// 声母列表（按教材顺序）
export const shengmuList = ${JSON.stringify(shengmuList, null, 2)}

// 韵母列表
export const yunmuList = ${JSON.stringify(yunmuList, null, 2)}

// 所有合法拼音集合
export const validPinyinSet = new Set(${JSON.stringify(validPinyinList)})

/**
 * 获取指定声母的所有音节
 */
export function getByShengmu(sm) {
  return byShengmu[sm] || []
}

/**
 * 获取指定韵母的所有音节
 */
export function getByYunmu(ym) {
  return byYunmu[ym] || []
}

/**
 * 按声母和声调度数筛选
 */
export function filterBy(options = {}) {
  let result = [...pinyinData]
  if (options.shengmu) result = result.filter(r => r.shengmu === options.shengmu)
  if (options.shengdiao) result = result.filter(r => r.shengdiao === options.shengdiao)
  if (options.yunmu) result = result.filter(r => r.yunmu === options.yunmu)
  return result
}

/**
 * 随机抽取 N 条记录
 */
export function randomPick(count = 10, pool = pinyinData) {
  const shuffled = [...pool]
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }
  return shuffled.slice(0, count)
}
`
}

function main() {
  try {
    console.log(`📖 读取: ${INPUT_PATH}`)
    const content = readFileSync(INPUT_PATH, 'utf-8')
    const records = parseCSV(content)
    console.log(`✅ 解析: ${records.length} 条记录`)

    const indexes = buildIndexes(records)
    console.log(`📊 声母: ${indexes.shengmuList.length} 个`)
    console.log(`📊 韵母: ${indexes.yunmuList.length} 个`)
    console.log(`📊 合法拼音: ${indexes.validPinyinList.length} 个`)

    const jsContent = generateJS(records, indexes)
    writeFileSync(OUTPUT_PATH, jsContent, 'utf-8')
    console.log(`✅ 输出: ${OUTPUT_PATH}`)
  } catch (err) {
    console.error('❌ 转换失败:', err.message)
    process.exit(1)
  }
}

main()