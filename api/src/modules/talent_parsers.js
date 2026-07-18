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
    if (!trimmed) continue

    // Only merge lines that look like a PDF line-break inside an English/number token.
    const endsWithContinuation = buffer && /^[a-zA-Z0-9]$/.test(buffer.slice(-1)) && !/[\-]$/.test(buffer)
    const startsWithContinuation = /^[a-zA-Z0-9]/.test(trimmed)

    if (buffer && endsWithContinuation && startsWithContinuation) {
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
    }
    sections[current].push(line)
  }
  return sections
}

// ========= 字段提取 =========

const NAME_BLACKLIST = ['有限公司', '科技有限公司', '大学', '学院', '学校', '简历', '求职', '应聘', '招聘', '姓名', '名字', '手机', '电话', '邮箱', '邮箱地址', '联系方式', '这是', '一份', '几乎', '为空', '的简历', '教育背景', '教育经历', '工作经历', '工作经验', '工作履历', '实习经历', '专业技能', '技能', '项目经历', '项目经验', '个人信息', '基本信息', '联系方式', '自我评价', '个人优势', '求职意向']
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

  const labelMatch = profileText.match(/(?:姓名|名字|name)\s*[:：\s]\s*([^\n]{2,30})/i)
  if (labelMatch) {
    let raw = labelMatch[1].trim()
    // 截断后续标签内容（如"张三 手机：138..."）
    raw = raw.split(/\s+(?:手机|电话|邮箱|email|phone|联系方式|出生|地址|性别|年龄)/i)[0].trim()
    const cleaned = raw.replace(/[\s\d]/g, '')
    if (isValidChineseName(cleaned)) return { value: cleaned, confidence: CONFIDENCE.HIGH }
    // 英文名支持
    if (/^[a-zA-Z][a-zA-Z\s.\-']{1,29}$/.test(raw)) {
      return { value: raw.trim(), confidence: CONFIDENCE.HIGH }
    }
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

  const schoolMatch = text.match(/([^\n，,；;]{2,20}?(?:大学|学院|学校|University|College))/i)
  const school = schoolMatch ? schoolMatch[1].trim() : null

  let major = null
  const majorLabelMatch = text.match(/(?:专业|major)[\s:：]+([^\n，,；;]{2,20})/i)
  if (majorLabelMatch) {
    major = majorLabelMatch[1].trim()
  } else if (schoolMatch) {
    const afterSchool = text.slice(text.indexOf(schoolMatch[0]) + schoolMatch[0].length)
    const cleanedAfter = afterSchool.replace(new RegExp(`^\\s*[,，]?\\s*(${EDUCATION_LEVELS.join('|')})\\s*`), '').trim()
    const majorMatch = cleanedAfter.match(/^[^\n\d，,；;]{2,20}/)
    if (majorMatch) major = majorMatch[0].trim()
  }

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
    const match = line.match(/([^\n，,；;]{2,30}(?:公司|科技|网络|集团|信息|软件|Corp|Ltd|Limited|Inc))/i)
    if (match) {
      const company = match[1].trim()
      if (!/^(负责|在|到|于|就职|担任|任职)/.test(company)) return company
    }
  }
  return null
}

function extractTitle(text) {
  const lines = text.split('\n')
  for (const line of lines) {
    for (const title of JOB_TITLES) {
      if (line.includes(title)) {
        const match = line.match(new RegExp(`(?:^|[\\s，,；;])([^\\s，,；;]{0,15}${title})(?:$|[\\s，,；;])`))
        if (match) return match[1].trim()
      }
    }
  }
  return null
}

function splitExperienceEntries(text) {
  const pattern = /(\d{4}[./]\d{1,2}\s*[-~至]\s*(?:\d{4}[./]\d{1,2}|至今))/g
  const parts = text.split(pattern)
  if (parts.length < 3) return [text]

  const entries = []
  let header = parts[0].trim()

  for (let i = 1; i < parts.length; i += 2) {
    const time = parts[i]
    const body = parts[i + 1] || ''
    entries.push(`${header}\n${time}\n${body}`.trim())
    const bodyLines = body.split('\n').filter(Boolean)
    header = bodyLines.slice(-2).join('\n')
  }

  return entries
}

