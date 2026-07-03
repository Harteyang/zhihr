export interface Book {
  id: number
  title: string
  author: string | null
  isbn: string | null
  douban_rate: number | null
  description: string | null
  cover_url: string | null
  baidu_pan_url: string | null
  baidu_pan_code: string | null
  mlook_book_id: number | null
  mlook_link: string | null
  status: string
  created_at: string
  updated_at: string
}

export interface KnowledgePoint {
  id: number
  book_id: number
  chapter: string
  level: number
  title: string
  content: string | null
  parent_id: number
  sort_order: number
  created_at: string
}

export interface Submission {
  id: number
  title: string
  type: string
  search_query: string
  status: string
  mlook_found: boolean
  mlook_link: string | null
  error_message: string | null
  created_at: string
  updated_at: string
}

// 按书名搜索书籍及其知识点
export async function searchBookByTitle(db: D1Database, query: string) {
  const books = await db
    .prepare(
      `SELECT * FROM miaodu_books WHERE title LIKE ? ORDER BY created_at DESC`
    )
    .all(`%${query}%`)

  if (!books.results.length) return []

  const result = []
  for (const book of books.results) {
    const kps = await db
      .prepare(
        `SELECT * FROM miaodu_knowledge_points WHERE book_id = ? ORDER BY sort_order`
      )
      .all(book.id)
    result.push({ ...book, knowledge_points: kps.results })
  }

  return result
}

// 按知识点关键词搜索
export async function searchKnowledgeByKeyword(db: D1Database, keyword: string) {
  const kps = await db
    .prepare(
      `SELECT * FROM miaodu_knowledge_points WHERE title LIKE ? OR content LIKE ? ORDER BY book_id, sort_order`
    )
    .all(`%${keyword}%`, `%${keyword}%`)

  return kps.results as KnowledgePoint[]
}

// 创建提交记录
export async function createSubmission(
  db: D1Database,
  data: { title: string; type: string; searchQuery: string; mlookLink?: string }
) {
  const result = await db
    .prepare(
      `INSERT INTO miaodu_submissions (title, type, search_query, status, mlook_link) VALUES (?, ?, ?, 'queued', ?) RETURNING id`
    )
    .bind(data.title, data.type, data.searchQuery, data.mlookLink || null)
    .first()

  return result
}

// 更新提交状态
export async function updateSubmissionStatus(
  db: D1Database,
  id: number,
  status: string,
  errorMessage?: string
) {
  await db
    .prepare(
      `UPDATE miaodu_submissions SET status = ?, error_message = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`
    )
    .bind(status, errorMessage || null, id)
    .run()
}

// 查询提交状态
export async function getSubmissionById(db: D1Database, id: number) {
  return db.prepare(`SELECT * FROM miaodu_submissions WHERE id = ?`).bind(id).first()
}

// 获取所有提交记录
export async function getAllSubmissions(db: D1Database) {
  const result = await db
    .prepare(`SELECT * FROM miaodu_submissions ORDER BY created_at DESC`)
    .all()
  return result.results
}

// 手动录入书籍和知识点
export async function addBookWithKnowledge(
  db: D1Database,
  data: {
    title: string
    author?: string
    isbn?: string
    douban_rate?: number
    description?: string
    cover_url?: string
    baidu_pan_url?: string
    baidu_pan_code?: string
    mlook_link?: string
    knowledge_points?: Array<{
      chapter: string
      level: number
      title: string
      content?: string
    }>
  }
) {
  const bookResult = await db
    .prepare(
      `INSERT INTO miaodu_books (title, author, isbn, douban_rate, description, cover_url, baidu_pan_url, baidu_pan_code, mlook_link, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'completed') RETURNING id`
    )
    .bind(
      data.title,
      data.author || null,
      data.isbn || null,
      data.douban_rate || null,
      data.description || null,
      data.cover_url || null,
      data.baidu_pan_url || null,
      data.baidu_pan_code || null,
      data.mlook_link || null
    )
    .first()

  const bookId = (bookResult as any).id

  if (data.knowledge_points?.length) {
    const stmt = db.prepare(
      `INSERT INTO miaodu_knowledge_points (book_id, chapter, level, title, content, sort_order) VALUES (?, ?, ?, ?, ?, ?)`
    )
    for (let i = 0; i < data.knowledge_points.length; i++) {
      const kp = data.knowledge_points[i]
      await stmt.bind(bookId, kp.chapter, kp.level, kp.title, kp.content || null, i).run()
    }
  }

  return bookId
}
