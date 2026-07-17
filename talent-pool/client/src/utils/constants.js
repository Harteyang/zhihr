export const STATUS_OPTIONS = [
  { label: '待联系', value: 'pending' },
  { label: '已联系', value: 'contacted' },
  { label: '面试中', value: 'interviewing' },
  { label: '已录用', value: 'offered' },
  { label: '已拒绝', value: 'rejected' }
]

export const EDUCATION_OPTIONS = ['大专', '本科', '硕士', '博士', '其他']

export const EXPERIENCE_RANGES = [
  { label: '1年以下', min: 0, max: 1 },
  { label: '1-3年', min: 1, max: 3 },
  { label: '3-5年', min: 3, max: 5 },
  { label: '5-10年', min: 5, max: 10 },
  { label: '10年以上', min: 10, max: 999 }
]

export const getStatusLabel = (value) => {
  const found = STATUS_OPTIONS.find(o => o.value === value)
  return found ? found.label : value
}

export const getStatusType = (value) => {
  const map = { pending: 'info', contacted: '', interviewing: 'warning', offered: 'success', rejected: 'danger' }
  return map[value] || 'info'
}

/**
 * 将后端返回的 UTC 时间字符串格式化为本地时区（Asia/Shanghai）显示。
 * 后端 D1/SQLite 使用 CURRENT_TIMESTAMP 存储 UTC 时间，格式为 YYYY-MM-DD HH:MM:SS（无时区后缀）。
 * 直接显示该字符串会让用户看到 UTC 时间，比北京时间慢 8 小时。
 */
export function formatTime(timeStr) {
  if (!timeStr) return '-'
  // 追加 'Z' 标记为 UTC，再转换为 Asia/Shanghai 时区显示
  const date = new Date(timeStr + 'Z')
  if (isNaN(date.getTime())) return timeStr
  return date.toLocaleString('zh-CN', {
    timeZone: 'Asia/Shanghai',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  })
}