function extractExperiences(sections) {
  const text = sections.experience.filter(line => !detectSection(line)).join('\n')
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
  let files
  try {
    files = unzipSync(new Uint8Array(arrayBuffer))
  } catch (err) {
    throw new Error('无法解压 Word 文件: ' + err.message)
  }

  const docPath = Object.keys(files).find(k => /^word\/document\d*\.xml$/i.test(k))
  if (!docPath) {
    throw new Error('无法解析 Word 文件内容：找不到 document.xml')
  }

  const xmlText = new TextDecoder().decode(files[docPath])

  // Preserve paragraph/line breaks and tabs before stripping tags
  const normalizedXml = xmlText
    .replace(/<\/w:p>/gi, '\n')
    .replace(/<w:br\s*\/>/gi, '\n')
    .replace(/<w:tab\s*\/>/gi, '\t')

  const texts = []
  const regex = /<w:t[^>]*>([^<]*)<\/w:t>/gi
  let match
  while ((match = regex.exec(normalizedXml)) !== null) {
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

// ========= .doc 文件解析（支持 OLE 二进制 / RTF / HTML 伪装格式）=========

function isDocTextChar(code) {
  if (code >= 0x20 && code <= 0x7E) return true   // ASCII 可打印
  if (code >= 0x4E00 && code <= 0x9FFF) return true // CJK 统一汉字
  if (code >= 0x3000 && code <= 0x303F) return true // CJK 标点
  if (code >= 0xFF00 && code <= 0xFFEF) return true // 全角符号
  if (code === 0x09 || code === 0x0A || code === 0x0D) return true
  return false
}

function extractTextFromDocBinary(bytes) {
  const chunks = []
  let current = ''

  for (let i = 0; i + 1 < bytes.length; i += 2) {
    const code = bytes[i] | (bytes[i + 1] << 8)
    if (code === 0x0D || code === 0x0A) {
      if (current.trim().length >= 2) chunks.push(current.trim())
      current = ''
      continue
    }
    if (isDocTextChar(code)) {
      current += String.fromCharCode(code)
    } else {
      if (current.trim().length >= 4) chunks.push(current.trim())
      current = ''
    }
  }
  if (current.trim().length >= 2) chunks.push(current.trim())

  const text = chunks.join('\n')
  if (text.length < 20) {
    throw new Error('无法从 .doc 文件中提取足够文本，请尝试另存为 .docx 或 PDF 格式')
  }
  return text
}

function parseRtf(text) {
  const plain = text
    .replace(/\\par[d]?/gi, '\n')
    .replace(/\\tab/gi, '\t')
    .replace(/\\'([0-9a-fA-F]{2})/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
    .replace(/\\u(-?\d+)\??\*?/g, (_, code) => String.fromCharCode(parseInt(code)))
    .replace(/\\[a-zA-Z]+-?\d* ?/g, '')
    .replace(/[{}]/g, '')
    .trim()
  return extractInfo(plain)
}

function parseHtml(text) {
  const plain = text
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<\/div>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .trim()
  return extractInfo(plain)
}

async function parseDoc(arrayBuffer) {
  const bytes = new Uint8Array(arrayBuffer)

  // ZIP 魔数 → 实际是 docx
  if (bytes[0] === 0x50 && bytes[1] === 0x4B) {
    return parseDocx(arrayBuffer)
  }

  const headerStr = new TextDecoder().decode(bytes.slice(0, 20))

  // RTF 格式
  if (headerStr.startsWith('{\\rtf')) {
    return parseRtf(new TextDecoder().decode(bytes))
  }

  // HTML 格式（部分系统导出的 .doc 实际是 HTML）
  const lower = headerStr.toLowerCase()
  if (lower.includes('<html') || lower.includes('<!doctype') || lower.includes('<meta')) {
    return parseHtml(new TextDecoder().decode(bytes))
  }

  // OLE Compound File（真正的 .doc 二进制格式）
  if (bytes[0] === 0xD0 && bytes[1] === 0xCF && bytes[2] === 0x11 && bytes[3] === 0xE0) {
    const text = extractTextFromDocBinary(bytes)
    return extractInfo(text)
  }

  // 兜底：尝试当纯文本解析
  const text = new TextDecoder().decode(bytes)
  if (text.length > 20) return extractInfo(text)

  throw new Error('无法识别的 Word 文件格式，请尝试另存为 .docx 或 PDF 格式')
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
    case '.doc':
      return parseDoc(arrayBuffer)
    case '.pdf':
      return parsePdf(arrayBuffer)
    case '.txt':
      return parseTxt(arrayBuffer)
    case '.xlsx':
    case '.xls':
    case '.csv':
      return parseExcel(arrayBuffer)
    default:
      throw new Error(`不支持的文件类型: ${ext}`)
  }
}

// ========= 纯文本 → 语义化 HTML（用于 DOC/TXT 预览）=========

const SECTION_HEADERS = new Set([
  '基本信息', '个人信息', '联系方式', 'profile',
  '求职意向', '应聘意向', '工作意向', 'job objective',
  '教育背景', '教育经历', '学历', 'education',
  '工作经历', '工作经验', '工作履历', '实习经历', 'experience', '职业经历',
  '项目经历', '项目经验', '项目', 'projects',
  '专业技能', '技能', '技术能力', '技术栈', 'skills',
  '自我评价', '个人优势', '自我评估', 'summary',
  '获奖情况', '荣誉证书', '证书', 'languages', '语言能力',
  '社会活动', '校园经历', '附加信息'
])

const SUB_SECTION_HEADERS = new Set([
  '项目名称', '项目时间', '开发时间', '项目周期',
  '系统架构', '技术架构', '项目架构',
  '项目描述', '项目职责', '责任描述', '职责描述', '个人职责',
  '教育时间', '就读时间', '毕业院校', '所学专业', '主修课程'
])

const LABELS = new Set([
  '姓名', '名字', 'name', '年龄', '性别', '民族', '籍贯', '户口', '现居', '居住地', '现居住地', '政治面貌', '婚姻状况',
  '手机', '电话', '手机号', '联系方式', '邮箱', '电子邮件', 'email',
  '应聘职位', '期望职位', '目标岗位', '意向岗位', '求职岗位', '职位', '岗位',
  '期望地点', '期望城市', '工作地点', '到岗时间', '目前状况',
  '期望薪资', '目前薪资', '薪资要求',
  '工作年限', '工作经验', '从业年限',
  '学历', '学位', '毕业院校', '专业', '学校'
])

const GARBAGE_PATTERNS = [
  /^Root Entry$/i,
  /^SummaryInformation$/i,
  /^DocumentSummaryInformation$/i,
  /^WordDocument$/i,
  /^Normal\.dotm$/i,
  /^Administrator$/i,
  /^WPS Office/i,
  /^WpsCustomData$/i,
  /^KSOProductBuildVer$/i,
  /^KSORubyTemplateID$/i,
  /^icon_quote$/i,
  /^[\d.]+-[\d.]+-[\d.]+$/,
  /^[\d]{4}-[\d]{2}-[\d]{2}T[\d]{2}:[\d]{2}:[\d]{2}Z$/,
  /^(Data|Table|髁|隠|钡|鞟|龧|邚|粆|桲|呞|粉|晰|剜|箇|汳|層|螏|牿|孨|辗|羇|摱|夁|尀|脈|俾)$/,
  /^标题 \d+$/,
  /^标题 \d+ Char$/,
  /^默认段落字体$/,
  /^普通表格$/,
  /^批注主题 Char$/,
  /^批注框文本$/,
  /^批注框文本 Char$/,
  /^数字 Char Char$/,
  /^[\x00-\x1f\x7f]+$/,
  /^图片 \d+$/,
  /^\d{4}-\d{2}(\.\d+)+$/,
  /^[^_\s]{2,10}_[\u4e00-\u9fa5a-zA-Z]+工程师$/,
  /^xuwei$/i,
  /^\d+Table$/i,
  /^HYPERLINK\s/
]

function isGarbageLine(line) {
  const trimmed = line.trim()
  if (!trimmed) return true
  if (trimmed.length > 200) return false
  if (GARBAGE_PATTERNS.some(p => p.test(trimmed))) return true

  // 过滤 Word 样式名 / 字体名片段
  const styleKeywords = /Char|段落|文本|缩进|结构图|批注|主题|普通|列出|预设格式|文档|网站|正文|标题 \d+|默认|表格|字体|刀漀洀愀渀|吀椀洀攀猀|圀椀渀最搀椀渀最猀|匀愀渀猀|伀瀀攀渀|倀爀椀渀琀|愀氀椀戀爀椀|搀洀椀渀椀猀琀爀愀琀漀爀|㄀-ㄯ|ㆠ-ㆿ/
  if (styleKeywords.test(trimmed) && trimmed.length < 60) return true

  // 过滤高 Unicode 生僻字/乱码：CJK 扩展 A-F 等非常用区
  const rareRegex = /[\u{3400}-\u{4dbf}\u{20000}-\u{2a6df}\u{2a700}-\u{2b73f}\u{2b740}-\u{2b81f}\u{2b820}-\u{2ceaf}\u{2ceb0}-\u{2ebef}\u{30000}-\u{3134f}]/gu
  const rareChars = trimmed.match(rareRegex) || []
  const rareRatio = rareChars.length / trimmed.length
  // 短行只要包含生僻字即视为乱码；长行按比例
  if ((trimmed.length <= 8 && rareChars.length > 0) || rareRatio > 0.3) return true

  // 过滤中英文字体名乱码：大量拉丁字母但组合无意义
  const latinChars = trimmed.replace(/[^a-zA-Z]/g, '').length
  const cjkChars = trimmed.replace(/[^\u4e00-\u9fa5]/g, '').length
  if (latinChars > 0 && cjkChars === 0 && /^[a-zA-Z]+$/.test(trimmed) && ['Times', 'Roman', 'Wingdings', 'Arial', 'Open', 'Sans', 'Segoe', 'Print', 'Unicode', 'Administrator'].some(f => trimmed.toLowerCase().includes(f.toLowerCase()))) {
    return true
  }

  // 过滤符号/乱码混杂的短行：如 "＄*篠$"、"岁脈(俾"
  const symbolRatio = trimmed.replace(/[\u4e00-\u9fa5a-zA-Z0-9\s]/g, '').length / trimmed.length
  if (trimmed.length <= 10 && symbolRatio > 0.3 && rareChars.length === 0) return true

  return false
}

function isSectionHeader(line) {
  const normalized = line.trim().replace(/[:：]\s*$/, '').toLowerCase()
  if (SECTION_HEADERS.has(normalized) || SECTION_HEADERS.has(line.trim())) return true
  // 兼容 "工作经历 :" 或 "工作经历 内容"
  const startWord = normalized.split(/\s/)[0]
  return SECTION_HEADERS.has(startWord)
}

function isSubSectionHeader(line) {
  const normalized = line.trim().replace(/[:：]\s*$/, '').toLowerCase()
  if (SUB_SECTION_HEADERS.has(normalized) || SUB_SECTION_HEADERS.has(line.trim())) return true
  const startWord = normalized.split(/\s/)[0]
  return SUB_SECTION_HEADERS.has(startWord)
}

function parseLabelValue(line) {
  // 先把 label 与冒号之间的多余空格压缩，兼容 "姓    名 : 高翔"
  const normalized = line.replace(/^([\u4e00-\u9fa5a-zA-Z\s]{1,15})\s*[:：]\s*/, (_, rawLabel) => `${rawLabel.replace(/\s+/g, '')}：`)
  const match = normalized.match(/^([\u4e00-\u9fa5a-zA-Z]{1,10})[:：](.+)$/)
  if (!match) return null
  const label = match[1].trim()
  const value = match[2].trim()
  if (!LABELS.has(label) && !LABELS.has(label.toLowerCase())) return null
  return { label, value }
}

function isListItem(line) {
  return /^[•·\-\*•●○■□▶▸◆◇]\s+/.test(line) || /^\d+[\.、)）]\s+/.test(line)
}

function stripListMarker(line) {
  return line.replace(/^[•·\-\*•●○■□▶▸◆◇]\s+/, '').replace(/^\d+[\.、)）]\s+/, '')
}

