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

// ========= 区块分割 =========

function detectSection(line) {
  const lower = line.toLowerCase()
  for (const [section, keywords] of Object.entries(SECTION_KEYWORDS)) {
    for (const kw of keywords) {
      const regex = new RegExp(`(^|[\\s\\/:])${kw}($|[\\s\\/:：])`, 'i')
      if (regex.test(lower) || lower.includes(kw.toLowerCase())) {
        return section
      }
    }
  }
  return null
}

function splitSections(text) {
  const lines = text.split('\n')
  const sections = {
    profile: [],
    education: [],
    experience: [],
    skills: [],
    projects: [],
    other: [],
    unclassified: []
  }
  let current = 'unclassified'

  for (const line of lines) {
    const section = detectSection(line)
    if (section) {
      current = section
      continue
    }
    sections[current].push(line)
  }
  return sections
}

// ========= 字段提取 =========

const NAME_BLACKLIST = ['有限公司', '科技有限公司', '大学', '学院', '学校', '简历', '求职', '应聘', '招聘']
const INVALID_EMAIL_DOMAINS = ['example.com', 'test.com', 'email.com']

function isValidChineseName(name) {
  return /^[\u4e00-\u9fa5]{2,4}$/.test(name)
}

function findChineseName(line) {
  const matches = line.match(/[\u4e00-\u9fa5]{2,4}/g) || []
  for (const m of matches) {
    if (NAME_BLACKLIST.some(b => m.includes(b))) continue
    return m
  }
  return null
}

function extractName(sections, fullText) {
  const profileText = sections.profile.join('\n')

  const labelMatch = profileText.match(/(?:姓名|name)[\s:：]+([^\n]{2,20})/i)
  if (labelMatch) {
    const name = labelMatch[1].trim().replace(/[\s\d]/g, '')
    if (isValidChineseName(name)) return { value: name, confidence: CONFIDENCE.HIGH }
  }

  const candidates = sections.profile.slice(0, 5)
  for (const line of candidates) {
    const name = findChineseName(line)
    if (name) return { value: name, confidence: CONFIDENCE.MEDIUM }
  }

  const allLines = fullText.split('\n').slice(0, 10)
  for (const line of allLines) {
    const name = findChineseName(line)
    if (name) return { value: name, confidence: CONFIDENCE.LOW }
  }

  return { value: null, confidence: CONFIDENCE.MISSING }
}

function extractPhone(text) {
  const match = text.match(/1[3-9]\d{9}/)
  if (match) {
    const segment = match[0].slice(0, 2)
    if (['13', '14', '15', '16', '17', '18', '19'].includes(segment)) {
      return { value: match[0], confidence: CONFIDENCE.HIGH }
    }
  }
  return { value: null, confidence: CONFIDENCE.MISSING }
}

function extractEmail(text) {
  const match = text.match(/[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}/)
  if (match) {
    const email = match[0].toLowerCase()
    if (!INVALID_EMAIL_DOMAINS.some(d => email.endsWith(d))) {
      return { value: email, confidence: CONFIDENCE.HIGH }
    }
  }
  return { value: null, confidence: CONFIDENCE.MISSING }
}

function extractPosition(sections, fullText) {
  const keywords = ['意向岗位', '期望职位', '应聘岗位', '求职意向', '目标岗位', 'position wanted', 'job objective', '期望岗位']
  const text = sections.profile.join('\n') + '\n' + fullText
  for (const kw of keywords) {
    const regex = new RegExp(`${kw}[\s:：]+([^\n，,；;]{2,30})`, 'i')
    const match = text.match(regex)
    if (match) {
      const value = match[1].trim().replace(/（.*?）/g, '').replace(/\(.*?\)/g, '')
      if (value && !value.includes('面议') && !value.includes('不限')) {
        return { value, confidence: CONFIDENCE.MEDIUM }
      }
    }
  }
  return { value: null, confidence: CONFIDENCE.MISSING }
}

