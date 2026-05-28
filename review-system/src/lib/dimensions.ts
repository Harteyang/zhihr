export interface StructuredItem {
  id: string
  label: string
  placeholder: string
}

export interface DimensionConfig {
  key: string
  name: string
  icon: string
  color: string
  structuredItems: StructuredItem[]
}

export const DEFAULT_DIMENSIONS: DimensionConfig[] = [
  {
    key: 'health', name: '健康', icon: 'HeartPulse', color: 'emerald',
    structuredItems: [
      { id: 'sleep', label: '睡眠', placeholder: 'XX小时' },
      { id: 'diet', label: '饮食', placeholder: '是否坚持' },
      { id: 'exercise', label: '运动', placeholder: 'XX分钟' },
    ],
  },
  {
    key: 'work', name: '工作', icon: 'Briefcase', color: 'blue',
    structuredItems: [
      { id: 'task', label: '完成任务', placeholder: '主要任务' },
      { id: 'hours', label: '工作时长', placeholder: 'XX小时' },
    ],
  },
  {
    key: 'study', name: '学习', icon: 'GraduationCap', color: 'purple',
    structuredItems: [
      { id: 'subject', label: '学习内容', placeholder: '学习了什么' },
      { id: 'hours', label: '学习时长', placeholder: 'XX小时' },
    ],
  },
  {
    key: 'social', name: '社交', icon: 'Users', color: 'pink',
    structuredItems: [
      { id: 'activity', label: '社交活动', placeholder: '和谁/做什么' },
      { id: 'mood', label: '心情', placeholder: '1-10分' },
    ],
  },
  {
    key: 'finance', name: '财务', icon: 'Wallet', color: 'amber',
    structuredItems: [
      { id: 'income', label: '收入', placeholder: 'XX元' },
      { id: 'expense', label: '支出', placeholder: 'XX元' },
    ],
  },
  {
    key: 'life', name: '生活', icon: 'Home', color: 'teal',
    structuredItems: [
      { id: 'activity', label: '日常活动', placeholder: '做了什么' },
      { id: 'mood', label: '心情', placeholder: '1-10分' },
    ],
  },
  {
    key: 'spirit', name: '精神', icon: 'Sparkles', color: 'indigo',
    structuredItems: [
      { id: 'reading', label: '阅读/输入', placeholder: '读了什么' },
      { id: 'reflection', label: '反思', placeholder: '感悟' },
    ],
  },
  {
    key: 'leisure', name: '休闲', icon: 'Gamepad2', color: 'orange',
    structuredItems: [
      { id: 'activity', label: '休闲活动', placeholder: '做了什么' },
      { id: 'duration', label: '时长', placeholder: 'XX分钟' },
    ],
  },
]

export function getDimensionConfig(key: string): DimensionConfig | undefined {
  return DEFAULT_DIMENSIONS.find(d => d.key === key)
}

export function getDimensionColor(key: string): string {
  const dim = DEFAULT_DIMENSIONS.find(d => d.key === key)
  return dim?.color || 'slate'
}