function stripTrailingEmptySections(html) {
  // 移除末尾没有实质内容的空章节标题（Word 尾部常出现连续的虚假 "个人信息/工作经历" 等章节名）
  let result = html
  let prev
  do {
    prev = result
    result = result
      .replace(/\s*<h[23][^>]*>[^<]*<\/h[23]>\s*$/, '')
      .replace(/\s*<(p|ul|ol|li)(?:[^>]*)>(?:\s|&nbsp;)*<\/\1>\s*$/, '')
  } while (result !== prev)
  return result
}

function textLinesToSemanticHtml(lines) {
  const html = []
  let inList = false
  let consecutiveGarbage = 0
  let consecutiveSections = 0
  let hasSeenSection = false
  const GARBAGE_STOP_THRESHOLD = 3
  const SECTION_BREAK_THRESHOLD = 3

  for (const rawLine of lines) {
    const line = rawLine.trim()
    if (!line) continue

    if (isGarbageLine(line)) {
      consecutiveGarbage++
      // 进入正文章节后，连续出现 N 行垃圾内容时，判定已进入文档尾部乱码区，停止解析
      if (hasSeenSection && consecutiveGarbage >= GARBAGE_STOP_THRESHOLD) break
      continue
    }
    consecutiveGarbage = 0

    if (isSectionHeader(line)) {
      hasSeenSection = true
      consecutiveSections++
      // Word 文档尾部常连续出现多个虚假章节标题（个人信息/求职意向/工作经历...），
      // 连续 N 个无实质内容的章节即可判定为乱码区，停止解析
      if (consecutiveSections >= SECTION_BREAK_THRESHOLD) break
      if (inList) { html.push('</ul>'); inList = false }
      html.push(`<h2>${escapeHtml(line.replace(/[:：]\s*$/, ''))}</h2>`)
      continue
    }
    consecutiveSections = 0

    const labelValue = parseLabelValue(line)
    if (labelValue) {
      if (inList) { html.push('</ul>'); inList = false }
      html.push(`<p class="resume-field"><strong class="resume-label">${escapeHtml(labelValue.label)}：</strong><span class="resume-value">${escapeHtml(labelValue.value)}</span></p>`)
      continue
    }

    if (isSubSectionHeader(line)) {
      if (inList) { html.push('</ul>'); inList = false }
      html.push(`<h3>${escapeHtml(line.replace(/[:：]\s*$/, ''))}</h3>`)
      continue
    }

    if (isListItem(line)) {
      if (!inList) { html.push('<ul>'); inList = true }
      html.push(`<li>${escapeHtml(stripListMarker(line))}</li>`)
      continue
    }

    if (inList) { html.push('</ul>'); inList = false }
    html.push(`<p>${escapeHtml(line)}</p>`)
  }

  if (inList) html.push('</ul>')
  return stripTrailingEmptySections(html.join('\n')) || '<p>文档内容为空</p>'
}