function extractEducation(sections) {
  const text = sections.education.join('\n') + '\n' + sections.profile.join('\n')
  let level = null
  let confidence = CONFIDENCE.MISSING

  for (const lvl of EDUCATION_LEVELS) {
    const regex = new RegExp(lvl, 'i')
    if (regex.test(text)) {
      level = lvl === '研究生' ? '硕士' : lvl
      confidence = CONFIDENCE.MEDIUM
      break
    }
  }

  const schoolMatch = text.match(/([^\n，,；;]{2,20}(?:大学|学院|学校|University|College))/i)
  const school = schoolMatch ? schoolMatch[1].trim() : null

  const majorMatch = text.match(/(?:专业|major)[\s:：]+([^\n，,；;]{2,20})/i)
  const major = majorMatch ? majorMatch[1].trim() : null

  return {
    value: { education: level, school, major },
    confidence: confidence === CONFIDENCE.MISSING && (school || major) ? CONFIDENCE.LOW : confidence
  }
}

function extractExperienceYears(sections, fullText) {
  const text = sections.profile.join('\n') + '\n' + fullText
  const directMatch = text.match(/(\d+)\s*[年余]?\s*(?:工作|相关|开发|从业|专业)?\s*经验/)
  if (directMatch) {
    return { value: parseInt(directMatch[1], 10), confidence: CONFIDENCE.MEDIUM }
  }

  const years = calculateYearsFromExperience(sections.experience)
  if (years !== null) {
    return { value: years, confidence: CONFIDENCE.LOW }
  }

  return { value: null, confidence: CONFIDENCE.MISSING }
}

function extractSkills(sections) {
  const text = sections.skills.join('\n')
  if (!text.trim()) return { value: [], confidence: CONFIDENCE.MISSING }

  const separators = /[,，、;；\n]/
  const tokens = text.split(separators).map(s => s.trim()).filter(Boolean)
  const skills = []

  for (const token of tokens) {
    const normalized = token.replace(/[（(].*?[）)]/g, '').trim()
    if (COMMON_SKILLS.some(s => s.toLowerCase() === normalized.toLowerCase())) {
      skills.push(normalized)
    } else if (normalized.length >= 2 && normalized.length <= 20 && !/公司|大学|学院/.test(normalized)) {
      skills.push(normalized)
    }
  }

  const unique = [...new Set(skills)].slice(0, 20)
  return {
    value: unique,
    confidence: unique.length > 0 ? CONFIDENCE.MEDIUM : CONFIDENCE.MISSING
  }
}

// ========= 工作经历提取 =========

const TIME_PATTERNS = [
  { regex: /(\d{4})\.(\d{1,2})\s*[-~至]\s*(\d{4})\.(\d{1,2}|至今)/ },
  { regex: /(\d{4})\/(\d{1,2})\s*[-~至]\s*(\d{4})\/(\d{1,2}|至今)/ },
  { regex: /(\d{4})\s*年\s*(\d{1,2})\s*月\s*[-~至]\s*(\d{4})\s*年\s*(\d{1,2})\s*月/ },
  { regex: /(\d{4})\s*年\s*(\d{1,2})\s*月\s*[-~至]\s*至今/ },
  { regex: /(\d{4})\.(\d{1,2})\s*[-~至]\s*至今/ }
]

function parseTimeRange(text) {
  for (const pattern of TIME_PATTERNS) {
    const match = text.match(pattern.regex)
    if (match) {
      const startYear = match[1].padStart(4, '20')
      const startMonth = match[2].padStart(2, '0')
      let endDate = 'present'
      if (match[3] && match[3] !== '至今') {
        const endYear = match[3].padStart(4, '20')
        const endMonth = match[4] ? match[4].padStart(2, '0') : '12'
        endDate = `${endYear}-${endMonth}`
      }
      return { start_date: `${startYear}-${startMonth}`, end_date: endDate }
    }
  }
  return null
}

function extractCompany(text) {
  const lines = text.split('\n')
  for (const line of lines) {
    const match = line.match(/([^\n，,；;]{2,40}(?:公司|科技|网络|集团|信息|软件|Corp|Ltd|Limited|Inc))/i)
    if (match) return match[1].trim()
  }
  return null
}

function extractTitle(text) {
  const lines = text.split('\n')
  for (const line of lines) {
    for (const title of JOB_TITLES) {
      if (line.includes(title)) {
        const match = line.match(new RegExp(`([^\\n，,；;]{2,30}${title})`))
        if (match) return match[1].trim()
      }
    }
  }
  return null
}

