export const STATUS_OPTIONS = [
  { label: '待推荐', value: 'to_recommend' },
  { label: '简历筛选通过', value: 'resume_passed' },
  { label: '已安排面试', value: 'interview_scheduled' },
  { label: '面试通过', value: 'interview_passed' },
  { label: 'offer沟通', value: 'offer_discussing' },
  { label: '拒绝offer', value: 'offer_rejected' },
  { label: '已录用', value: 'hired' },
  { label: '筛选不通过', value: 'screening_failed' }
]

export const EDUCATION_OPTIONS = ['大专', '本科', '硕士', '博士', 'MBA', '其他']

// ====== 面试登记（对照入职信息登记字段表） ======

export const GENDER_OPTIONS = ['男', '女']

export const MARITAL_OPTIONS = ['已婚', '未婚', '离异']

export const HOUSEHOLD_OPTIONS = ['农村', '城市']

export const POLITICAL_OPTIONS = ['中共党员', '预备党员', '共青团员', '民主党派', '群众']

export const ONBOARD_TIME_OPTIONS = ['随时到岗', '一周内', '两周内', '一个月内', '待定']

export const YES_NO_OPTIONS = ['是', '否']

export const UNIFIED_OPTIONS = ['统招', '非统招']

export const RELATION_OPTIONS = ['父亲', '母亲', '配偶', '子女', '兄弟姐妹', '其他']

// 附件用途（talent_attachments.kind）
export const ATTACHMENT_KINDS = [
  { label: '简历', value: 'resume' },
  { label: '身份证（人像面）', value: 'id_card_front' },
  { label: '身份证（国徽面）', value: 'id_card_back' },
  { label: '学历证书', value: 'education_cert' },
  { label: '学位证书', value: 'degree_cert' },
  { label: '前公司离职证明', value: 'resignation_cert' },
  { label: '个人照片', value: 'photo' },
  { label: '候选人签名', value: 'signature' }
]

export const getAttachmentKindLabel = (value) => {
  const found = ATTACHMENT_KINDS.find(k => k.value === value)
  return found ? found.label : '简历'
}

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
  const map = {
    to_recommend: 'info',
    resume_passed: '',
    interview_scheduled: 'warning',
    interview_passed: 'success',
    offer_discussing: 'warning',
    offer_rejected: 'danger',
    hired: 'success',
    screening_failed: 'danger'
  }
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