// ========= .txt 文件解析（自动检测编码）=========

function parseTxt(arrayBuffer) {
  const bytes = new Uint8Array(arrayBuffer)
  // 优先尝试 UTF-8 解码
  let text = new TextDecoder('utf-8').decode(bytes)
  // 如果出现替换字符（说明不是有效的 UTF-8），尝试 GBK 解码
  if (text.includes('\uFFFD')) {
    try {
      const gbkText = new TextDecoder('gbk').decode(bytes)
      // 仅当 GBK 解码结果不含替换字符时才采用
      if (!gbkText.includes('\uFFFD')) {
        text = gbkText
      }
    } catch {
      // GBK 解码失败，保留 UTF-8 结果
    }
  }
  return extractInfo(text)
}

// ========= Word → HTML 转换（用于附件在线预览）=========

// HTML 转义，防止 XSS（Word 文档中可能包含恶意内容）
function escapeHtml(text) {
  if (!text) return ''
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function parseRels(files) {
  const relsPath = Object.keys(files).find(k => /^word\/_rels\/document\.xml\.rels$/i.test(k))
  if (!relsPath) return {}
  const relsXml = new TextDecoder().decode(files[relsPath])
  const rels = {}
  const regex = /<Relationship\s+Id="([^"]+)"\s+Type="[^"]+"\s+Target="([^"]+)"\/?/gi
  let match
  while ((match = regex.exec(relsXml)) !== null) {
    rels[match[1]] = match[2]
  }
  return rels
}

