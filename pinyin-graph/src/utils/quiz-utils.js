/**
 * 出题逻辑工具函数
 */

/**
 * Fisher-Yates 洗牌
 */
export function shuffle(arr) {
  const result = [...arr]
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]]
  }
  return result
}

/**
 * 从数组中随机取 N 个
 */
export function randomPick(arr, count = 1) {
  const shuffled = shuffle(arr)
  return shuffled.slice(0, Math.min(count, arr.length))
}

/**
 * 生成选择题选项
 *
 * @param {object} correctItem - 正确答案项（含 pinyin, hanzi, shengmu, yunmu 等字段）
 * @param {string} mode - 'pinyin-to-hanzi' | 'hanzi-to-pinyin'
 * @param {Array} pool - 所有可选数据池
 * @param {number} count - 选项数（含正确答案）
 * @returns {Array} 选项数组，已打乱
 */
export function generateOptions(correctItem, mode, pool, count = 4) {
  const correctAnswer = mode === 'pinyin-to-hanzi' ? correctItem.hanzi : correctItem.pinyin
  const options = [correctAnswer]

  // 从同声母 + 同韵母的音节中选取干扰项
  const candidates = pool.filter(r => {
    if (r.id === correctItem.id) return false
    // 优先选同声母或同韵母的
    const sameShengmu = r.shengmu === correctItem.shengmu
    const sameYunmu = r.yunmu === correctItem.yunmu
    return sameShengmu || sameYunmu
  })

  const shuffled = shuffle(candidates)
  for (const r of shuffled) {
    const answer = mode === 'pinyin-to-hanzi' ? r.hanzi : r.pinyin
    if (!options.includes(answer)) {
      options.push(answer)
      if (options.length >= count) break
    }
  }

  // 如果干扰项不够，从全量池中补充
  if (options.length < count) {
    const remaining = shuffle(pool.filter(r => {
      const ans = mode === 'pinyin-to-hanzi' ? r.hanzi : r.pinyin
      return !options.includes(ans)
    }))
    for (const r of remaining) {
      const ans = mode === 'pinyin-to-hanzi' ? r.hanzi : r.pinyin
      options.push(ans)
      if (options.length >= count) break
    }
  }

  return shuffle(options)
}

/**
 * 生成拼音转汉字题目
 *
 * @param {Array} pool - 数据池
 * @param {number} count - 题目数量
 * @returns {Array} 题目数组
 */
export function generatePinyinToHanziQuestions(pool, count = 10) {
  const items = randomPick(pool, count)
  return items.map(item => ({
    type: 'pinyin-to-hanzi',
    question: item.pinyin,       // 显示拼音
    correctAnswer: item.hanzi,
    options: generateOptions(item, 'pinyin-to-hanzi', pool),
    data: item,
  }))
}

/**
 * 生成汉字转拼音题目
 */
export function generateHanziToPinyinQuestions(pool, count = 10) {
  const items = randomPick(pool, count)
  return items.map(item => ({
    type: 'hanzi-to-pinyin',
    question: item.hanzi,       // 显示汉字
    correctAnswer: item.pinyin,
    options: generateOptions(item, 'hanzi-to-pinyin', pool),
    data: item,
  }))
}

/**
 * 生成混合题目（两种题型随机混合）
 */
export function generateMixedQuestions(pool, count = 10) {
  const half = Math.ceil(count / 2)
  const typeA = generatePinyinToHanziQuestions(pool, half)
  const typeB = generateHanziToPinyinQuestions(pool, count - half)
  return shuffle([...typeA, ...typeB])
}