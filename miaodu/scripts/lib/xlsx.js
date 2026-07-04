/**
 * Excel 读写模块（基于 SheetJS / xlsx）
 *
 * Excel 格式规范：
 *   Sheet 1 "books":
 *     title, author, isbn, douban_rate, baidu_pan_url, baidu_pan_code, mlook_link
 *   Sheet 2 "knowledge_points":
 *     book_title, chapter, level, title, content, sort_order
 */
import XLSX from 'xlsx'
import { writeFileSync, readFileSync, existsSync } from 'fs'

/**
 * 写 Excel 文件
 */
export function writeXlsx(filePath, books, knowledgePoints) {
  const wb = XLSX.utils.book_new()

  // Sheet 1: books
  const bookHeaders = ['title', 'author', 'isbn', 'douban_rate', 'baidu_pan_url', 'baidu_pan_code', 'mlook_link']
  const bookRows = books.map((b) => {
    const row = {}
    for (const key of bookHeaders) {
      row[key] = b[key] ?? ''
    }
    return row
  })
  const ws1 = XLSX.utils.json_to_sheet(bookRows, { header: bookHeaders })

  // Sheet 2: knowledge_points
  const kpHeaders = ['book_title', 'chapter', 'level', 'title', 'content', 'sort_order']
  const kpRows = knowledgePoints.map((kp) => {
    const row = {}
    for (const key of kpHeaders) {
      row[key] = kp[key] ?? ''
    }
    return row
  })
  const ws2 = XLSX.utils.json_to_sheet(kpRows, { header: kpHeaders })

  XLSX.utils.book_append_sheet(wb, ws1, 'books')
  XLSX.utils.book_append_sheet(wb, ws2, 'knowledge_points')
  XLSX.writeFile(wb, filePath)
}

/**
 * 读 Excel 文件
 */
export function readXlsx(filePath) {
  if (!existsSync(filePath)) {
    throw new Error(`文件不存在: ${filePath}`)
  }

  const data = readFileSync(filePath)
  const wb = XLSX.read(data, { type: 'buffer' })

  // 读 books sheet（不传 header 则自动用第一行作列名）
  const ws1 = wb.Sheets['books']
  let books = []
  if (ws1) {
    books = XLSX.utils.sheet_to_json(ws1)
  }

  // 读 knowledge_points sheet
  const ws2 = wb.Sheets['knowledge_points']
  let knowledgePoints = []
  if (ws2) {
    knowledgePoints = XLSX.utils.sheet_to_json(ws2)
  }

  return { books, knowledgePoints }
}