function bytesToBase64(bytes) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'
  let result = ''
  let i = 0
  const len = bytes.length
  while (i < len) {
    const a = bytes[i++]
    const b = i < len ? bytes[i++] : 0
    const c = i < len ? bytes[i++] : 0
    result += chars[a >> 2]
    result += chars[((a & 3) << 4) | (b >> 4)]
    result += i > len ? '=' : chars[((b & 15) << 2) | (c >> 6)]
    result += i > len + 1 ? '=' : chars[c & 63]
  }
  return result
}

function extractImages(files, rels) {
  const images = {}
  for (const [id, target] of Object.entries(rels)) {
    if (target.startsWith('media/')) {
      const mediaPath = `word/${target}`
      if (files[mediaPath]) {
        const bytes = new Uint8Array(files[mediaPath])
        const ext = target.split('.').pop().toLowerCase()
        let mimeType = 'image/png'
        if (ext === 'jpg' || ext === 'jpeg') mimeType = 'image/jpeg'
        else if (ext === 'gif') mimeType = 'image/gif'
        else if (ext === 'bmp') mimeType = 'image/bmp'
        images[id] = `data:${mimeType};base64,${bytesToBase64(bytes)}`
      }
    }
  }
  return images
}

function getParagraphStyle(p) {
  const styles = []
  
  const alignMatch = p.match(/<w:jc\s[^>]*w:val="([^"]+)"/i)
  if (alignMatch) {
    const alignMap = { 'left': 'text-align: left', 'center': 'text-align: center', 'right': 'text-align: right', 'justify': 'text-align: justify' }
    if (alignMap[alignMatch[1]]) styles.push(alignMap[alignMatch[1]])
  }

  const indMatch = p.match(/<w:ind\s[^>]*([^>]+)/i)
  if (indMatch) {
    const indStr = indMatch[1]
    const leftMatch = indStr.match(/w:left="([^"]+)"/i)
    const rightMatch = indStr.match(/w:right="([^"]+)"/i)
    const firstLineMatch = indStr.match(/w:firstLine="([^"]+)"/i)
    if (leftMatch) styles.push(`padding-left: ${parseInt(leftMatch[1]) / 20}px`)
    if (rightMatch) styles.push(`padding-right: ${parseInt(rightMatch[1]) / 20}px`)
    if (firstLineMatch) styles.push(`text-indent: ${parseInt(firstLineMatch[1]) / 20}px`)
  }

  const spacingMatch = p.match(/<w:spacing\s[^>]*([^>]+)/i)
  if (spacingMatch) {
    const spacingStr = spacingMatch[1]
    const beforeMatch = spacingStr.match(/w:before="([^"]+)"/i)
    const afterMatch = spacingStr.match(/w:after="([^"]+)"/i)
    const lineMatch = spacingStr.match(/w:line="([^"]+)"/i)
    if (beforeMatch) styles.push(`margin-top: ${parseInt(beforeMatch[1]) / 20}px`)
    if (afterMatch) styles.push(`margin-bottom: ${parseInt(afterMatch[1]) / 20}px`)
    if (lineMatch) styles.push(`line-height: ${parseInt(lineMatch[1]) / 240}`)
  }

  return styles.length > 0 ? ` style="${styles.join('; ')}"` : ''
}