function splitExperienceEntries(text) {
  const entries = []
  let current = ''
  const lines = text.split('\n')

  for (const line of lines) {
    if (parseTimeRange(line) && current.trim()) {
      entries.push(current.trim())
      current = line
    } else {
      current += '\n' + line
    }
  }
  if (current.trim()) entries.push(current.trim())

  return entries.length > 0 ? entries : [text]
}

function extractExperiences(sections) {
  const text = sections.experience.join('\n')
  if (!text.trim()) return { value: [], confidence: CONFIDENCE.MISSING }

  const entries = splitExperienceEntries(text)
  const experiences = []

  for (const entry of entries) {
    const timeRange = parseTimeRange(entry)
    const company = extractCompany(entry)
    const title = extractTitle(entry)

    experiences.push({
      company: company || '',
      title: title || '',
      start_date: timeRange ? timeRange.start_date : '',
      end_date: timeRange ? timeRange.end_date : '',
      description: entry.replace(/\n/g, ' ').trim()
    })
  }

  const validCount = experiences.filter(e => e.company && e.title && e.start_date).length
  const confidence = validCount === experiences.length && experiences.length > 0
    ? CONFIDENCE.MEDIUM
    : (experiences.length > 0 ? CONFIDENCE.LOW : CONFIDENCE.MISSING)

  return { value: experiences, confidence }
}

function calculateYearsFromExperience(experienceLines) {
  const text = experienceLines.join('\n')
  const ranges = []
  let match
  const regex = /(\d{4})[./](\d{1,2})\s*[-~至]\s*(\d{4})[./](\d{1,2}|至今)/g
  while ((match = regex.exec(text)) !== null) {
    const start = new Date(`${match[1].padStart(4, '20')}-${match[2].padStart(2, '0')}-01`)
    let end = new Date()
    if (match[3] !== '至今') {
      end = new Date(`${match[3].padStart(4, '20')}-${match[4].padStart(2, '0')}-01`)
    }
    ranges.push({ start, end })
  }

  if (ranges.length === 0) return null

  const earliest = new Date(Math.min(...ranges.map(r => r.start)))
  const latest = new Date(Math.max(...ranges.map(r => r.end)))
  const months = (latest.getFullYear() - earliest.getFullYear()) * 12 + (latest.getMonth() - earliest.getMonth())
  return Math.max(1, Math.round(months / 12))
}

function extractInfo(rawText) {
  const cleaned = normalizePunctuation(mergeBrokenLines(cleanText(rawText)))
  const sections = splitSections(cleaned)

  const nameResult = extractName(sections, cleaned)
  const phoneResult = extractPhone(cleaned)
  const emailResult = extractEmail(cleaned)
  const positionResult = extractPosition(sections, cleaned)
  const educationResult = extractEducation(sections)
  const yearsResult = extractExperienceYears(sections, cleaned)
  const skillsResult = extractSkills(sections)
  const experiencesResult = extractExperiences(sections)

  const summary = sections.skills.slice(0, 5).join('\n') || cleaned.split('\n').slice(0, 5).join('\n')

  return {
    name: nameResult.value,
    phone: phoneResult.value,
    email: emailResult.value,
    position: positionResult.value,
    education: educationResult.value.education,
    school: educationResult.value.school,
    major: educationResult.value.major,
    experience_years: yearsResult.value,
    skills: skillsResult.value,
    summary,
    experiences: experiencesResult.value,
    raw_text: cleaned,
    confidence: {
      name: nameResult.confidence,
      phone: phoneResult.confidence,
      email: emailResult.confidence,
      position: positionResult.confidence,
      education: educationResult.confidence,
      school: educationResult.value.school ? CONFIDENCE.MEDIUM : CONFIDENCE.MISSING,
      major: educationResult.value.major ? CONFIDENCE.MEDIUM : CONFIDENCE.MISSING,
      experience_years: yearsResult.confidence,
      skills: skillsResult.confidence,
      experiences: experiencesResult.confidence
    }
  }
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

export { parseFile, parseExcel, generateTemplateBuffer, extractInfo }
