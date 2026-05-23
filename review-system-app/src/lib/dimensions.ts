export interface DimensionConfig {
  key: string
  name: string
  icon: string
  color: string
  type: 'structured' | 'freeform'
  placeholder?: string
  structuredItems?: { label: string; placeholder: string }[]
}

export const DEFAULT_DIMENSIONS: DimensionConfig[] = [
  {
    key: 'health',
    name: '健康',
    icon: 'HeartPulse',
    color: 'emerald',
    type: 'structured',
    structuredItems: [
      { label: '睡眠', placeholder: 'XX小时' },
      { label: '饮食', placeholder: '是否有坚持16+8饮食' },
    ],
  },
  {
    key: 'work',
    name: '工作',
    icon: 'Briefcase',
    color: 'blue',
    type: 'freeform',
    placeholder: '记录今天的工作...',
  },
  {
    key: 'study',
    name: '学习',
    icon: 'BookOpen',
    color: 'amber',
    type: 'freeform',
    placeholder: '记录今天的学习...',
  },
  {
    key: 'social',
    name: '社交',
    icon: 'Users',
    color: 'violet',
    type: 'freeform',
    placeholder: '记录今天的社交...',
  },
  {
    key: 'finance',
    name: '财务',
    icon: 'Wallet',
    color: 'pink',
    type: 'freeform',
    placeholder: '记录今天的财务...',
  },
  {
    key: 'life',
    name: '生活',
    icon: 'Home',
    color: 'cyan',
    type: 'freeform',
    placeholder: '记录今天的生活...',
  },
  {
    key: 'spirit',
    name: '精神',
    icon: 'Brain',
    color: 'indigo',
    type: 'freeform',
    placeholder: '记录今天的精神状态...',
  },
  {
    key: 'leisure',
    name: '休闲',
    icon: 'Coffee',
    color: 'rose',
    type: 'freeform',
    placeholder: '记录今天的休闲...',
  },
]

export function getTodayString(): string {
  return new Date().toISOString().split('T')[0]
}