function getRunStyle(runContent) {
  const styles = []

  const szMatch = runContent.match(/<w:sz\s[^>]*w:val="([^"]+)"/i)
  if (szMatch) styles.push(`font-size: ${parseInt(szMatch[1]) / 2}px`)

  const colorMatch = runContent.match(/<w:color\s[^>]*w:val="([^"]+)"/i)
  if (colorMatch) styles.push(`color: #${colorMatch[1]}`)

  return styles.length > 0 ? ` style="${styles.join('; ')}"` : ''
}

function parseDrawing(p, images) {
  const drawingRegex = /<w:drawing[\s\S]*?<\/w:drawing>/gi
  const matches = []
  let match
  while ((match = drawingRegex.exec(p)) !== null) {
    matches.push(match[0])
  }
  if (matches.length === 0) return []

  const result = []
  for (const drawing of matches) {
    const blipMatch = drawing.match(/<a:blip\s[^>]*r:embed="([^"]+)"/i)
    if (blipMatch && images[blipMatch[1]]) {
      result.push(`<img src="${images[blipMatch[1]]}" style="max-width: 100%; height: auto; display: inline-block; vertical-align: middle;" />`)
    }
  }
  return result
}

function docxToHtml(arrayBuffer) {
  let files
  try {
    files = unzipSync(new Uint8Array(arrayBuffer))
  } catch {
    return '<p>无法解压 Word 文件</p>'
  }

  const docPath = Object.keys(files).find(k => /^word\/document\d*\.xml$/i.test(k))
  if (!docPath) return '<p>无法找到文档内容</p>'

  const rels = parseRels(files)
  const images = extractImages(files, rels)

  const xml = new TextDecoder().decode(files[docPath])
  const paragraphs = xml.split(/<\/w:p>/i)
  const htmlParts = []

  for (const p of paragraphs) {
    if (!p.includes('<w:')) continue

    const isHeading = /<w:pStyle\s[^>]*w:val="[^"]*[Hh]eading/i.test(p)
    const pStyle = getParagraphStyle(p)

    const imagesInPara = parseDrawing(p, images)

    const runs = []
    const runRegex = /<w:r[^>]*>([\s\S]*?)<\/w:r>/gi
    let match
    while ((match = runRegex.exec(p)) !== null) {
      const runContent = match[1]
      const isBold = /<w:b\s*\/>/i.test(runContent) || /<w:b\s[^>]*w:val="(?:1|true|on)"/i.test(runContent)
      const isItalic = /<w:i\s*\/>/i.test(runContent) || /<w:i\s[^>]*w:val="(?:1|true|on)"/i.test(runContent)
      const isUnderline = /<w:u\s*\/>/i.test(runContent) || /<w:u\s[^>]*w:val="single"/i.test(runContent)
      const runStyle = getRunStyle(runContent)

      const texts = []
      const textRegex = /<w:t[^>]*>([^<]*)<\/w:t>/gi
      let textMatch
      while ((textMatch = textRegex.exec(runContent)) !== null) {
        texts.push(textMatch[1])
      }
      let text = texts.join('').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&apos;/g, "'")
      text = escapeHtml(text)

      text = text.replace(/&lt;br&gt;/gi, '<br>')

      if (text || isBold || isItalic || isUnderline || runStyle) {
        let spanContent = text || ''
        if (runStyle) spanContent = `<span${runStyle}>${spanContent}</span>`
        if (isBold) spanContent = `<strong>${spanContent}</strong>`
        if (isItalic) spanContent = `<em>${spanContent}</em>`
        if (isUnderline) spanContent = `<u>${spanContent}</u>`
        runs.push(spanContent)
      }
    }

    const content = [...imagesInPara, ...runs].join('')
    if (content.trim()) {
      if (isHeading) {
        htmlParts.push(`<h3${pStyle}>${content}</h3>`)
      } else {
        htmlParts.push(`<p${pStyle}>${content}</p>`)
      }
    }
  }

  return htmlParts.join('\n') || '<p>文档内容为空</p>'
}

