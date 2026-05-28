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
    key: 'health', name: '身体健康-根基', icon: 'HeartPulse', color: 'emerald',
    structuredItems: [
      { id: 'sleep', label: '睡眠', placeholder: 'XX小时' },
      { id: 'diet', label: '饮食', placeholder: '是否坚持' },
      { id: 'exercise', label: '运动', placeholder: 'XX分钟' },
    ],
  },
  {
    key: 'work', name: '工作事业-安身立命', icon: 'Briefcase', color: 'blue',
    structuredItems: [
      { id: 'task', label: '任务情况', placeholder: '任务量级饱和度' },
      { id: 'hours', label: '工作时长', placeholder: 'XX小时' },
    ],
  },
  {
    key: 'study', name: '学习成长-向上动力', icon: 'GraduationCap', color: 'purple',
    structuredItems: [
      { id: 'subject', label: '学习内容', placeholder: '学习了什么' },
      { id: 'hours', label: '学习时长', placeholder: 'XX小时' },
    ],
  },
  {
    key: 'social', name: '人际关系-情感支撑', icon: 'Users', color: 'pink',
    structuredItems: [
      { id: 'activity', label: '互动人群', placeholder: '跟XX人做了什么事情' },
      { id: 'mood', label: '能量增减', placeholder: '积累/消耗了多大程度' },
    ],
  },
  {
    key: 'finance', name: '财务经济-安全感', icon: 'Wallet', color: 'amber',
    structuredItems: [
      { id: 'income', label: '收入', placeholder: 'XX元' },
      { id: 'expense', label: '支出', placeholder: 'XX元' },
    ],
  },
  {
    key: 'life', name: '生活事物-秩序', icon: 'Home', color: 'teal',
    structuredItems: [
      { id: 'activity', label: '家庭氛围', placeholder: '环境和氛围和谐度' },
      { id: 'mood', label: '家庭事物', placeholder: '值得记录的事情' },
    ],
  },
  {
    key: 'spirit', name: '精神世界-内心稳定', icon: 'Sparkles', color: 'indigo',
    structuredItems: [
      { id: 'reading', label: '阅读/输入', placeholder: '读了什么' },
      { id: 'reflection', label: '反思', placeholder: '感悟' },
    ],
  },
  {
    key: 'leisure', name: '休闲娱乐-自我滋养', icon: 'Gamepad2', color: 'orange',
    structuredItems: [
      { id: 'activity', label: '放松充电', placeholder: '是否放松并充电' },
      { id: 'duration', label: '娱乐项目', placeholder: '做了什么放松的事' },
    ],
  },
]

// 获取所有结构化项目的 key 到中文标签的映射
export function getStructuredItemLabelMap(): Record<string, string> {
  const map: Record<string, string> = {}
  for (const dim of DEFAULT_DIMENSIONS) {
    for (const item of dim.structuredItems) {
      map[item.id] = item.label
    }
  }
  return map
}

// 根据中文标签获取 key
export function getStructuredItemKeyByLabel(label: string): string | undefined {
  for (const dim of DEFAULT_DIMENSIONS) {
    for (const item of dim.structuredItems) {
      if (item.label === label) {
        return item.id
      }
    }
  }
  return undefined
}

export function getDimensionConfig(key: string): DimensionConfig | undefined {
  return DEFAULT_DIMENSIONS.find(d => d.key === key)
}

export function getDimensionColor(key: string): string {
  const dim = DEFAULT_DIMENSIONS.find(d => d.key === key)
  return dim?.color || 'slate'
}
