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