// GBK 编码的 .doc 文件文本提取（作为 UTF-16LE 的回退方案）
function extractTextFromDocBinaryGBK(bytes) {
  const chunks = []
  let current = []

  for (let i = 0; i < bytes.length; i++) {
    const b = bytes[i]
    if (b === 0x0D || b === 0x0A) {
      if (current.length >= 4) {
        try {
          const decoded = new TextDecoder('gbk').decode(new Uint8Array(current))
          if (decoded.trim().length >= 2) chunks.push(decoded.trim())
        } catch { /* 忽略解码失败 */ }
      }
      current = []
      continue
    }
    // ASCII 可打印字符
    if (b >= 0x20 && b <= 0x7E) {
      current.push(b)
    } else if (b >= 0x81 && b <= 0xFE && i + 1 < bytes.length) {
      // GBK 双字节字符的首字节范围
      const b2 = bytes[i + 1]
      if ((b2 >= 0x40 && b2 <= 0xFE) && b2 !== 0x7F) {
        current.push(b, b2)
        i++
      } else {
        if (current.length >= 4) {
          try {
            const decoded = new TextDecoder('gbk').decode(new Uint8Array(current))
            if (decoded.trim().length >= 2) chunks.push(decoded.trim())
          } catch { /* 忽略解码失败 */ }
        }
        current = []
      }
    } else {
      if (current.length >= 4) {
        try {
          const decoded = new TextDecoder('gbk').decode(new Uint8Array(current))
          if (decoded.trim().length >= 2) chunks.push(decoded.trim())
        } catch { /* 忽略解码失败 */ }
      }
      current = []
    }
  }
  if (current.length >= 4) {
    try {
      const decoded = new TextDecoder('gbk').decode(new Uint8Array(current))
      if (decoded.trim().length >= 2) chunks.push(decoded.trim())
    } catch { /* 忽略解码失败 */ }
  }

  const text = chunks.join('\n')
  return text
}

