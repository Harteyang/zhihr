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
    key: 'health', name: '健康', icon: 'HeartPulse', color: 'emerald',
    type: 'structured',
    structuredItems: [
      { label: '睡眠', placeholder: 'XX小时' },
      { label: '饮食', placeholder: '是否有坚持16+8饮食' },
      { label: '运动', placeholder: 'XX分钟' },
      { label: '心情', placeholder: '1-10分' },
    ],
  },
  {
    key: 'work', name: '工作', icon: 'Briefcase', color: 'blue',
    type: 'freeform', placeholder: '记录今天的工作...',
  },
  {
    key: 'study', name: '学习', icon: 'GraduationCap', color: 'purple',
    type: 'freeform', placeholder: '记录今天的学习...',
  },
  {
    key: 'social', name: '社交', icon: 'Users', color: 'pink',
    type: 'freeform', placeholder: '记录今天的社交...',
  },
  {
    key: 'finance', name: '财务', icon: 'Wallet', color: 'amber',
    type: 'freeform', placeholder: '记录今天的收支...',
  },
  {
    key: 'life', name: '生活', icon: 'Home', color: 'teal',
    type: 'freeform', placeholder: '记录今天的生活...',
  },
  {
    key: 'spirit', name: '精神', icon: 'Sparkles', color: 'indigo',
    type: 'freeform', placeholder: '记录今天的感悟...',
  },
  {
    key: 'leisure', name: '休闲', icon: 'Gamepad2', color: 'orange',
    type: 'freeform', placeholder: '记录今天的休闲...',
  },
]

export function getDimensionColor(key: string): string {
  const dim = DEFAULT_DIMENSIONS.find(d => d.key === key)
  return dim?.color || 'slate'
}
