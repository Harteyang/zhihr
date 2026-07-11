import { read, utils, write } from 'xlsx'
import { unzipSync } from 'fflate'

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