// 统计文本中常见中文字符的数量，用于判断编码是否正确
function countCommonChineseChars(text) {
  const commonChars = '的是不了在有人我他这中大来上个国和也子时道说那要她你'
  let count = 0
  for (const ch of text) {
    if (commonChars.includes(ch)) count++
  }
  return count
}

function docToHtml(arrayBuffer) {
  const bytes = new Uint8Array(arrayBuffer)

  // ZIP → 实际是 docx
  if (bytes[0] === 0x50 && bytes[1] === 0x4B) {
    return docxToHtml(arrayBuffer)
  }

  // OLE 二进制 → 提取文本转 HTML
  if (bytes[0] === 0xD0 && bytes[1] === 0xCF) {
    // 先尝试 UTF-16LE 解码（当前方案）
    const utf16Text = extractTextFromDocBinary(bytes)
    // 再尝试 GBK 解码（部分旧版 .doc 文件使用 GBK 编码）
    const gbkText = extractTextFromDocBinaryGBK(bytes)
    // 通过常见中文字符数量判断哪种编码更正确
    const utf16Score = countCommonChineseChars(utf16Text)
    const gbkScore = countCommonChineseChars(gbkText)
    const text = (gbkScore > utf16Score && gbkText.length >= 20) ? gbkText : utf16Text
    return textLinesToSemanticHtml(text.split('\n'))
  }

  // RTF
  const header = new TextDecoder().decode(bytes.slice(0, 20))
  if (header.startsWith('{\\rtf')) {
    // RTF 文本提取，处理 \u 和 \' 转义序列以正确支持中文
    const fullText = new TextDecoder().decode(bytes)
      .replace(/\\par[d]?/gi, '\n')
      .replace(/\\tab/gi, '\t')
      .replace(/\\'([0-9a-fA-F]{2})/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
      .replace(/\\u(-?\d+)\??\*?/g, (_, code) => String.fromCharCode(parseInt(code)))
      .replace(/\\[a-zA-Z]+-?\d* ?/g, '')
      .replace(/[{}]/g, '')
      .trim()
    return textLinesToSemanticHtml(fullText.split('\n'))
  }

  // HTML 伪装 - 检测字符编码后再解码，避免非 UTF-8 编码的中文乱码
  const lower = header.toLowerCase()
  if (lower.includes('<html') || lower.includes('<!doctype') || lower.includes('<meta')) {
    const utf8Text = new TextDecoder('utf-8').decode(bytes)
    // 从 meta 标签中检测字符集
    const charsetMatch = utf8Text.match(/<meta[^>]*charset=["']?([^"'\s;>]+)/i)
    if (charsetMatch) {
      const charset = charsetMatch[1].toLowerCase()
      if (charset !== 'utf-8' && charset !== 'utf8') {
        try {
          return new TextDecoder(charset).decode(bytes)
        } catch {
          // 不支持的编码，回退到 UTF-8
        }
      }
    }
    // 如果 UTF-8 解码出现替换字符，尝试 GBK
    if (utf8Text.includes('\uFFFD')) {
      try {
        const gbkText = new TextDecoder('gbk').decode(bytes)
        if (!gbkText.includes('\uFFFD')) return gbkText
      } catch { /* 忽略 */ }
    }
    return utf8Text
  }

  return '<p>无法预览此文档格式</p>'
}

function txtToHtml(arrayBuffer) {
  const bytes = new Uint8Array(arrayBuffer)
  let text = new TextDecoder('utf-8').decode(bytes)
  if (text.includes('\uFFFD')) {
    try {
      const gbkText = new TextDecoder('gbk').decode(bytes)
      if (!gbkText.includes('\uFFFD')) text = gbkText
    } catch { /* ignore */ }
  }
  const lines = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n')
  return textLinesToSemanticHtml(lines)
}

export { parseFile, parseExcel, generateTemplateBuffer, docxToHtml, docToHtml, txtToHtml, extractInfo }
