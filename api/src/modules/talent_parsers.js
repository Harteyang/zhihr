import { read, utils, write } from 'xlsx'
import { unzipSync } from 'fflate'

// ========= 简历区块关键词常量 =========

const SECTION_KEYWORDS = {
  profile: ['个人信息', '基本信息', '联系方式', 'profile', '姓名', 'name'],
  education: ['教育背景', '教育经历', '学历', '毕业院校', 'education', '教育'],
  experience: ['工作经历', '工作经验', '工作履历', '实习经历', 'experience', '职业经历', '工作'],
  skills: ['技能', '专业技能', 'skills', '技术栈', 'self-assessment', '自我评价', '个人优势'],
  projects: ['项目经历', '项目经验', 'projects', '项目'],
  other: ['证书', 'languages', '语言能力', '获奖', '荣誉']
}

const CONFIDENCE = {
  HIGH: 'high',
  MEDIUM: 'medium',
  LOW: 'low',
  MISSING: 'missing'
}

const EDUCATION_LEVELS = ['博士', '硕士', '研究生', '本科', '大专', '专科', '高中', '中专', 'MBA', 'EMBA']

const JOB_TITLES = ['工程师', '经理', '总监', '主管', '开发', '产品经理', '设计师', '架构师', '负责人', '专员', '顾问']

const COMPANY_SUFFIXES = ['公司', '科技', '网络', '集团', '信息', '软件', 'Corp', 'Ltd', 'Limited', 'Inc']

const COMMON_SKILLS = [
  'JavaScript', 'TypeScript', 'Python', 'Java', 'Go', 'C++', 'C#', 'Rust', 'PHP', 'Ruby',
  'Vue', 'React', 'Angular', 'Svelte', 'Next.js', 'Nuxt.js',
  'Node.js', 'Express', 'Koa', 'NestJS', 'Django', 'Flask', 'Spring',
  'HTML', 'CSS', 'Sass', 'Less', 'Webpack', 'Vite', 'Rollup',
  'MySQL', 'PostgreSQL', 'MongoDB', 'Redis', 'Elasticsearch',
  'Docker', 'Kubernetes', 'AWS', '阿里云', '腾讯云', 'Git', 'Linux'
]

// ========= 文本清洗与标准化工具 =========

function cleanText(rawText) {
  return rawText
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/[\u00A0\u2002-\u200B\u3000]/g, ' ')
    .replace(/([a-zA-Z0-9])\n(?=[a-zA-Z0-9])/g, '$1 ')
    .split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0 && !isHeaderFooter(line))
    .join('\n')
}

function isHeaderFooter(line) {
  const footerPatterns = [
    /^第\s*\d+\s*页/,
    /^\d+\s*\/\s*\d+$/,
    /^\s*\d+\s*$/,
    /^https?:\/\//,
    /^简历\s*更新/,
    /^ID:\s*\d+/
  ]
  return footerPatterns.some(p => p.test(line))
}

function mergeBrokenLines(text) {
  const lines = text.split('\n')
  const merged = []
  let buffer = ''

  for (const line of lines) {
    const trimmed = line.trim()
    const isShort = trimmed.length < 40
    const endsWithPunctuation = /[。，；：！？.!,;:?]$/.test(trimmed)
    const isListItem = /^[\d一二三四五六七八九十]+[.．、\s]/.test(trimmed)

    if (buffer && (isListItem || endsWithPunctuation || !isShort)) {
      merged.push(buffer.trim())
      buffer = trimmed
    } else if (isShort && !endsWithPunctuation && !isListItem) {
      buffer += ' ' + trimmed
    } else {
      if (buffer) merged.push(buffer.trim())
      buffer = trimmed
    }
  }
  if (buffer) merged.push(buffer.trim())
  return merged.join('\n')
}

function normalizePunctuation(text) {
  return text
    .replace(/：/g, ':')
    .replace(/　/g, ' ')
    .replace(/\s{2,}/g, ' ')
}

function extractInfo(text) {
  const info = {}
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean)

  const phoneMatch = text.match(/1[3-9]\d{9}/)
  if (phoneMatch) info.phone = phoneMatch[0]

  const emailMatch = text.match(/[\w.-]+@[\w.-]+\.\w+/)
  if (emailMatch) info.email = emailMatch[0]

  info.summary = lines.slice(0, 10).join('\n')
  return info
}

async function parseDocx(arrayBuffer) {
  const files = unzipSync(new Uint8Array(arrayBuffer))
  const docPath = Object.keys(files).find(k => k === 'word/document.xml')
  if (!docPath) return { summary: '无法解析 Word 文件内容' }

  const xmlText = new TextDecoder().decode(files[docPath])
  const texts = []
  const regex = /<w:t[^>]*>([^<]*)<\/w:t>/g
  let match
  while ((match = regex.exec(xmlText)) !== null) {
    texts.push(match[1])
  }
  const fullText = texts.join('')

  return extractInfo(fullText)
}

async function parsePdf(arrayBuffer) {
  const { extractText } = await import('unpdf')
  const { text } = await extractText(arrayBuffer, { mergePages: true })
  return extractInfo(text)
}

const FIELD_MAP = {
  '姓名': 'name', '名字': 'name', 'name': 'name',
  '手机': 'phone', '手机号': 'phone', '电话': 'phone', 'phone': 'phone',
  '邮箱': 'email', 'email': 'email',
  '目标岗位': 'position', '期望职位': 'position', '职位': 'position', 'position': 'position',
  '技能': 'skills', 'skills': 'skills',
  '学历': 'education', '最高学历': 'education', 'education': 'education',
  '工作年限': 'experience_years', '经验年限': 'experience_years', 'experience_years': 'experience_years',
  '来源': 'source', '来源渠道': 'source', 'source': 'source',
  '备注': 'summary', '评价': 'summary', 'summary': 'summary'
}

function parseExcel(arrayBuffer) {
  const workbook = read(arrayBuffer, { type: 'array' })
  const sheetName = workbook.SheetNames[0]
  const sheet = workbook.Sheets[sheetName]
  const rows = utils.sheet_to_json(sheet, { defval: '' })

  if (rows.length === 0) return { candidates: [] }

  const mappedRows = rows.map(row => {
    const mapped = {}
    for (const [key, value] of Object.entries(row)) {
      const field = FIELD_MAP[key.trim()] || FIELD_MAP[String(key).toLowerCase?.()]
      if (field) mapped[field] = value
    }
    return mapped
  })

  return { candidates: mappedRows }
}

function generateTemplateBuffer() {
  const headers = ['姓名', '手机号', '邮箱', '目标岗位', '技能', '学历', '工作年限', '来源', '备注']
  const ws = utils.aoa_to_sheet([headers])
  const wb = utils.book_new()
  utils.book_append_sheet(wb, ws, '候选人')
  const buf = write(wb, { type: 'array', bookType: 'xlsx' })
  return buf
}

async function parseFile(fileName, arrayBuffer) {
  const ext = fileName.substring(fileName.lastIndexOf('.')).toLowerCase()
  switch (ext) {
    case '.docx':
      return parseDocx(arrayBuffer)
    case '.pdf':
      return parsePdf(arrayBuffer)
    case '.xlsx':
    case '.xls':
    case '.csv':
      return parseExcel(arrayBuffer)
    default:
      throw new Error(`不支持的文件类型: ${ext}`)
  }
}

export { parseFile, parseExcel, generateTemplateBuffer }
